import { deterministicExplanationProvider } from './deterministicExplanationProvider';
import { resolveExplanation, type ExplanationService } from './explanationResolver';
import { createLlmExplanationProvider } from './llmExplanationProvider';

type Config = { provider: 'llm' | 'deterministic' };

async function loadConfig(fetchImpl: typeof fetch | undefined): Promise<Config> {
  try {
    const response = await (fetchImpl ?? fetch)('/api/explain/config');
    const body = (await response.json()) as { provider?: unknown };
    return { provider: response.ok && body.provider === 'llm' ? 'llm' : 'deterministic' };
  } catch {
    return { provider: 'deterministic' };
  }
}

// Without server configuration this is exactly the deterministic provider. With it, the model is tried
// once and the deterministic provider is the fallback. What can be explained is still defined by the
// deterministic mapping, so the interface does not change between the two.
export function createDefaultExplanationService(fetchImpl?: typeof fetch): ExplanationService {
  const llm = createLlmExplanationProvider({ fetchImpl });
  let config: Promise<Config> | undefined;
  return {
    label: 'Deterministic',
    supports: (request) => deterministicExplanationProvider.supports(request),
    async resolve(request) {
      config ??= loadConfig(fetchImpl);
      const { provider } = await config;
      return provider === 'llm'
        ? resolveExplanation(request, llm, deterministicExplanationProvider)
        : resolveExplanation(request, deterministicExplanationProvider);
    },
  };
}

export const defaultExplanationService = createDefaultExplanationService();
