import { normaliseExpression } from './normalise';
import { practiceQuestion } from './practiceQuestion';
import { currentExpression, type PracticeState } from './practiceState';
import { validateStep } from './validation';

export type PracticeAction = { type: 'INPUT_CHANGED'; value: string } | { type: 'STEP_SUBMITTED' };

export function practiceReducer(state: PracticeState, action: PracticeAction): PracticeState {
  switch (action.type) {
    case 'INPUT_CHANGED':
      return state.completed ? state : { ...state, currentInput: action.value };

    case 'STEP_SUBMITTED': {
      const input = state.currentInput.trim();
      if (state.completed || input === '') return state;

      const result = validateStep(practiceQuestion, currentExpression(state), input);
      const submissions = state.submissions + 1;

      if (result.kind === 'valid') {
        return {
          ...state,
          steps: [
            ...state.steps,
            { expression: input, canonicalExpression: result.canonicalExpression, status: 'accepted' },
          ],
          currentInput: '',
          attemptCount: 0,
          submissions,
          lastResult: result,
          rejectedExpression: undefined,
          hintLevel: 0,
          completed: result.canonicalExpression === practiceQuestion.goal,
        };
      }

      const rejected = {
        ...state,
        attemptCount: state.attemptCount + 1,
        submissions,
        lastResult: result,
        rejectedExpression: normaliseExpression(input),
      };

      if (result.kind === 'invalid') return rejected;

      const count = (state.misconceptionCounts[result.misconception] ?? 0) + 1;
      return {
        ...rejected,
        misconceptionCounts: { ...state.misconceptionCounts, [result.misconception]: count },
        hintLevel: count > 1 ? 2 : 1,
      };
    }
  }
}
