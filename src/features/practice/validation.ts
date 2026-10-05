import { canonicaliseEquation, findSimplification, type Simplification } from './equivalence';
import { normaliseExpression } from './normalise';
import type { PracticeQuestion } from './practiceQuestion';

export type Misconception = 'PARTIAL_DISTRIBUTION' | 'INCORRECT_INVERSE_OPERATION' | 'ARITHMETIC_ERROR';

export type ValidationResult =
  | {
      kind: 'valid';
      progression: 'direct' | 'skipped';
      recognition: 'exact' | 'equivalent';
      submittedExpression: string;
      canonicalExpression: string;
      simplification?: Simplification;
    }
  | { kind: 'misconception'; misconception: Misconception; submittedExpression: string }
  | { kind: 'unrecognised'; submittedExpression: string };

function isReachable(transitions: PracticeQuestion['transitions'], from: string, target: string): boolean {
  return (transitions[from] ?? []).some((next) => next === target || isReachable(transitions, next, target));
}

// A reachable but non-adjacent expression is correct maths that skips the
// intermediate reasoning the question is designed to observe.
type ValidationOptions = { simplificationPending?: boolean };

export function validateStep(
  question: PracticeQuestion,
  currentExpression: string,
  input: string,
  options: ValidationOptions = {},
): ValidationResult {
  const submittedExpression = normaliseExpression(input);
  const canonicalExpression = canonicaliseEquation(submittedExpression);
  const recognition = canonicalExpression === submittedExpression ? 'exact' : 'equivalent';

  const simplification = findSimplification(submittedExpression);
  const valid = (progression: 'direct' | 'skipped'): ValidationResult => ({
    kind: 'valid',
    progression,
    recognition,
    submittedExpression,
    canonicalExpression,
    ...(simplification && { simplification }),
  });

  // Writing out the simplification the learner was just asked for restates the same equation.
  if (options.simplificationPending && canonicalExpression === currentExpression && !simplification) {
    return valid('direct');
  }

  if ((question.transitions[currentExpression] ?? []).includes(canonicalExpression)) return valid('direct');
  if (isReachable(question.transitions, currentExpression, canonicalExpression)) return valid('skipped');

  const mistake = question.knownMistakes.find(
    (known) => known.from === currentExpression && known.entered === canonicalExpression,
  );
  return mistake
    ? { kind: 'misconception', misconception: mistake.misconception, submittedExpression }
    : { kind: 'unrecognised', submittedExpression };
}
