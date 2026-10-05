import { deterministicExplanationProvider } from '../deterministicExplanationProvider';
import { handleExplainRequest, type ExplainEnv } from '../../../../server/explainHandler';
import { checkExplanation, type CheckResult } from './checks';
import { corpus, type EvaluationCase } from './corpus';

export type CaseResult = { id: string; status: 'ok' | 'unavailable' | 'failed'; checks?: CheckResult; note?: string };
export type ProviderReport = { provider: string; cases: CaseResult[] };

export async function evaluateDeterministic(cases: EvaluationCase[] = corpus): Promise<ProviderReport> {
  const results: CaseResult[] = [];
  for (const testCase of cases) {
    const outcome = await deterministicExplanationProvider.explain(testCase.request);
    results.push(
      outcome.status === 'ok'
        ? { id: testCase.id, status: 'ok', checks: checkExplanation(testCase, outcome.value) }
        : { id: testCase.id, status: outcome.status === 'unavailable' ? 'unavailable' : 'failed' },
    );
  }
  return { provider: 'deterministic', cases: results };
}

// Goes through the same server handler the proxy uses, so prompt, request validation and output validation are included.
export async function evaluateLlm(env: ExplainEnv, cases: EvaluationCase[] = corpus, fetchImpl?: typeof fetch): Promise<ProviderReport> {
  const results: CaseResult[] = [];
  for (const testCase of cases.filter((candidate) => candidate.expect.supported)) {
    const response = await handleExplainRequest({
      method: 'POST',
      bodyText: JSON.stringify(testCase.request),
      env: { ...env, EXPLANATION_PROVIDER: 'llm' },
      fetchImpl,
    });
    if (response.status === 200) {
      results.push({ id: testCase.id, status: 'ok', checks: checkExplanation(testCase, response.body.value) });
    } else {
      results.push({ id: testCase.id, status: 'failed', note: String(response.body.reason) });
    }
  }
  return { provider: 'llm', cases: results };
}

const count = (items: boolean[]) => `${items.filter(Boolean).length}/${items.length}`;

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
    `Pedagogy: ${s.pedagogy}`,
    `Authorship checks: ${s.authorship}`,
    `Unavailable handled: ${s.unavailableHandled}`,
  ];
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
