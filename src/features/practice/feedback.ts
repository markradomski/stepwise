import type { PracticeState } from './practiceState';
import type { PracticeSessionState } from './sessionState';
import { contentFor } from './scaffolding';
import type { ValidationResult } from './validation';

export type Feedback = { kind: 'error' | 'success' | 'neutral'; title?: string; message: string };

export function feedbackForResult(result: ValidationResult, state: PracticeState): Feedback | undefined {
  if (result.kind === 'unrecognised') {
    return {
      kind: 'neutral',
      title: 'I can’t quite match that step yet.',
      message: 'Check whether both sides still represent the same value.',
    };
  }

  if (result.kind === 'valid') {
    if (result.progression === 'direct') {
      return result.simplification
        ? { kind: 'success', title: 'That step works.', message: `Can you simplify ${result.simplification.expression}?` }
        : undefined;
    }
    return {
      kind: 'success',
      message:
        result.canonicalExpression === state.question.goal
          ? 'That answer is correct. Can you show one step that gets you there?'
          : 'That step works. Can you show one step that gets you there?',
    };
  }

  const feedback = contentFor(state.question, result.misconception)?.feedback;
  if (!feedback) return { kind: 'error', title: 'Have another look', message: 'Check that step again.' };
  const repeated = (state.misconceptionCounts[result.misconception] ?? 0) > 1;
  return { kind: 'error', title: 'Have another look', message: (repeated && feedback.repeated) || feedback.first };
}

export function feedbackForState(state: PracticeState): Feedback | undefined {
  if (state.completed) return undefined;
  return state.lastResult ? feedbackForResult(state.lastResult, state) : undefined;
}

export function feedbackForSession(session: PracticeSessionState): Feedback | undefined {
  return feedbackForState(session.currentPractice);
}
