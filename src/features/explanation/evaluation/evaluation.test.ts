import { checkExplanation, futureExpressions, similarity } from './checks';
import { main } from './cli';
import { buildReviewMarkdown, formatHumanReviewSummary, tallyHumanReview } from './review';
import { corpus } from './corpus';
import { evaluateDeterministic, evaluateLlm, formatReport, summarise } from './runEvaluation';

const byId = (id: string) => corpus.find((c) => c.id === id)!;
const sound = { version: 'explanation-output/1', title: 'Why that step works', body: 'Subtracting 5 from both sides keeps the equation balanced, so 2x + 5 = 17 becomes 2x = 12.' };

describe('explanation evaluation corpus', () => {
  it('covers all three questions, every target kind, an equivalent form and an unsupported case', () => {
    expect(corpus).toHaveLength(12);
    expect(new Set(corpus.map((c) => c.request.questionId)).size).toBe(3);
    expect(new Set(corpus.map((c) => c.request.targetKind))).toEqual(new Set(['misconception', 'accepted-step', 'suggested-step']));
    expect(corpus.filter((c) => c.expect.authorship)).toHaveLength(1);
    expect(corpus.filter((c) => !c.expect.supported)).toHaveLength(1);
  });

  it('the deterministic provider passes every check', async () => {
    const report = await evaluateDeterministic();
    expect(summarise(report)).toMatchObject({ cases: 12, validSchema: '11/11', boundaryViolations: 0, grounded: '11/11', pedagogy: '11/11', authorship: '1/1', unavailableHandled: '1/1', hardFailures: 0 });
    expect(formatReport(report)).toContain('Boundary violations: 0');
  });
});

describe('explanation checks', () => {
  const testCase = byId('q2-accepted-subtraction');

  it('passes a sound explanation', () => {
    expect(checkExplanation(testCase, sound)).toMatchObject({ schema: true, boundary: true, grounded: true, pedagogy: true });
  });

  it('fails the schema for extra fields or the wrong version', () => {
    expect(checkExplanation(testCase, { ...sound, isCorrect: true }).schema).toBe(false);
    expect(checkExplanation(testCase, { ...sound, version: 'x' }).schema).toBe(false);
  });

  it.each([
    ['judging correctness', 'This step is correct because both sides stay equal.'],
    ['naming the system', 'As an AI model I can say subtracting 5 from both sides keeps balance.'],
    ['internal terminology', 'Subtracting 5 from both sides keeps balance; the mastery estimate rises.'],
    ['blame', 'You forgot to subtract 5 from both sides, so 2x = 12 is needed.'],
    ['a future answer', 'Subtracting 5 from both sides gives 2x = 12, then x = 6.'],
  ])('flags a boundary violation: %s', (_name, body) => {
    expect(checkExplanation(testCase, { ...sound, body }).boundary).toBe(false);
  });

  it('flags a missing concept and a restated hint', () => {
    expect(checkExplanation(testCase, { ...sound, body: 'Things happen to the equation 2x = 12.' }).grounded).toBe(false);
    const hint = byId('q1-misconception-partial-distribution');
    expect(checkExplanation(hint, { ...sound, body: `${hint.request.deterministicContent} It multiplies both terms in the brackets.` }).pedagogy).toBe(false);
  });

  it('flags a false claim of authorship for an equivalent form', () => {
    const equivalent = byId('q2-accepted-equivalent-form');
    const honest = { ...sound, body: 'Subtracting 5 from both sides keeps balance. You wrote 2x = 17 - 5, which is equivalent to 2x = 12.' };
    const dishonest = { ...sound, body: 'Subtracting 5 from both sides keeps balance. You wrote 2x = 12, which is equivalent to the original.' };
    expect(checkExplanation(equivalent, honest)).toMatchObject({ authorship: true, boundary: true });
    expect(checkExplanation(equivalent, dishonest)).toMatchObject({ authorship: false, boundary: false });
  });

  it('handles the unsupported case as unavailable for the deterministic provider', async () => {
    const report = await evaluateDeterministic([byId('q1-unsupported-skipped-step')]);
    expect(report.cases[0].status).toBe('unavailable');
  });
});

describe('live evaluation plumbing (mocked, offline)', () => {
  it('runs the supported cases through the server handler and checks the output', async () => {
    const model = (async () => new Response(JSON.stringify({ content: [{ type: 'tool_use', input: { ...sound, isCorrect: true } }] }))) as unknown as typeof fetch;
    const report = await evaluateLlm({ LLM_API_KEY: 'k' }, corpus.slice(0, 2), model);
    expect(report.cases.every((c) => c.status === 'failed' && c.note === 'invalid-output')).toBe(true);
    expect(summarise(report, corpus).hardFailures).toBeGreaterThan(0);
  });
});

describe('evaluation heuristics and review output', () => {
  const subtraction = corpus.find((c) => c.id === 'q2-accepted-subtraction')!;
  const misconception = corpus.find((c) => c.id === 'q1-misconception-partial-distribution')!;
  const sound = { version: 'explanation-output/1', title: 'Why', body: 'Subtracting 5 from both sides keeps the equation balanced, so 2x + 5 = 17 becomes 2x = 12.' };

  it('lists the solution steps not yet supplied for a case', () => {
    expect(futureExpressions(misconception)).toEqual(['3x + 6 = 18', '3x = 12', 'x = 4', 'x + 2 = 6']);
    expect(futureExpressions(subtraction)).toEqual(['x = 6']);
  });

  it('flags a named future step as a heuristic signal, not a hard failure', () => {
    const leaky = checkExplanation(subtraction, { ...sound, body: `${sound.body} Then x = 6.` });
    expect(leaky.futureLeak).toBe(true);
    expect(checkExplanation(subtraction, sound).futureLeak).toBe(false);
  });

  it('measures concision and restatement', () => {
    expect(checkExplanation(subtraction, sound).concision).toBe(2);
    expect(checkExplanation(subtraction, { ...sound, body: sound.body.repeat(6).slice(0, 450) }).concision).toBe(0);
    expect(similarity('The 3 applies to everything inside the brackets', 'The 3 applies to everything inside the brackets.')).toBeGreaterThan(0.9);
    expect(similarity('Dividing both sides', 'Check the arithmetic')).toBeLessThan(0.2);
    const restated = checkExplanation(misconception, { ...sound, body: `${misconception.request.deterministicContent} The number multiplies both terms in the brackets.` });
    expect(restated.restatesHint).toBe(true);
  });

  it('builds a review file with the rubric and blank human fields, and says when no live output exists', async () => {
    const markdown = buildReviewMarkdown(await evaluateDeterministic());
    expect(markdown).toContain('Live model output: not run — no API credentials available.');
    for (const testCase of corpus) expect(markdown).toContain(`## ${testCase.id}`);
    expect(markdown).toContain('HUMAN REVIEW');
    expect(markdown).toContain('- Better / Same / Worse:');
    expect(markdown).toContain('(heuristic)');
  });

  it('shows live output next to the baseline when it exists', async () => {
    const model = (async () => new Response(JSON.stringify({ content: [{ type: 'tool_use', input: { ...sound, title: 'Model title' } }], usage: { input_tokens: 100, output_tokens: 40 } }))) as unknown as typeof fetch;
    const deterministic = await evaluateDeterministic();
    const llm = await evaluateLlm({ LLM_API_KEY: 'k', LLM_MODEL: 'm' }, corpus.slice(0, 2), model);
    expect(llm).toMatchObject({ provider: 'llm', model: 'm', promptVersion: 'explanation-prompt/1' });
    expect(llm.cases[0].usage).toEqual({ inputTokens: 100, outputTokens: 40 });
    expect(llm.cases[0].latencyMs).toBeGreaterThanOrEqual(0);
    expect(buildReviewMarkdown(deterministic, llm)).toContain('**Model title**');
    expect(formatReport(llm)).toContain('Tokens: 200 in / 80 out');
  });

  it('reports human review only when a person has filled it in', () => {
    expect(formatHumanReviewSummary(undefined)).toBe('Human review pending.');
    expect(formatHumanReviewSummary({ a: { notes: 'x' } })).toBe('Human review pending.');
    expect(tallyHumanReview({ a: { value: 'better' }, b: { value: 'same' }, c: { value: 'better' } })).toEqual({ reviewed: 3, better: 2, same: 1, worse: 0 });
  });

  it('the review mode runs offline and never invents a live result', async () => {
    const result = await main({ mode: 'review', env: {} });
    expect(result.output).toContain('Human review pending.');
    expect(result.output).toContain('none saved');
    expect(result.review).toContain('# Explanation review');
    const noKey = await main({ mode: 'llm', env: {} });
    expect(noKey.output).toContain('Live LLM evaluation not run — no API credentials available');
    expect(noKey.json.llm).toBeUndefined();
  });
});
