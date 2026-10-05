import { normaliseExpression } from './normalise';
import type { PracticeQuestion } from './practiceQuestion';

export type Misconception = 'PARTIAL_DISTRIBUTION' | 'INCORRECT_INVERSE_OPERATION' | 'ARITHMETIC_ERROR';

export type ValidationResult =
  | { kind: 'valid'; progression: 'direct' | 'skipped'; canonicalExpression: string }
  | { kind: 'misconception'; misconception: Misconception }
  | { kind: 'invalid' };

function isReachable(transitions: PracticeQuestion['transitions'], from: string, target: string): boolean {
  return (transitions[from] ?? []).some((next) => next === target || isReachable(transitions, next, target));
}

// A reachable but non-adjacent expression is correct maths that skips the
// intermediate reasoning the question is designed to observe.
export function validateStep(question: PracticeQuestion, currentExpression: string, input: string): ValidationResult {
  const entered = normaliseExpression(input);

  if ((question.transitions[currentExpression] ?? []).includes(entered)) {
    return { kind: 'valid', progression: 'direct', canonicalExpression: entered };
  }
  if (isReachable(question.transitions, currentExpression, entered)) {
    return { kind: 'valid', progression: 'skipped', canonicalExpression: entered };
  }

  const mistake = question.knownMistakes.find(
    (known) => known.from === currentExpression && known.entered === entered,
  );
  return mistake ? { kind: 'misconception', misconception: mistake.misconception } : { kind: 'invalid' };
}
