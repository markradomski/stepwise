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

// Provisional: no live evaluation has been run yet, so there is no evidence for a hybrid policy.
// Routing by target type belongs here once results exist (see docs/EXPLANATION_EVALUATION.md).
export const llmFirstPolicy: RoutingPolicy = { id: 'llm-first', label: 'LLM preferred', prefer: all('llm') };
export const deterministicPolicy: RoutingPolicy = { id: 'deterministic', label: 'Deterministic preferred', prefer: all('deterministic') };

export const activeRoutingPolicy: RoutingPolicy = llmFirstPolicy;

export function routeFor(request: ExplanationRequest, policy: RoutingPolicy = activeRoutingPolicy) {
  const preference = policy.prefer[request.targetKind];
  return { preference, label: preference === 'llm' ? policy.label : deterministicPolicy.label };
}
