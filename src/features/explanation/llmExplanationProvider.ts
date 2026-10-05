import type { ExplanationProvider, ExplanationProviderOutcome, ExplanationRequest } from './explanationTypes';

type Options = { endpoint?: string; timeoutMs?: number; fetchImpl?: typeof fetch };

const DEFAULT_TIMEOUT_MS = 10000;

// Only these fields ever leave the browser, whatever object is passed in.
const pick = (request: ExplanationRequest): ExplanationRequest => ({
  version: request.version,
  questionId: request.questionId,
  targetKind: request.targetKind,
  currentExpression: request.currentExpression,
  ...(request.learnerExpression !== undefined && { learnerExpression: request.learnerExpression }),
  ...(request.canonicalExpression !== undefined && { canonicalExpression: request.canonicalExpression }),
  ...(request.misconceptionId !== undefined && { misconceptionId: request.misconceptionId }),
  ...(request.deterministicLabel !== undefined && { deterministicLabel: request.deterministicLabel }),
  ...(request.deterministicContent !== undefined && { deterministicContent: request.deterministicContent }),
});

// Calls the Stepwise proxy, which builds the model prompt itself. Returns untrusted output; it never
// touches application state and never retries.
export function createLlmExplanationProvider({
  endpoint = '/api/explain',
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl,
}: Options = {}): ExplanationProvider {
  return {
    id: 'llm',
    label: 'LLM',
    supports: () => true,
    async explain(request): Promise<ExplanationProviderOutcome> {
      const doFetch = fetchImpl ?? fetch;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await doFetch(endpoint, {
          method: 'POST',
          signal: controller.signal,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(pick(request)),
        });
        let envelope: { status?: unknown; reason?: unknown; value?: unknown; promptVersion?: unknown; requestId?: unknown };
        try {
          envelope = await response.json();
        } catch {
          return { status: 'failed', reason: 'invalid-output' };
        }
        if (!response.ok) {
          if (envelope?.reason === 'timeout') return { status: 'failed', reason: 'timeout' };
          return { status: 'failed', reason: envelope?.reason === 'invalid-output' ? 'invalid-output' : 'network' };
        }
        if (envelope?.status !== 'ok' || envelope.value === undefined) return { status: 'failed', reason: 'invalid-output' };
        return {
          status: 'ok',
          value: envelope.value,
          meta: {
            promptVersion: typeof envelope.promptVersion === 'string' ? envelope.promptVersion : undefined,
            requestId: typeof envelope.requestId === 'string' ? envelope.requestId : undefined,
          },
        };
      } catch (error) {
        const aborted = error instanceof Error && error.name === 'AbortError';
        return { status: 'failed', reason: aborted ? 'timeout' : 'network' };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
