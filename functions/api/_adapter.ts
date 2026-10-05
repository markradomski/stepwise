import { createWebAdapter } from '../../server/webAdapter';
import type { ExplainEnv } from '../../server/explainConfig';

// Cloudflare Pages Functions entry. One adapter (and so one limiter and cache) per isolate.
let adapter: ReturnType<typeof createWebAdapter> | undefined;
export const adapterFor = (env: ExplainEnv) => (adapter ??= createWebAdapter(env));

export type PagesContext = { request: Request; env: ExplainEnv };
