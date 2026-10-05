import { buildExplanationRequest } from './buildExplanationRequest';
import { activeRoutingPolicy, deterministicPolicy, llmFirstPolicy, routeFor } from './explanationRoutingPolicy';
import { practiceQuestions } from '../practice/questions';
import { corpus } from './evaluation/corpus';

describe('explanation routing policy', () => {
  it('is provisionally LLM-first until live evaluation provides evidence for anything else', () => {
    expect(activeRoutingPolicy).toBe(llmFirstPolicy);
    for (const testCase of corpus) expect(routeFor(testCase.request)).toMatchObject({ preference: 'llm', label: 'LLM preferred' });
  });

  it('can route every target kind to the deterministic provider', () => {
    for (const testCase of corpus) expect(routeFor(testCase.request, deterministicPolicy)).toMatchObject({ preference: 'deterministic', label: 'Deterministic preferred' });
  });

  it('decides per target kind from an explicit table, not from scattered conditions', () => {
    const hybrid = { ...llmFirstPolicy, id: 'test', prefer: { ...llmFirstPolicy.prefer, 'accepted-step': 'deterministic' as const } };
    const accepted = buildExplanationRequest(
      { kind: 'accepted-step', questionId: 'linear-two-step', previousExpression: '2x + 5 = 17', submittedExpression: '2x = 12', canonicalExpression: '2x = 12' },
      practiceQuestions[1],
    );
    expect(routeFor(accepted, hybrid).preference).toBe('deterministic');
    expect(routeFor({ ...accepted, targetKind: 'suggested-step' }, hybrid).preference).toBe('llm');
  });
});
