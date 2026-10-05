import { ACTIVE_PROMPT_VERSION, promptBuilders } from '../src/features/explanation/prompts/promptRegistry';
import type { ExplanationResult } from '../src/features/explanation/explanationTypes';
import { validateExplanationRequest } from '../src/features/explanation/validateRequest';
import { validateExplanationResult } from '../src/features/explanation/validateExplanation';
import { cacheKey, createExplainCache } from './explainCache';
import { isLlmConfigured, readConfig, type ExplainEnv } from './explainConfig';
import { callLlm, LlmError, type LlmUsage } from './llmClient';
import { createRateLimiter } from './rateLimiter';

export type { ExplainEnv } from './explainConfig';
export { isLlmConfigured } from './explainConfig';

export type HandlerResponse = { status: number; body: Record<string, unknown> };

export const MAX_BODY_BYTES = 4096;

const fail = (status: number, reason: string): HandlerResponse => ({ status, body: { status: 'error', reason } });

type CachedExplanation = { result: ExplanationResult };

export type ExplainCall = {
  method: string;
  bodyText: string;
  // Opaque, anonymous key for rate limiting (for example an IP supplied by the platform). Never stored beyond one window.
  clientKey?: string;
  fetchImpl?: typeof fetch;
};

export type ExplainHandlerOptions = { now?: () => number };

// The one explanation handler. Vite middleware and the serverless adapter both call it, so validation,
// prompt construction, the model call, rate limiting, dedupe and caching exist once.
// State (limiter, cache, in-flight calls) lives in the instance, so each server process has its own.
export function createExplainHandler(env: ExplainEnv, options: ExplainHandlerOptions = {}) {
  const config = readConfig(env);
  const promptVersion = env.EXPLANATION_PROMPT_VERSION || ACTIVE_PROMPT_VERSION;
  const limiter = createRateLimiter({ max: config.rateLimitMax, windowMs: config.rateLimitWindowMs, now: options.now });
  const cache = createExplainCache<CachedExplanation>({ ttlMs: config.cacheTtlMs, maxEntries: config.cacheMaxEntries, now: options.now });
  const inFlight = new Map<string, Promise<HandlerResponse>>();

  const ok = (result: ExplanationResult, requestId: string, cacheState: 'hit' | 'miss', usage?: LlmUsage): HandlerResponse => ({
    status: 200,
    body: { status: 'ok', promptVersion, model: config.model, requestId, cache: cacheState, value: result, ...(usage && { usage }) },
  });

  return {
    config: (): HandlerResponse => ({ status: 200, body: { provider: isLlmConfigured(env) ? 'llm' : 'deterministic' } }),

    async handle({ method, bodyText, clientKey = 'anonymous', fetchImpl = fetch }: ExplainCall): Promise<HandlerResponse> {
      if (method !== 'POST') return fail(405, 'method');
      if (bodyText.length > MAX_BODY_BYTES) return fail(413, 'too-large');

      let parsed: unknown;
      try {
        parsed = JSON.parse(bodyText);
      } catch {
        return fail(400, 'invalid-json');
      }
      const request = validateExplanationRequest(parsed);
      if (!request.ok) return fail(400, 'invalid-request');
      if (!isLlmConfigured(env)) return fail(503, 'not-configured');
      const buildPrompt = promptBuilders[promptVersion];
      if (!buildPrompt) return fail(500, 'invalid-config');

      if (!limiter.allow(clientKey)) return fail(429, 'rate-limited');

      const requestId = crypto.randomUUID();
      const key = cacheKey(promptVersion, config.model, request.value);
      const cached = cache.get(key);
      if (cached) return ok(cached.result, requestId, 'hit');

      // Identical requests already in flight share one model call.
      const pending = inFlight.get(key);
      if (pending) return pending;

      const call = (async (): Promise<HandlerResponse> => {
        try {
          const { output, usage } = await callLlm({
            prompt: buildPrompt(request.value),
            apiKey: env.LLM_API_KEY as string,
            model: config.model,
            baseUrl: config.baseUrl,
            timeoutMs: config.timeoutMs,
            fetchImpl,
          });
          const checked = validateExplanationResult(output);
          if (!checked.ok) return fail(502, 'invalid-output');
          // Only validated successes are cached. Errors and rejected output never are.
          cache.set(key, { result: checked.value });
          return ok(checked.value, requestId, 'miss', usage);
        } catch (error) {
          if (error instanceof LlmError) {
            if (error.kind === 'timeout') return fail(504, 'timeout');
            return fail(502, error.kind === 'provider' ? 'provider-error' : error.kind);
          }
          return fail(502, 'network');
        } finally {
          inFlight.delete(key);
        }
      })();
      inFlight.set(key, call);
      return call;
    },
  };
}

export type ExplainHandler = ReturnType<typeof createExplainHandler>;

// Stateless convenience for one-off calls (evaluation, tests).
export const handleConfigRequest = (env: ExplainEnv) => createExplainHandler(env).config();
export const handleExplainRequest = ({ env, ...call }: ExplainCall & { env: ExplainEnv }) => createExplainHandler(env).handle(call);
