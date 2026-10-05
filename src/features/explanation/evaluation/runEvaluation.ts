import { deterministicExplanationProvider } from '../deterministicExplanationProvider';
import { createExplainHandler, type ExplainEnv } from '../../../../server/explainHandler';
import type { ExplanationResult } from '../explanationTypes';
import { checkExplanation, type CheckResult } from './checks';
import { corpus, type EvaluationCase } from './corpus';

export type CaseResult = {
  id: string;
  status: 'ok' | 'unavailable' | 'failed';
  checks?: CheckResult;
  note?: string;
  output?: ExplanationResult;
  latencyMs?: number;
  usage?: { inputTokens?: number; outputTokens?: number };
  cache?: string;
};
export type ProviderReport = { provider: string; model?: string; promptVersion?: string; cases: CaseResult[] };

export async function evaluateDeterministic(cases: EvaluationCase[] = corpus): Promise<ProviderReport> {
  const results: CaseResult[] = [];
  for (const testCase of cases) {
    const outcome = await deterministicExplanationProvider.explain(testCase.request);
    results.push(
      outcome.status === 'ok'
        ? { id: testCase.id, status: 'ok', checks: checkExplanation(testCase, outcome.value), output: asResult(outcome.value) }
        : { id: testCase.id, status: outcome.status === 'unavailable' ? 'unavailable' : 'failed' },
    );
  }
  return { provider: 'deterministic', cases: results };
}

// Goes through the same server handler the proxy uses, so prompt, request validation and output validation are included.
export async function evaluateLlm(env: ExplainEnv, cases: EvaluationCase[] = corpus, fetchImpl?: typeof fetch): Promise<ProviderReport> {
  // Evaluation must see every case, so the abuse controls are set high enough not to interfere.
  const handler = createExplainHandler({ ...env, EXPLANATION_PROVIDER: 'llm', EXPLANATION_RATE_LIMIT_MAX: '1000', EXPLANATION_CACHE_MAX_ENTRIES: '1' });
  let model = env.LLM_MODEL ?? '';
  let promptVersion = env.EXPLANATION_PROMPT_VERSION ?? '';
  const results: CaseResult[] = [];
  for (const testCase of cases.filter((candidate) => candidate.expect.supported)) {
    const started = performance.now();
    const response = await handler.handle({ method: 'POST', bodyText: JSON.stringify(testCase.request), fetchImpl, clientKey: 'evaluation' });
    const latencyMs = Math.round(performance.now() - started);
    if (response.status === 200) {
      model = String(response.body.model ?? model);
      promptVersion = String(response.body.promptVersion ?? promptVersion);
      results.push({
        id: testCase.id,
        status: 'ok',
        checks: checkExplanation(testCase, response.body.value),
        output: asResult(response.body.value),
        latencyMs,
        usage: response.body.usage as CaseResult['usage'],
        cache: String(response.body.cache),
      });
    } else {
      results.push({ id: testCase.id, status: 'failed', note: String(response.body.reason), latencyMs });
    }
  }
  return { provider: 'llm', model, promptVersion, cases: results };
}

const asResult = (value: unknown) => value as ExplanationResult;

const count = (items: boolean[]) => `${items.filter(Boolean).length}/${items.length}`;

const defined = (values: Array<number | undefined>) => values.filter((value): value is number => value !== undefined);
const average = (values: Array<number | undefined>) => {
  const list = defined(values);
  return list.length ? Math.round(list.reduce((a, b) => a + b, 0) / list.length) : undefined;
};
const median = (values: Array<number | undefined>) => {
  const list = defined(values).sort((a, b) => a - b);
  if (!list.length) return undefined;
  const mid = Math.floor(list.length / 2);
  return list.length % 2 ? list[mid] : Math.round((list[mid - 1] + list[mid]) / 2);
};
const tokenTotals = (report: ProviderReport) => {
  const used = report.cases.filter((result) => result.usage);
  if (!used.length) return undefined;
  return {
    input: used.reduce((total, result) => total + (result.usage?.inputTokens ?? 0), 0),
    output: used.reduce((total, result) => total + (result.usage?.outputTokens ?? 0), 0),
  };
};

export function summarise(report: ProviderReport, cases: EvaluationCase[] = corpus) {
  const supported = report.cases.filter((result) => cases.find((c) => c.id === result.id)?.expect.supported);
  const checked = report.cases.filter((result) => result.checks);
  const unsupported = report.cases.filter((result) => !cases.find((c) => c.id === result.id)?.expect.supported);
  const authorship = checked.filter((result) => result.checks!.authorship !== null);
  const boundaryViolations = checked.filter((result) => !result.checks!.boundary).length;
  const schemaFailures = supported.filter((result) => !result.checks?.schema).length;
  return {
    cases: report.cases.length,
    validSchema: count(supported.map((result) => Boolean(result.checks?.schema))),
    boundaryViolations,
    grounded: count(checked.map((result) => result.checks!.grounded)),
    pedagogy: count(checked.map((result) => result.checks!.pedagogy)),
    authorship: count(authorship.map((result) => result.checks!.authorship === true)),
    unavailableHandled: count(unsupported.map((result) => result.status === 'unavailable')),
    futureLeaks: checked.filter((result) => result.checks!.futureLeak).length,
    restatements: checked.filter((result) => result.checks!.restatesHint).length,
    concise: count(checked.map((result) => result.checks!.concision === 2)),
    averageLatencyMs: average(report.cases.map((result) => result.latencyMs)),
    medianLatencyMs: median(report.cases.map((result) => result.latencyMs)),
    tokens: tokenTotals(report),
    hardFailures: boundaryViolations + schemaFailures,
  };
}

export function formatReport(report: ProviderReport): string {
  const s = summarise(report);
  const lines = [
    `Explanation evaluation — ${report.provider}`,
    '',
    `Cases: ${s.cases}`,
    `Valid schema: ${s.validSchema}`,
    `Boundary violations: ${s.boundaryViolations}`,
    `Grounded: ${s.grounded}`,
    `Pedagogy (heuristic): ${s.pedagogy}`,
    `Progressive-scaffold violations (heuristic): ${s.futureLeaks}`,
    `Restates the hint (heuristic): ${s.restatements}`,
    `Concise (≤220 chars): ${s.concise}`,
    `Authorship checks: ${s.authorship}`,
    `Unavailable handled: ${s.unavailableHandled}`,
  ];
  if (report.model) lines.splice(1, 0, `Model: ${report.model}`, `Prompt: ${report.promptVersion}`);
  if (s.averageLatencyMs !== undefined) lines.push(`Latency: average ${s.averageLatencyMs} ms, median ${s.medianLatencyMs} ms`);
  if (s.tokens) lines.push(`Tokens: ${s.tokens.input} in / ${s.tokens.output} out`);
  const problems = report.cases.filter((result) => result.note || result.checks?.notes.length || result.status === 'failed');
  if (problems.length) {
    lines.push('', 'Notes:');
    for (const result of problems) lines.push(`  ${result.id}: ${[result.note, ...(result.checks?.notes ?? [])].filter(Boolean).join('; ') || result.status}`);
  }
  return lines.join('\n');
}

export function formatComparison(deterministic: ProviderReport, llm: ProviderReport): string {
  const row = (id: string) => {
    const d = deterministic.cases.find((result) => result.id === id);
    const l = llm.cases.find((result) => result.id === id);
    const checks = l?.checks;
    const notes = [l?.note, ...(checks?.notes ?? [])].filter(Boolean).join('; ');
    return [id, d?.checks?.schema ? 'yes' : d?.status ?? '-', l ? (checks?.schema ? 'yes' : l.status) : 'n/a', checks ? (checks.boundary ? 'pass' : 'FAIL') : '-', checks ? (checks.grounded ? 'pass' : 'fail') : '-', notes || ''].join(' | ');
  };
  return ['Case | Deterministic valid | LLM valid | Boundary | Grounding | Notes', ...corpus.map((c) => row(c.id))].join('\n');
}
