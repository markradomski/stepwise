import type { ExplainEnv } from '../../../../server/explainHandler';
import { evaluateDeterministic, evaluateLlm, formatComparison, formatReport, summarise } from './runEvaluation';

// Returns the process exit code. The live model is evaluated only when asked for and only with credentials.
export async function main(mode: 'deterministic' | 'llm', env: ExplainEnv): Promise<{ output: string; code: number; json: unknown }> {
  const deterministic = await evaluateDeterministic();
  const parts = [formatReport(deterministic)];
  let code = summarise(deterministic).hardFailures > 0 ? 1 : 0;
  const json: Record<string, unknown> = { deterministic };

  if (mode === 'llm') {
    if (!env.LLM_API_KEY) {
      parts.push('', 'Live LLM evaluation not run — no API credentials available (set LLM_API_KEY).');
      return { output: parts.join('\n'), code, json };
    }
    const llm = await evaluateLlm(env);
    json.llm = llm;
    parts.push('', formatReport(llm), '', formatComparison(deterministic, llm));
    if (summarise(llm).hardFailures > 0) code = 1;
  }
  return { output: parts.join('\n'), code, json };
}
