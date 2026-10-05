import type { ExplainEnv } from '../server/explainConfig';
import { createWebAdapter } from '../server/webAdapter';

type Env = ExplainEnv & { ASSETS: { fetch(request: Request): Promise<Response> } };

// Cloudflare Workers entry (static assets plus the explanation API). Only /api/* reaches this code; every other
// path is served from the built assets. One adapter, and so one limiter and cache, per isolate.
let adapter: ReturnType<typeof createWebAdapter> | undefined;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    adapter ??= createWebAdapter(env);
    if (pathname === '/api/explain/config') return adapter.config();
    if (pathname === '/api/explain') return adapter.explain(request, request.headers.get('CF-Connecting-IP') ?? undefined);
    return env.ASSETS.fetch(request);
  },
};
