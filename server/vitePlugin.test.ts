import { explainApiPlugin } from './vitePlugin';
import type { ExplainEnv } from './explainHandler';

type Middleware = (req: unknown, res: unknown, next: () => void) => Promise<void>;

const setup = (env: ExplainEnv) => {
  let middleware: Middleware | undefined;
  const plugin = explainApiPlugin(env);
  (plugin.configureServer as (server: unknown) => void)({ middlewares: { use: (fn: Middleware) => (middleware = fn) } });
  return async (method: string, url: string, body = '') => {
    const out = { status: 0, body: '' };
    const handlers: Record<string, (chunk?: unknown) => void> = {};
    const req = { method, url, socket: { remoteAddress: '127.0.0.1' }, on: (event: string, fn: (chunk?: unknown) => void) => (handlers[event] = fn) };
    const res = { statusCode: 0, setHeader: () => undefined, end: (text?: string) => (out.body = text ?? '') };
    let passedThrough = false;
    const done = middleware!(req, res, () => (passedThrough = true));
    handlers.data?.(body);
    handlers.end?.();
    await done;
    out.status = res.statusCode;
    return { ...out, passedThrough };
  };
};

describe('vite dev adapter', () => {
  it('serves config and explain through the shared handler, with the same semantics as the web adapter', async () => {
    const call = setup({});
    expect(JSON.parse((await call('GET', '/api/explain/config')).body)).toEqual({ provider: 'deterministic' });
    expect((await call('GET', '/api/explain')).status).toBe(405);
    const bad = await call('POST', '/api/explain', JSON.stringify({ version: 'x' }));
    expect(bad.status).toBe(400);
    const ok = await call('POST', '/api/explain', JSON.stringify({ version: 'explanation-request/1', questionId: 'q', targetKind: 'hint', currentExpression: 'x' }));
    expect(ok.status).toBe(503);
  });

  it('leaves other routes alone', async () => {
    expect((await setup({})('GET', '/something-else')).passedThrough).toBe(true);
  });
});
