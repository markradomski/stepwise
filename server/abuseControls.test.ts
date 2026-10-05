import { cacheKey, createExplainCache } from './explainCache';
import { createExplainHandler, type ExplainEnv } from './explainHandler';
import { createRateLimiter } from './rateLimiter';
import { createWebAdapter } from './webAdapter';
import type { ExplanationRequest } from '../src/features/explanation/explanationTypes';

const SECRET = 'sk-test-abuse';
const baseEnv: ExplainEnv = { EXPLANATION_PROVIDER: 'llm', LLM_API_KEY: SECRET, LLM_MODEL: 'model-a', LLM_TIMEOUT_MS: '200' };
const request: ExplanationRequest = {
  version: 'explanation-request/1',
  questionId: 'linear-two-step',
  targetKind: 'accepted-step',
  currentExpression: '2x + 5 = 17',
  canonicalExpression: '2x = 12',
};
const other = { ...request, canonicalExpression: 'x = 6', currentExpression: '2x = 12' };
const good = { version: 'explanation-output/1', title: 'Why that step works', body: 'Subtracting 5 from both sides keeps balance.' };

const counting = (output: unknown = good, delay = 0) => {
  const fn = Object.assign(
    (async () => {
      fn.calls += 1;
      if (delay) await new Promise((r) => setTimeout(r, delay));
      return new Response(JSON.stringify({ content: [{ type: 'tool_use', input: output }], usage: { input_tokens: 10, output_tokens: 5 } }));
    }) as unknown as typeof fetch,
    { calls: 0 },
  );
  return fn;
};
const call = (handler: ReturnType<typeof createExplainHandler>, fetchImpl: typeof fetch, body: unknown = request, clientKey = 'client-1') =>
  handler.handle({ method: 'POST', bodyText: JSON.stringify(body), fetchImpl, clientKey });

describe('rate limiter', () => {
  it('permits normal traffic and rejects the excess within a window', () => {
    let now = 0;
    const limiter = createRateLimiter({ max: 3, windowMs: 1000, now: () => now });
    expect([1, 2, 3].map(() => limiter.allow('a'))).toEqual([true, true, true]);
    expect(limiter.allow('a')).toBe(false);
    now = 1000;
    expect(limiter.allow('a')).toBe(true);
  });

  it('isolates clients from each other', () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 1000 });
    expect(limiter.allow('a')).toBe(true);
    expect(limiter.allow('a')).toBe(false);
    expect(limiter.allow('b')).toBe(true);
  });
});

describe('explain handler: rate limiting', () => {
  const env = { ...baseEnv, EXPLANATION_RATE_LIMIT_MAX: '2', EXPLANATION_CACHE_MAX_ENTRIES: '10' };

  it('answers 429 with a small structured body once the limit is exceeded, without calling the model', async () => {
    const handler = createExplainHandler(env);
    const model = counting();
    await call(handler, model);
    await call(handler, model, other);
    const limited = await call(handler, model, { ...request, currentExpression: '2x + 5 = 99' });
    expect(limited).toEqual({ status: 429, body: { status: 'error', reason: 'rate-limited' } });
    expect(model.calls).toBe(2);
  });

  it('limits each client key separately', async () => {
    const handler = createExplainHandler({ ...env, EXPLANATION_RATE_LIMIT_MAX: '1' });
    const model = counting();
    expect((await call(handler, model, request, 'one')).status).toBe(200);
    expect((await call(handler, model, other, 'one')).status).toBe(429);
    expect((await call(handler, model, other, 'two')).status).toBe(200);
  });
});

describe('explain handler: deduplication', () => {
  it('shares one model call between identical concurrent requests', async () => {
    const handler = createExplainHandler(baseEnv);
    const model = counting(good, 20);
    const [a, b, c] = await Promise.all([call(handler, model), call(handler, model), call(handler, model)]);
    expect(model.calls).toBe(1);
    expect([a.status, b.status, c.status]).toEqual([200, 200, 200]);
    expect(b.body.value).toEqual(a.body.value);
  });

  it('does not merge distinct requests', async () => {
    const handler = createExplainHandler(baseEnv);
    const model = counting(good, 20);
    await Promise.all([call(handler, model, request), call(handler, model, other)]);
    expect(model.calls).toBe(2);
  });
});

describe('explain handler: cache', () => {
  it('serves a repeated request from the cache without a second model call', async () => {
    const handler = createExplainHandler(baseEnv);
    const model = counting();
    const first = await call(handler, model);
    const second = await call(handler, model);
    expect(first.body.cache).toBe('miss');
    expect(second.body.cache).toBe('hit');
    expect(second.body.value).toEqual(first.body.value);
    expect(model.calls).toBe(1);
  });

  it('never caches invalid output, timeouts or errors', async () => {
    const handler = createExplainHandler(baseEnv);
    const invalid = counting({ ...good, isCorrect: true });
    expect((await call(handler, invalid)).status).toBe(502);
    await call(handler, invalid);
    expect(invalid.calls).toBe(2);

    const hang = Object.assign(((_u: string, init: RequestInit) => {
      hang.calls += 1;
      return new Promise((_r, reject) => init.signal?.addEventListener('abort', () => reject(Object.assign(new Error('x'), { name: 'AbortError' }))));
    }) as unknown as typeof fetch, { calls: 0 });
    expect((await call(handler, hang, other)).status).toBe(504);
    await call(handler, hang, other);
    expect(hang.calls).toBe(2);

    const down = Object.assign((async () => { down.calls += 1; return new Response('{}', { status: 500 }); }) as unknown as typeof fetch, { calls: 0 });
    await call(handler, down, { ...request, currentExpression: 'x' });
    await call(handler, down, { ...request, currentExpression: 'x' });
    expect(down.calls).toBe(2);
  });

  it('expires entries after the TTL', async () => {
    let now = 0;
    const handler = createExplainHandler({ ...baseEnv, EXPLANATION_CACHE_TTL_MS: '1000' }, { now: () => now });
    const model = counting();
    await call(handler, model);
    now = 500;
    expect((await call(handler, model)).body.cache).toBe('hit');
    now = 1500;
    expect((await call(handler, model)).body.cache).toBe('miss');
    expect(model.calls).toBe(2);
  });

  it('stays bounded, evicting the least recently used entry', () => {
    const cache = createExplainCache<number>({ ttlMs: 1000, maxEntries: 3 });
    ['a', 'b', 'c'].forEach((key, index) => cache.set(key, index));
    cache.get('a');
    cache.set('d', 3);
    expect(cache.size).toBe(3);
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('a')).toBe(0);
    for (let i = 0; i < 50; i += 1) cache.set(`k${i}`, i);
    expect(cache.size).toBe(3);
  });

  it('keys on prompt version and model name', () => {
    expect(cacheKey('explanation-prompt/1', 'model-a', request)).not.toBe(cacheKey('explanation-prompt/2', 'model-a', request));
    expect(cacheKey('explanation-prompt/1', 'model-a', request)).not.toBe(cacheKey('explanation-prompt/1', 'model-b', request));
    expect(cacheKey('explanation-prompt/1', 'model-a', request)).toBe(cacheKey('explanation-prompt/1', 'model-a', { ...request }));
  });

  it('serves a different model its own answers', async () => {
    const model = counting();
    await call(createExplainHandler(baseEnv), model);
    await call(createExplainHandler({ ...baseEnv, LLM_MODEL: 'model-b' }), model);
    expect(model.calls).toBe(2);
  });

  it('reports token usage on a miss and never exposes the secret', async () => {
    const handler = createExplainHandler(baseEnv);
    const response = await call(handler, counting());
    expect(response.body.usage).toEqual({ inputTokens: 10, outputTokens: 5 });
    expect(JSON.stringify(response)).not.toContain(SECRET);
  });
});

describe('deployable adapter', () => {
  const post = (body: unknown) => new Request('https://example.test/api/explain', { method: 'POST', body: JSON.stringify(body) });

  it('answers with the same status and body as the shared handler', async () => {
    const model = counting();
    const handler = createExplainHandler(baseEnv);
    const adapter = createWebAdapter(baseEnv, handler);
    const origFetch = globalThis.fetch;
    globalThis.fetch = model;
    try {
      const viaAdapter = await adapter.explain(post(request), 'ip-1');
      const direct = await createExplainHandler(baseEnv).handle({ method: 'POST', bodyText: JSON.stringify(request), fetchImpl: model, clientKey: 'ip-1' });
      expect(viaAdapter.status).toBe(direct.status);
      expect(viaAdapter.headers.get('content-type')).toBe('application/json');
      const body = await viaAdapter.json();
      expect(body).toMatchObject({ status: 'ok', value: good, promptVersion: 'explanation-prompt/1' });
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  it('applies the same validation, method and config semantics', async () => {
    const adapter = createWebAdapter(baseEnv);
    expect((await adapter.explain(post({ ...request, systemPrompt: 'x' }))).status).toBe(400);
    expect((await adapter.explain(new Request('https://example.test/api/explain', { method: 'GET' }))).status).toBe(405);
    expect(await adapter.config().json()).toEqual({ provider: 'llm' });
    expect(await createWebAdapter({}).config().json()).toEqual({ provider: 'deterministic' });
    expect((await createWebAdapter({}).explain(post(request))).status).toBe(503);
  });

  it('rate limits per client key through the adapter', async () => {
    const adapter = createWebAdapter({ ...baseEnv, EXPLANATION_RATE_LIMIT_MAX: '1' });
    const origFetch = globalThis.fetch;
    globalThis.fetch = counting();
    try {
      expect((await adapter.explain(post(request), 'a')).status).toBe(200);
      expect((await adapter.explain(post(other), 'a')).status).toBe(429);
      expect((await adapter.explain(post(other), 'b')).status).toBe(200);
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});
