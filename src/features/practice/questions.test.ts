import { feedbackForResult } from './feedback';
import { normaliseExpression } from './normalise';
import { createInitialPracticeState } from './practiceState';
import { practiceQuestions } from './questions';
import { contentFor, genericHintFor, nextStepFor } from './scaffolding';
import { validateStep } from './validation';

const [question1, question2, question3] = practiceQuestions;

const check = (question: (typeof practiceQuestions)[number], from: string, input: string) =>
  validateStep(question, from, input);

const walk = (question: (typeof practiceQuestions)[number], steps: string[]) => {
  let current = question.initialExpression;
  for (const step of steps) {
    const result = check(question, current, step);
    expect(result).toMatchObject({ kind: 'valid', progression: 'direct' });
    if (result.kind === 'valid') current = result.canonicalExpression;
  }
  return current;
};

describe('question set', () => {
  it('has exactly three questions, each with an id, initial expression and goal', () => {
    expect(practiceQuestions).toHaveLength(3);
    expect(new Set(practiceQuestions.map((question) => question.id)).size).toBe(3);
    for (const question of practiceQuestions) {
      expect(question.id).toBeTruthy();
      expect(question.initialExpression).toBeTruthy();
      expect(question.goal).toBeTruthy();
    }
  });

  it('stores every expression in normalised form', () => {
    for (const question of practiceQuestions) {
      const expressions = [
        question.initialExpression,
        question.goal,
        ...Object.entries(question.transitions).flatMap(([from, next]) => [from, ...next]),
        ...question.knownMistakes.flatMap((mistake) => [mistake.from, mistake.entered]),
        ...Object.keys(question.genericHints),
        ...Object.keys(question.strategies),
      ];
      for (const expression of expressions) expect(normaliseExpression(expression)).toBe(expression);
    }
  });

  it('can reach the goal from the initial expression along every branch', () => {
    const reaches = (question: (typeof practiceQuestions)[number], expression: string): boolean =>
      expression === question.goal || (question.transitions[expression] ?? []).every((next) => reaches(question, next));
    for (const question of practiceQuestions) expect(reaches(question, question.initialExpression)).toBe(true);
  });

  it('has content for every misconception a question can diagnose, and generic help for every step', () => {
    for (const question of practiceQuestions) {
      for (const mistake of question.knownMistakes) {
        expect(contentFor(question, mistake.misconception)).toBeDefined();
        expect(Object.keys(question.transitions)).toContain(mistake.from);
      }
      for (const step of Object.keys(question.transitions)) expect(question.genericHints[step]).toBeTruthy();
    }
  });

  it('keeps question-specific wording in the question, not in shared logic', () => {
    expect(contentFor(question1, 'PARTIAL_DISTRIBUTION')?.hint).toBe('The 3 applies to everything inside the brackets.');
    expect(contentFor(question3, 'PARTIAL_DISTRIBUTION')?.hint).toBe('The 4 applies to everything inside the brackets.');
    expect(contentFor(question2, 'INCORRECT_INVERSE_OPERATION')?.feedback.first).toContain('+5');
    expect(contentFor(question3, 'PARTIAL_DISTRIBUTION')?.example).toEqual({
      before: '2(y - 3)',
      after: '2y - 6',
      explanation: 'The number outside the brackets multiplies each term inside.',
    });
  });
});

describe('question 1', () => {
  it('still supports both solution paths', () => {
    expect(walk(question1, ['3x + 6 = 18', '3x = 12', 'x = 4'])).toBe('x = 4');
    expect(walk(question1, ['x + 2 = 6', 'x = 4'])).toBe('x = 4');
  });
});

describe('question 2', () => {
  it('accepts the direct path', () => {
    expect(walk(question2, ['2x = 12', 'x = 6'])).toBe('x = 6');
  });

  it('accepts equivalent forms', () => {
    expect(check(question2, '2x + 5 = 17', '2x = 17 - 5')).toMatchObject({
      progression: 'direct',
      recognition: 'equivalent',
      canonicalExpression: '2x = 12',
      submittedExpression: '2x = 17 - 5',
    });
    expect(check(question2, '2x = 12', 'x = 12/2')).toMatchObject({
      progression: 'direct',
      canonicalExpression: 'x = 6',
      simplification: { expression: '12/2', result: '6' },
    });
  });

  it('recognises its misconceptions', () => {
    expect(check(question2, '2x + 5 = 17', '2x = 22')).toMatchObject({
      kind: 'misconception',
      misconception: 'INCORRECT_INVERSE_OPERATION',
    });
    expect(check(question2, '2x = 12', 'x = 5')).toMatchObject({ kind: 'misconception', misconception: 'ARITHMETIC_ERROR' });
  });

  it('treats the bare answer as skipped reasoning', () => {
    expect(check(question2, '2x + 5 = 17', 'x = 6')).toMatchObject({ kind: 'valid', progression: 'skipped' });
  });

  it('does not accept question 1 answers', () => {
    expect(check(question2, '2x + 5 = 17', 'x = 4').kind).toBe('unrecognised');
  });

  it('uses its own fallback hint and feedback', () => {
    const state = createInitialPracticeState(question2);
    expect(genericHintFor(question2, '2x + 5 = 17')).toBe('What operation would undo the +5?');
    expect(feedbackForResult(check(question2, '2x + 5 = 17', '2x = 22'), state)?.message).toBe(
      'Check what happens when you undo the +5.',
    );
    expect(nextStepFor(question2, '2x + 5 = 17')).toBe('2x = 12');
  });
});

describe('question 3', () => {
  it('accepts both valid paths', () => {
    expect(walk(question3, ['4x - 4 = 20', '4x = 24', 'x = 6'])).toBe('x = 6');
    expect(walk(question3, ['x - 1 = 5', 'x = 6'])).toBe('x = 6');
  });

  it('accepts equivalent forms', () => {
    expect(check(question3, '4(x - 1) = 20', 'x - 1 = 20/4')).toMatchObject({
      progression: 'direct',
      recognition: 'equivalent',
      canonicalExpression: 'x - 1 = 5',
    });
    expect(check(question3, '4x = 24', 'x = 24/4')).toMatchObject({ progression: 'direct', canonicalExpression: 'x = 6' });
  });

  it('recognises partial distribution with its own wording', () => {
    const state = createInitialPracticeState(question3);
    const result = check(question3, '4(x - 1) = 20', '4x - 1 = 20');
    expect(result).toMatchObject({ kind: 'misconception', misconception: 'PARTIAL_DISTRIBUTION' });
    expect(feedbackForResult(result, state)?.message).toBe('Check what the 4 multiplies inside the brackets.');
  });

  it('recognises its other misconceptions and treats the bare answer as skipped', () => {
    expect(check(question3, '4x - 4 = 20', '4x = 16')).toMatchObject({ misconception: 'INCORRECT_INVERSE_OPERATION' });
    expect(check(question3, '4x = 24', 'x = 5')).toMatchObject({ misconception: 'ARITHMETIC_ERROR' });
    expect(check(question3, '4(x - 1) = 20', 'x = 6')).toMatchObject({ kind: 'valid', progression: 'skipped' });
  });

  it('has its own generic help for the initial equation', () => {
    expect(genericHintFor(question3, '4(x - 1) = 20')).toBe(
      'Think about how you could simplify the left-hand side or both sides.',
    );
  });
});
