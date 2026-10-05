import type { ExplanationRequest, ExplanationTargetKind } from './explanationTypes';

export type RoutePreference = 'llm' | 'deterministic';

export type RoutingPolicy = {
  id: string;
  label: string;
  // Per target kind, which provider is tried first. The deterministic provider is always the fallback.
  prefer: Record<ExplanationTargetKind, RoutePreference>;
};

const all = (preference: RoutePreference): RoutingPolicy['prefer'] => ({
  misconception: preference,
  hint: preference,
  example: preference,
  'suggested-step': preference,
  'accepted-step': preference,
});

export const llmFirstPolicy: RoutingPolicy = { id: 'llm-first', label: 'LLM preferred', prefer: all('llm') };
export const deterministicPolicy: RoutingPolicy = { id: 'deterministic', label: 'Deterministic preferred', prefer: all('deterministic') };

// Chosen from the reviewed live evaluation of explanation-prompt/1 (docs/EXPLANATION_EVALUATION.md):
// - suggested-step: the model was better in 2/2 reviewed cases (it explains why the step is taken).
// - misconception, accepted-step (including equivalent learner forms): same or worse in every reviewed case,
//   with sign errors, ignored learner expressions and generic text, so deterministic copy is preferred.
// - hint, example: not in the corpus, so no evidence for the model; deterministic.
// The deterministic provider remains the fallback for every model route.
export const hybridPolicy: RoutingPolicy = {
  id: 'hybrid-by-target',
  label: 'LLM preferred',
  prefer: { ...all('deterministic'), 'suggested-step': 'llm' },
};

export const activeRoutingPolicy: RoutingPolicy = hybridPolicy;

export function routeFor(request: ExplanationRequest, policy: RoutingPolicy = activeRoutingPolicy) {
  const preference = policy.prefer[request.targetKind];
  return { preference, label: preference === 'llm' ? 'LLM preferred' : 'Deterministic preferred' };
}
