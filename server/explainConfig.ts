export type ExplainEnv = {
  EXPLANATION_PROVIDER?: string;
  EXPLANATION_PROMPT_VERSION?: string;
  LLM_API_KEY?: string;
  LLM_MODEL?: string;
  LLM_BASE_URL?: string;
  LLM_TIMEOUT_MS?: string;
  EXPLANATION_RATE_LIMIT_MAX?: string;
  EXPLANATION_RATE_LIMIT_WINDOW_MS?: string;
  EXPLANATION_CACHE_TTL_MS?: string;
  EXPLANATION_CACHE_MAX_ENTRIES?: string;
};

export type ExplainConfig = {
  model: string;
  baseUrl: string;
  timeoutMs: number;
  rateLimitMax: number;
  rateLimitWindowMs: number;
  cacheTtlMs: number;
  cacheMaxEntries: number;
};

const positive = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

// Every value is optional. Defaults suit a small public demo: 10 requests a minute per client,
// results cached for 15 minutes, at most 200 entries.
export function readConfig(env: ExplainEnv): ExplainConfig {
  return {
    model: env.LLM_MODEL || 'claude-haiku-4-5-20251001',
    baseUrl: env.LLM_BASE_URL || 'https://api.anthropic.com',
    timeoutMs: positive(env.LLM_TIMEOUT_MS, 8000),
    rateLimitMax: positive(env.EXPLANATION_RATE_LIMIT_MAX, 10),
    rateLimitWindowMs: positive(env.EXPLANATION_RATE_LIMIT_WINDOW_MS, 60_000),
    cacheTtlMs: positive(env.EXPLANATION_CACHE_TTL_MS, 15 * 60_000),
    cacheMaxEntries: Math.floor(positive(env.EXPLANATION_CACHE_MAX_ENTRIES, 200)),
  };
}

// The provider is chosen by server configuration alone, and only when a key is present.
export const isLlmConfigured = (env: ExplainEnv) => env.EXPLANATION_PROVIDER === 'llm' && Boolean(env.LLM_API_KEY);
