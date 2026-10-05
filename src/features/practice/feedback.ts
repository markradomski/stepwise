import type { PracticeState } from './practiceState';
import type { Misconception, ValidationResult } from './validation';

export type Feedback = { kind: 'error' | 'success'; title?: string; message: string };

const misconceptionCopy: Record<Misconception, { first: string; repeated?: string }> = {
  PARTIAL_DISTRIBUTION: {
    first: 'Check what the 3 multiplies inside the brackets.',
    repeated: 'Remember: the number outside the brackets multiplies every term inside.',
  },
  INCORRECT_INVERSE_OPERATION: { first: 'Check what happens when you undo the +6.' },
  ARITHMETIC_ERROR: { first: 'Check the arithmetic in your last step.' },
};

export function feedbackForResult(result: ValidationResult, state: PracticeState): Feedback | undefined {
  if (result.kind === 'valid') return undefined;
  if (result.kind === 'invalid') return { kind: 'error', message: 'Have another look at that step.' };

  const copy = misconceptionCopy[result.misconception];
  const repeated = (state.misconceptionCounts[result.misconception] ?? 0) > 1;
  return { kind: 'error', title: 'Have another look', message: (repeated && copy.repeated) || copy.first };
}

export function feedbackForState(state: PracticeState): Feedback | undefined {
  if (state.completed) return { kind: 'success', title: 'Solved', message: 'x = 4 makes both sides equal 18.' };
  return state.lastResult ? feedbackForResult(state.lastResult, state) : undefined;
}
