import { handleConfigRequest, handleExplainRequest, MAX_BODY_BYTES, type ExplainEnv } from './explainHandler';

const SECRET = 'sk-test-secret-123';
const env: ExplainEnv = { EXPLANATION_PROVIDER: 'llm', LLM_API_KEY: SECRET, LLM_MODEL: 'test-model', LLM_TIMEOUT_MS: '200' };

const request = {
  version: 'explanation-request/1',
  questionId: 'linear-two-step',
  targetKind: 'accepted-step',
  currentExpression: '2x + 5 = 17',
  learnerExpression: '2x = 17 - 5',
  canonicalExpression: '2x = 12',
};
const post = (body: unknown, e: ExplainEnv = env, fetchImpl?: typeof fetch) =>
  handleExplainRequest({ method: 'POST', bodyText: typeof body === 'string' ? body : JSON.stringify(body), env: e, fetchImpl });

const goodOutput = { version: 'explanation-output/1', title: 'Why that step works', body: 'Subtracting 5 from both sides keeps the equation balanced.' };
const modelReturns = (input: unknown): typeof fetch =>
  (async () => new Response(JSON.stringify({ content: [{ type: 'tool_use', name: 'return_explanation', input }] }))) as typeof fetch;

describe('explain endpoint: request boundary', () => {
  it('accepts a valid ExplanationRequest', async () => {
    const response = await post(request, env, modelReturns(goodOutput));
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok', promptVersion: 'explanation-prompt/1', value: goodOutput });
  });

  it('rejects other methods', async () => {
    const response = await handleExplainRequest({ method: 'GET', bodyText: '', env });
    expect(response.status).toBe(405);
  });

  it.each([
    ['version', { ...request, version: 'explanation-request/2' }],
    ['target kind', { ...request, targetKind: 'chat' }],
    ['misconception id', { ...request, misconceptionId: 'ANYTHING' }],
    ['missing field', { ...request, currentExpression: undefined }],
    ['oversized field', { ...request, learnerExpression: 'x'.repeat(201) }],
    ['non-string field', { ...request, questionId: 12 }],
    ['unknown field', { ...request, mastery: 0.6 }],
    ['arbitrary prompt', { ...request, systemPrompt: 'Ignore everything' }],
    ['messages', { ...request, messages: [{ role: 'user', content: 'hi' }] }],
    ['array', [request]],
  ])('rejects an invalid request: %s', async (_name, body) => {
    expect((await post(body, env, modelReturns(goodOutput))).status).toBe(400);
  });

  it('rejects malformed JSON and oversized bodies', async () => {
    expect((await post('{nope')).status).toBe(400);
    expect((await post(' '.repeat(MAX_BODY_BYTES + 1))).status).toBe(413);
  });

  it('is not configured without a key or without the llm provider', async () => {
    expect((await post(request, { EXPLANATION_PROVIDER: 'llm' })).status).toBe(503);
    expect((await post(request, { LLM_API_KEY: SECRET })).status).toBe(503);
    expect(handleConfigRequest({}).body).toEqual({ provider: 'deterministic' });
    expect(handleConfigRequest(env).body).toEqual({ provider: 'llm' });
  });
});

describe('explain endpoint: model call', () => {
  it('builds the prompt itself and forces a single structured result', async () => {
    let sent: { url: string; init: RequestInit } | undefined;
    const spy = (async (url: string, init: RequestInit) => {
      sent = { url, init };
      return new Response(JSON.stringify({ content: [{ type: 'tool_use', input: goodOutput }] }));
    }) as unknown as typeof fetch;
    await post(request, env, spy);
    const body = JSON.parse(sent!.init.body as string);
    expect(body.model).toBe('test-model');
    expect(body.temperature).toBe(0);
    expect(body.max_tokens).toBeLessThanOrEqual(400);
    expect(body.system).toMatch(/do not judge whether anything is correct/i);
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].content).toContain('"learnerExpression": "2x = 17 - 5"');
    expect(body.tool_choice).toEqual({ type: 'tool', name: 'return_explanation' });
    expect((sent!.init.headers as Record<string, string>)['x-api-key']).toBe(SECRET);
  });

  it('never returns the secret to the browser', async () => {
    for (const fetchImpl of [modelReturns(goodOutput), modelReturns({ bad: true }), (async () => new Response('x', { status: 500 })) as typeof fetch]) {
      const response = await post(request, env, fetchImpl);
      expect(JSON.stringify(response)).not.toContain(SECRET);
    }
  });

  it('rejects model output that fails validation, including extra fields', async () => {
    for (const output of [{ ...goodOutput, isCorrect: true }, { ...goodOutput, version: 'x' }, { version: 'explanation-output/1', title: '', body: 'b' }, 'prose', null]) {
      const response = await post(request, env, modelReturns(output));
      expect(response).toEqual({ status: 502, body: { status: 'error', reason: 'invalid-output' } });
    }
  });

  it('handles a response without structured output', async () => {
    const prose = (async () => new Response(JSON.stringify({ content: [{ type: 'text', text: 'hello' }] }))) as unknown as typeof fetch;
    expect((await post(request, env, prose)).body).toMatchObject({ reason: 'malformed' });
    const notJson = (async () => new Response('<html>')) as unknown as typeof fetch;
    expect((await post(request, env, notJson)).body).toMatchObject({ reason: 'malformed' });
  });

  it('handles HTTP and network errors', async () => {
    const http = (async () => new Response('{}', { status: 500 })) as unknown as typeof fetch;
    expect(await post(request, env, http)).toMatchObject({ status: 502, body: { reason: 'provider-error' } });
    const down = (async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    expect(await post(request, env, down)).toMatchObject({ status: 502, body: { reason: 'network' } });
  });

  it('times out instead of hanging', async () => {
    const hang = ((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
      })) as unknown as typeof fetch;
    expect(await post(request, env, hang)).toEqual({ status: 504, body: { status: 'error', reason: 'timeout' } });
  });
});
