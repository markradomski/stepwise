import { buildExplanationRequest } from './buildExplanationRequest';
import { activeRoutingPolicy, deterministicPolicy, hybridPolicy, llmFirstPolicy, routeFor } from './explanationRoutingPolicy';
import { createDefaultExplanationService } from './defaultExplanationService';
import { corpus } from './evaluation/corpus';
import { practiceQuestions } from '../practice/questions';
import type { ExplanationTargetKind } from './explanationTypes';

const accepted = (learner: string) =>
  buildExplanationRequest(
    { kind: 'accepted-step', questionId: 'linear-two-step', previousExpression: '2x + 5 = 17', submittedExpression: learner, canonicalExpression: '2x = 12' },
    practiceQuestions[1],
  );

describe('explanation routing policy (evidence-based hybrid)', () => {
  it('is the hybrid policy chosen from the reviewed evaluation', () => {
    expect(activeRoutingPolicy).toBe(hybridPolicy);
    expect(hybridPolicy.id).toBe('hybrid-by-target');
  });

  it.each<[ExplanationTargetKind, 'llm' | 'deterministic']>([
    ['suggested-step', 'llm'],
    ['misconception', 'deterministic'],
    ['hint', 'deterministic'],
    ['example', 'deterministic'],
    ['accepted-step', 'deterministic'],
  ])('routes %s to %s', (kind, expected) => {
    const request = { ...corpus[0].request, targetKind: kind };
    expect(routeFor(request)).toMatchObject({
      preference: expected,
      label: expected === 'llm' ? 'LLM preferred' : 'Deterministic preferred',
    });
  });

  it('keeps an equivalent accepted step deterministic, like any accepted step', () => {
    expect(routeFor(accepted('2x = 17 - 5')).preference).toBe('deterministic');
    expect(routeFor(accepted('2x = 12')).preference).toBe('deterministic');
  });

  it('routes every corpus case according to its target kind', () => {
    for (const testCase of corpus) {
      expect(routeFor(testCase.request).preference).toBe(testCase.request.targetKind === 'suggested-step' ? 'llm' : 'deterministic');
    }
  });

  it('other policies stay available and decide per target kind from an explicit table', () => {
    for (const testCase of corpus) {
      expect(routeFor(testCase.request, llmFirstPolicy).preference).toBe('llm');
      expect(routeFor(testCase.request, deterministicPolicy).preference).toBe('deterministic');
    }
  });
});

describe('default explanation service follows the routing policy', () => {
  const llmEnvelope = { status: 'ok', promptVersion: 'explanation-prompt/1', cache: 'miss', value: { version: 'explanation-output/1', title: 'Model title', body: 'Model body.' } };
  const config = (provider: string) => ({ ok: true, json: async () => ({ provider }) });
  const service = (modelCalls: { count: number }, modelOk = true) =>
    createDefaultExplanationService((async (url: string) => {
      if (String(url).endsWith('/config')) return config('llm') as Response;
      modelCalls.count += 1;
      return (modelOk ? new Response(JSON.stringify(llmEnvelope)) : new Response('{}', { status: 502 })) as Response;
    }) as unknown as typeof fetch);

  const suggested = buildExplanationRequest(
    { kind: 'suggested-step', questionId: 'linear-3-bracket', fromExpression: '3(x + 2) = 18', suggestedExpression: 'x + 2 = 6' },
    practiceQuestions[0],
  );

  it('uses the model first for a suggested step', async () => {
    const calls = { count: 0 };
    const resolution = await service(calls).resolve(suggested);
    expect(calls.count).toBe(1);
    expect(resolution).toMatchObject({ status: 'ready', result: { title: 'Model title' }, meta: { routing: 'LLM preferred', used: 'llm' } });
  });

  it('falls back to the deterministic explanation when the model fails on an LLM-preferred target', async () => {
    const calls = { count: 0 };
    const resolution = await service(calls, false).resolve(suggested);
    expect(resolution).toMatchObject({ status: 'ready', meta: { attempted: 'llm', used: 'deterministic', outcome: 'fallback' } });
  });

  it('goes straight to the deterministic provider, with no model call, for other targets', async () => {
    const calls = { count: 0 };
    for (const request of [accepted('2x = 17 - 5'), corpus[0].request]) {
      const resolution = await service(calls).resolve(request);
      expect(resolution).toMatchObject({ status: 'ready', meta: { attempted: 'deterministic', used: 'deterministic', outcome: 'deterministic-only', routing: 'Deterministic preferred' } });
    }
    expect(calls.count).toBe(0);
  });
});
