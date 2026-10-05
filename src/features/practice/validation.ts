import { normaliseExpression } from './normalise';
import type { PracticeQuestion } from './practiceQuestion';

export type Misconception = 'PARTIAL_DISTRIBUTION' | 'INCORRECT_INVERSE_OPERATION' | 'ARITHMETIC_ERROR';

export type ValidationResult =
  | { kind: 'valid'; canonicalExpression: string }
  | { kind: 'misconception'; misconception: Misconception }
  | { kind: 'invalid' };

function isReachable(transitions: PracticeQuestion['transitions'], from: string, target: string): boolean {
  return (transitions[from] ?? []).some((next) => next === target || isReachable(transitions, next, target));
}

export function validateStep(question: PracticeQuestion, currentExpression: string, input: string): ValidationResult {
  const entered = normaliseExpression(input);

  if (isReachable(question.transitions, currentExpression, entered)) {
    return { kind: 'valid', canonicalExpression: entered };
  }

  const mistake = question.knownMistakes.find(
    (known) => known.from === currentExpression && known.entered === entered,
  );
  return mistake ? { kind: 'misconception', misconception: mistake.misconception } : { kind: 'invalid' };
}
