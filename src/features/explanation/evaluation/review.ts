import { corpus } from './corpus';
import type { CaseResult, ProviderReport } from './runEvaluation';

export type HumanReview = {
  grounded?: 'pass' | 'fail';
  correct?: 'pass' | 'fail';
  pedagogy?: 0 | 1 | 2;
  concise?: 0 | 1 | 2;
  scaffoldSafe?: 'pass' | 'fail';
  authorship?: 'pass' | 'fail' | 'n/a';
  tone?: 'pass' | 'fail';
  value?: 'better' | 'same' | 'worse';
  notes?: string;
};

export type HumanReviewFile = Record<string, HumanReview>;

// Tallies only what a person has actually filled in. Nothing is inferred.
export function tallyHumanReview(file: HumanReviewFile | undefined) {
  const entries = Object.entries(file ?? {})
    .filter(([id, entry]) => !id.startsWith('_') && entry.value)
    .map(([, entry]) => entry);
  if (!entries.length) return undefined;
  const count = (value: HumanReview['value']) => entries.filter((entry) => entry.value === value).length;
  return { reviewed: entries.length, better: count('better'), same: count('same'), worse: count('worse') };
}

export function formatHumanReviewSummary(file: HumanReviewFile | undefined): string {
  const tally = tallyHumanReview(file);
  return tally ? `Human review (${tally.reviewed} reviewed):\n  Better: ${tally.better}\n  Same: ${tally.same}\n  Worse: ${tally.worse}` : 'Human review pending.';
}

const checkLine = (result?: CaseResult) => {
  if (!result) return 'not run';
  if (!result.checks) return `${result.status}${result.note ? ` (${result.note})` : ''}`;
  const c = result.checks;
  const yes = (value: boolean | null) => (value === null ? 'n/a' : value ? 'pass' : 'FAIL');
  return [
    `schema ${yes(c.schema)}`,
    `boundary ${yes(c.boundary)}`,
    `grounding (heuristic) ${yes(c.grounded)}`,
    `authorship ${yes(c.authorship)}`,
    `future-step leak (heuristic) ${c.futureLeak ? 'YES' : 'no'}`,
    `restates hint (heuristic) ${c.restatesHint ? 'YES' : 'no'}`,
    `length ${c.characters} chars`,
    ...(result.latencyMs !== undefined ? [`latency ${result.latencyMs} ms`] : []),
  ].join(' · ');
};

const text = (result?: CaseResult) => (result?.output ? `**${result.output.title}**\n\n${result.output.body}` : '_none_');

// A file for a person to read and fill in. Automated results are labelled as heuristics.
export function buildReviewMarkdown(deterministic: ProviderReport, llm?: ProviderReport): string {
  const lines = [
    '# Explanation review',
    '',
    llm ? `Model: ${llm.model || 'unknown'} · Prompt: ${llm.promptVersion || 'unknown'}` : 'Live model output: not run — no API credentials available.',
    '',
    'Rubric: grounded (pass/fail) · correct (pass/fail) · pedagogically useful (0–2) · concise (0–2) · progressive-scaffold safe (pass/fail) · authorship safe (pass/fail/n.a.) · tone (pass/fail) · model value (worse/same/better).',
  ];
  for (const testCase of corpus) {
    const d = deterministic.cases.find((result) => result.id === testCase.id);
    const l = llm?.cases.find((result) => result.id === testCase.id);
    const { request } = testCase;
    lines.push(
      '',
      `## ${testCase.id}`,
      '',
      `${testCase.description} — target \`${request.targetKind}\`, question \`${request.questionId}\``,
      '',
      'INPUT CONTEXT',
      '```json',
      JSON.stringify({ ...request, version: undefined }, null, 2),
      '```',
      '',
      'DETERMINISTIC',
      '',
      text(d),
      '',
      'LLM',
      '',
      text(l),
      '',
      `AUTOMATED CHECKS (heuristic) — deterministic: ${checkLine(d)}`,
      `AUTOMATED CHECKS (heuristic) — LLM: ${checkLine(l)}`,
      '',
      'HUMAN REVIEW',
      '- Grounded:',
      '- Correct:',
      '- Pedagogical value (0–2):',
      '- Concise (0–2):',
      '- Progressive-scaffold safe:',
      '- Authorship safe:',
      '- Tone:',
      '- Better / Same / Worse:',
      '- Notes:',
    );
  }
  return lines.join('\n') + '\n';
}
