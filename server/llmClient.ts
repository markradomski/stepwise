import { outputSchema, type ExplanationPrompt } from '../src/features/explanation/prompts/explanationPromptV1';

export type LlmFailure = 'timeout' | 'network' | 'provider' | 'malformed';

export type LlmUsage = { inputTokens?: number; outputTokens?: number };

export class LlmError extends Error {
  constructor(public readonly kind: LlmFailure) {
    super(kind);
  }
}

type LlmCall = {
  prompt: ExplanationPrompt;
  apiKey: string;
  model: string;
  baseUrl: string;
  timeoutMs: number;
  fetchImpl: typeof fetch;
};

// The only file that knows which vendor API is behind the proxy. It forces a single structured tool
// result, so the model can only answer in the output schema.
export async function callLlm({ prompt, apiKey, model, baseUrl, timeoutMs, fetchImpl }: LlmCall): Promise<{ output: unknown; usage: LlmUsage }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(`${baseUrl}/v1/messages`, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'content-type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model,
        max_tokens: 400,
        temperature: 0,
        system: prompt.system,
        messages: [{ role: 'user', content: prompt.user }],
        tools: [
          {
            name: 'return_explanation',
            description: 'Return the explanation in the required structure.',
            input_schema: outputSchema,
          },
        ],
        tool_choice: { type: 'tool', name: 'return_explanation' },
      }),
    });
    if (!response.ok) throw new LlmError('provider');
    const payload = (await response.json()) as {
      content?: Array<{ type?: string; input?: unknown }>;
      usage?: { input_tokens?: unknown; output_tokens?: unknown };
    };
    const block = payload.content?.find((part) => part.type === 'tool_use');
    if (!block) throw new LlmError('malformed');
    const count = (value: unknown) => (typeof value === 'number' ? value : undefined);
    return { output: block.input, usage: { inputTokens: count(payload.usage?.input_tokens), outputTokens: count(payload.usage?.output_tokens) } };
  } catch (error) {
    if (error instanceof LlmError) throw error;
    if (error instanceof Error && error.name === 'AbortError') throw new LlmError('timeout');
    if (error instanceof SyntaxError) throw new LlmError('malformed');
    throw new LlmError('network');
  } finally {
    clearTimeout(timer);
  }
}
