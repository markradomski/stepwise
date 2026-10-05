import { checkExplanation } from './checks';
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
