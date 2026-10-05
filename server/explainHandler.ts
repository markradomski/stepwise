import { buildExplanationPromptV1, PROMPT_VERSION } from '../src/features/explanation/prompts/explanationPromptV1';
import { validateExplanationRequest } from '../src/features/explanation/validateRequest';
import { validateExplanationResult } from '../src/features/explanation/validateExplanation';
import { callLlm, LlmError } from './llmClient';

export type ExplainEnv = {
  EXPLANATION_PROVIDER?: string;
  LLM_API_KEY?: string;
  LLM_MODEL?: string;
  LLM_BASE_URL?: string;
  LLM_TIMEOUT_MS?: string;
};

export type HandlerResponse = { status: number; body: Record<string, unknown> };

export const MAX_BODY_BYTES = 4096;
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const DEFAULT_BASE_URL = 'https://api.anthropic.com';
const DEFAULT_TIMEOUT_MS = 8000;

const fail = (status: number, reason: string): HandlerResponse => ({ status, body: { status: 'error', reason } });

// The provider is chosen by server configuration alone, and only when a key is present.
export const isLlmConfigured = (env: ExplainEnv) => env.EXPLANATION_PROVIDER === 'llm' && Boolean(env.LLM_API_KEY);

export function handleConfigRequest(env: ExplainEnv): HandlerResponse {
  return { status: 200, body: { provider: isLlmConfigured(env) ? 'llm' : 'deterministic' } };
}

type ExplainCall = { method: string; bodyText: string; env: ExplainEnv; fetchImpl?: typeof fetch };

// The browser sends a structured ExplanationRequest and nothing else. The prompt is built here, so this
// endpoint cannot be used as a general model relay.
export async function handleExplainRequest({ method, bodyText, env, fetchImpl = fetch }: ExplainCall): Promise<HandlerResponse> {
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

  const requestId = crypto.randomUUID();
  try {
    const raw = await callLlm({
      prompt: buildExplanationPromptV1(request.value),
      apiKey: env.LLM_API_KEY as string,
      model: env.LLM_MODEL || DEFAULT_MODEL,
      baseUrl: env.LLM_BASE_URL || DEFAULT_BASE_URL,
      timeoutMs: Number(env.LLM_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS,
      fetchImpl,
    });
    const checked = validateExplanationResult(raw);
    if (!checked.ok) return fail(502, 'invalid-output');
    return { status: 200, body: { status: 'ok', promptVersion: PROMPT_VERSION, requestId, value: checked.value } };
  } catch (error) {
    if (error instanceof LlmError) return error.kind === 'timeout' ? fail(504, 'timeout') : fail(502, error.kind);
    return fail(502, 'network');
  }
}
