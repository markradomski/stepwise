import type { ExplainEnv } from '../../../../server/explainHandler';
import { evaluateDeterministic, evaluateLlm, formatComparison, formatReport, summarise, type ProviderReport } from './runEvaluation';
import { corpus } from './corpus';
import { buildReviewMarkdown, formatHumanReviewSummary, type HumanReviewFile } from './review';

export type EvalInput = {
  mode: 'deterministic' | 'llm' | 'review';
  env: ExplainEnv;
  // Restrict the live run to these cases (for rerunning a suspicious one).
  caseIds?: string[];
  // Previously saved live results, and any human review, for the review mode.
  saved?: { llm?: ProviderReport; humanReview?: HumanReviewFile };
};

export type EvalOutput = { output: string; code: number; json: Record<string, unknown>; review?: string };

// Returns what to print and the exit code. The live model is evaluated only when asked for and only with
// credentials; results are never invented.
export async function main({ mode, env, saved, caseIds }: EvalInput): Promise<EvalOutput> {
  const deterministic = await evaluateDeterministic();
  const parts = [formatReport(deterministic)];
  let code = summarise(deterministic).hardFailures > 0 ? 1 : 0;
  const json: Record<string, unknown> = { deterministic };

  if (mode === 'review') {
    const llm = saved?.llm;
    parts.push('', llm ? formatReport(llm) : 'Live LLM results: none saved — run npm run eval:explanations:llm first.', '', formatHumanReviewSummary(saved?.humanReview));
    return { output: parts.join('\n'), code, json, review: buildReviewMarkdown(deterministic, llm) };
  }

  if (mode === 'llm') {
    if (!env.LLM_API_KEY) {
      parts.push('', 'Live LLM evaluation not run — no API credentials available (set LLM_API_KEY).');
      return { output: parts.join('\n'), code, json };
    }
    const llm = await evaluateLlm(env, caseIds?.length ? corpus.filter((c) => caseIds.includes(c.id)) : corpus);
    json.llm = llm;
    parts.push('', formatReport(llm), '', formatComparison(deterministic, llm), '', formatHumanReviewSummary(saved?.humanReview));
    if (summarise(llm).hardFailures > 0) code = 1;
    return { output: parts.join('\n'), code, json, review: buildReviewMarkdown(deterministic, llm) };
  }
  return { output: parts.join('\n'), code, json };
}
