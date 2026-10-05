import type { Plugin } from 'vite';
import { createExplainHandler, MAX_BODY_BYTES, type ExplainEnv } from './explainHandler';

type Req = { method?: string; url?: string; socket?: { remoteAddress?: string }; on(event: string, listener: (chunk?: unknown) => void): void };
type Res = { statusCode: number; setHeader(name: string, value: string): void; end(body?: string): void };
type Next = () => void;

const send = (res: Res, status: number, body: Record<string, unknown>) => {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
};

function readBody(req: Req): Promise<string | null> {
  return new Promise((resolve) => {
    let text = '';
    req.on('data', (chunk) => {
      text += String(chunk);
      if (text.length > MAX_BODY_BYTES) resolve(null);
    });
    req.on('end', () => resolve(text));
    req.on('error', () => resolve(null));
  });
}

// Local development and `vite preview` only. A deployment would host the same handlers as a small
// function; it would also need rate limiting and abuse controls, which are out of scope here.
export function explainApiPlugin(env: ExplainEnv): Plugin {
  const handler = createExplainHandler(env);
  const middleware = async (req: Req, res: Res, next: Next) => {
    const path = (req.url ?? '').split('?')[0];
    if (path === '/api/explain/config') return send(res, 200, handler.config().body);
    if (path !== '/api/explain') return next();
    const bodyText = req.method === 'POST' ? await readBody(req) : '';
    if (bodyText === null) return send(res, 413, { status: 'error', reason: 'too-large' });
    const started = Date.now();
    const { status, body } = await handler.handle({ method: req.method ?? 'GET', bodyText, clientKey: req.socket?.remoteAddress });
    console.info(`[explain] ${status} ${body.status === 'ok' ? 'ok' : body.reason} ${Date.now() - started}ms`);
    send(res, status, body);
  };
  return {
    name: 'stepwise-explain-api',
    configureServer: (server) => void server.middlewares.use(middleware as never),
    configurePreviewServer: (server) => void server.middlewares.use(middleware as never),
  };
}
