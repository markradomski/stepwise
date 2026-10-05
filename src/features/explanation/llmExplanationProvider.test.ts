import { createLlmExplanationProvider } from './llmExplanationProvider';
import { createExplanationService, resolveExplanation } from './explanationResolver';
import { deterministicExplanationProvider } from './deterministicExplanationProvider';
import { buildExplanationRequest } from './buildExplanationRequest';
import { practiceQuestions } from '../practice/questions';
import type { ExplanationProvider, ExplanationRequest } from './explanationTypes';

const request: ExplanationRequest = buildExplanationRequest(
  { kind: 'accepted-step', questionId: 'linear-two-step', previousExpression: '2x + 5 = 17', submittedExpression: '2x = 12', canonicalExpression: '2x = 12' },
  practiceQuestions[1],
);
const good = { version: 'explanation-output/1', title: 'LLM title', body: 'LLM body about balancing both sides.' };
const json = (body: unknown, status = 200) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
const ok = (value: unknown = good) => json({ status: 'ok', promptVersion: 'explanation-prompt/1', requestId: 'abc', value });

describe('llm explanation provider (client)', () => {
  it('sends only the explanation request fields, as JSON, to the proxy', async () => {
    let sent: { url: string; body: Record<string, unknown> } | undefined;
    const spy = (async (url: string, init: RequestInit) => {
      sent = { url, body: JSON.parse(init.body as string) };
      return new Response(JSON.stringify({ status: 'ok', value: good }));
    }) as unknown as typeof fetch;
    const polluted = { ...request, masteryEstimate: 0.9, session: { hints: 3 }, systemPrompt: 'x' } as unknown as ExplanationRequest;
    await createLlmExplanationProvider({ fetchImpl: spy }).explain(polluted);
    expect(sent!.url).toBe('/api/explain');
    expect(sent!.body).toEqual(request);
    expect(JSON.stringify(sent!.body)).not.toMatch(/mastery|session|systemPrompt/);
  });

  it('returns untrusted output with the prompt version on success', async () => {
    const outcome = await createLlmExplanationProvider({ fetchImpl: ok() }).explain(request);
    expect(outcome).toEqual({ status: 'ok', value: good, meta: { promptVersion: 'explanation-prompt/1', requestId: 'abc' } });
  });

  it.each([
    ['malformed JSON', (async () => new Response('not json')) as unknown as typeof fetch, 'invalid-output'],
    ['prose instead of an envelope', json('just prose'), 'invalid-output'],
    ['an empty response', json({}), 'invalid-output'],
    ['an HTTP error', json({ status: 'error', reason: 'upstream' }, 502), 'network'],
    ['a rejected request', json({ status: 'error', reason: 'invalid-request' }, 400), 'network'],
    ['a server timeout', json({ status: 'error', reason: 'timeout' }, 504), 'timeout'],
    ['invalid server output', json({ status: 'error', reason: 'invalid-output' }, 502), 'invalid-output'],
    [
      'a network error',
      (async () => {
        throw new TypeError('offline');
      }) as unknown as typeof fetch,
      'network',
    ],
  ])('fails safely on %s', async (_name, fetchImpl, reason) => {
    expect(await createLlmExplanationProvider({ fetchImpl }).explain(request)).toEqual({ status: 'failed', reason });
  });

  it('times out on its own', async () => {
    const hang = ((_url: string, init: RequestInit) =>
      new Promise((_r, reject) => init.signal?.addEventListener('abort', () => reject(Object.assign(new Error('x'), { name: 'AbortError' }))))) as unknown as typeof fetch;
    expect(await createLlmExplanationProvider({ fetchImpl: hang, timeoutMs: 20 }).explain(request)).toEqual({ status: 'failed', reason: 'timeout' });
  });
});

describe('explanation resolution and fallback', () => {
  const llm = (fetchImpl: typeof fetch) => createLlmExplanationProvider({ fetchImpl });
  const failing = json({ status: 'error', reason: 'upstream' }, 502);

  it('uses the model result when it is valid', async () => {
    const resolution = await resolveExplanation(request, llm(ok()), deterministicExplanationProvider);
    expect(resolution).toMatchObject({ status: 'ready', result: { title: 'LLM title' }, meta: { attempted: 'llm', used: 'llm', outcome: 'success', promptVersion: 'explanation-prompt/1' } });
  });

  it.each([
    ['a timeout', json({ status: 'error', reason: 'timeout' }, 504), 'timeout'],
    ['a network error', failing, 'network'],
    ['invalid output (extra field)', ok({ ...good, isCorrect: true }), 'invalid-output'],
    ['invalid output (wrong version)', ok({ ...good, version: 'v2' }), 'invalid-output'],
    ['malformed output', json('prose'), 'invalid-output'],
  ])('falls back to the deterministic provider after %s', async (_name, fetchImpl, reason) => {
    const resolution = await resolveExplanation(request, llm(fetchImpl), deterministicExplanationProvider);
    expect(resolution).toMatchObject({ status: 'ready', meta: { attempted: 'llm', used: 'deterministic', outcome: 'fallback', reason } });
    expect(resolution.status === 'ready' && resolution.result.body).toContain('Subtracting 5 from both sides');
  });

  it('is unavailable when the model fails and the deterministic provider has no mapping', async () => {
    const unmapped = { ...request, currentExpression: '2x = 12', canonicalExpression: '2x = 99' };
    const resolution = await resolveExplanation(unmapped, llm(failing), deterministicExplanationProvider);
    expect(resolution).toMatchObject({ status: 'unavailable', meta: { attempted: 'llm', used: null, outcome: 'unavailable', reason: 'network' } });
  });

  it('reports a deterministic-only outcome without a model', async () => {
    expect(await resolveExplanation(request, deterministicExplanationProvider)).toMatchObject({
      status: 'ready',
      meta: { attempted: 'deterministic', used: 'deterministic', outcome: 'deterministic-only' },
    });
  });

  it('makes one attempt per provider, never retrying', async () => {
    let calls = 0;
    const counting = (async () => {
      calls += 1;
      return new Response('{}', { status: 502 });
    }) as unknown as typeof fetch;
    await resolveExplanation(request, llm(counting), deterministicExplanationProvider);
    expect(calls).toBe(1);
  });

  it('treats a throwing provider as unavailable', async () => {
    const throwing: ExplanationProvider = { id: 'x', label: 'X', supports: () => true, explain: async () => { throw new Error('boom'); } };
    const service = createExplanationService({ primary: throwing });
    expect(await service.resolve(request)).toMatchObject({ status: 'unavailable', meta: { reason: 'error' } });
  });
});
