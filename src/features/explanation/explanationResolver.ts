import type {
  ExplanationProvider,
  ExplanationRequest,
  ExplanationResult,
  ProviderFailure,
  ProviderMeta,
} from './explanationTypes';
import { validateExplanationResult } from './validateExplanation';

export type ExplanationOutcome = 'success' | 'deterministic-only' | 'fallback' | 'unavailable';
export type ResolutionReason = ProviderFailure | 'unavailable' | 'error';

// Diagnostics about how an explanation was produced. Kept apart from the display text on purpose.
export type ResolutionMeta = {
  attempted: string;
  used: string | null;
  outcome: ExplanationOutcome;
  reason?: ResolutionReason;
  latencyMs: number;
  routing?: string;
} & ProviderMeta;

export type ExplanationResolution =
  | { status: 'ready'; result: ExplanationResult; meta: ResolutionMeta }
  | { status: 'unavailable'; meta: ResolutionMeta };

export type ExplanationService = {
  label: string;
  supports(request: ExplanationRequest): boolean;
  resolve(request: ExplanationRequest): Promise<ExplanationResolution>;
};

type Attempt = { result: ExplanationResult; meta: ProviderMeta } | { failure: ResolutionReason };

// One attempt per provider. Whatever a provider returns is untrusted until validateExplanationResult passes.
async function attempt(provider: ExplanationProvider, request: ExplanationRequest): Promise<Attempt> {
  try {
    const outcome = await provider.explain(request);
    if (outcome.status === 'unavailable') return { failure: 'unavailable' };
    if (outcome.status === 'failed') return { failure: outcome.reason };
    const checked = validateExplanationResult(outcome.value);
    return checked.ok ? { result: checked.value, meta: outcome.meta ?? {} } : { failure: 'invalid-output' };
  } catch {
    return { failure: 'error' };
  }
}

export async function resolveExplanation(
  request: ExplanationRequest,
  primary: ExplanationProvider,
  fallback?: ExplanationProvider,
  now: () => number = () => performance.now(),
): Promise<ExplanationResolution> {
  const started = now();
  const latency = () => Math.round(now() - started);
  const first = await attempt(primary, request);

  if ('result' in first) {
    const outcome = primary.id === 'deterministic' ? 'deterministic-only' : 'success';
    return {
      status: 'ready',
      result: first.result,
      meta: { attempted: primary.id, used: primary.id, outcome, latencyMs: latency(), ...first.meta },
    };
  }

  const second = fallback && fallback.id !== primary.id ? await attempt(fallback, request) : undefined;
  if (second && 'result' in second) {
    return {
      status: 'ready',
      result: second.result,
      meta: { attempted: primary.id, used: fallback!.id, outcome: 'fallback', reason: first.failure, latencyMs: latency() },
    };
  }
  return {
    status: 'unavailable',
    meta: { attempted: primary.id, used: null, outcome: 'unavailable', reason: first.failure, latencyMs: latency() },
  };
}

export function createExplanationService(options: {
  primary: ExplanationProvider;
  fallback?: ExplanationProvider;
  now?: () => number;
}): ExplanationService {
  const { primary, fallback, now } = options;
  return {
    label: primary.label,
    supports: (request) => primary.supports(request),
    resolve: (request) => resolveExplanation(request, primary, fallback, now),
  };
}
