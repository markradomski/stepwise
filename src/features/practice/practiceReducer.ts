import { helpStatus } from './help';
import { normaliseExpression } from './normalise';
import { practiceQuestion } from './practiceQuestion';
import { createInitialPracticeState, currentExpression, noHelp, type PracticeState } from './practiceState';
import { nextStepFor } from './scaffolding';
import { validateStep } from './validation';

export type PracticeAction =
  | { type: 'INPUT_CHANGED'; value: string }
  | { type: 'STEP_SUBMITTED' }
  | { type: 'HINT_REQUESTED' }
  | { type: 'EXAMPLE_REQUESTED' }
  | { type: 'NEXT_STEP_REQUESTED' }
  | { type: 'RESET_QUESTION' };

export function practiceReducer(state: PracticeState, action: PracticeAction): PracticeState {
  if (action.type === 'RESET_QUESTION') return createInitialPracticeState();
  if (state.completed) return state;

  switch (action.type) {
    case 'INPUT_CHANGED':
      return { ...state, currentInput: action.value };

    case 'STEP_SUBMITTED': {
      const input = state.currentInput.trim();
      if (input === '') return state;

      const result = validateStep(practiceQuestion, currentExpression(state), input);
      const submissions = state.submissions + 1;

      if (result.kind === 'valid' && result.progression === 'skipped') {
        return { ...state, submissions, lastResult: result, rejectedExpression: undefined };
      }

      if (result.kind === 'valid') {
        return {
          ...state,
          steps: [
            ...state.steps,
            {
              expression: input,
              canonicalExpression: result.canonicalExpression,
              status: 'accepted',
              source: 'learner',
            },
          ],
          currentInput: '',
          attemptCount: 0,
          submissions,
          activeMisconception: undefined,
          lastResult: result,
          rejectedExpression: undefined,
          help: noHelp,
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

      return {
        ...rejected,
        misconceptionCounts: {
          ...state.misconceptionCounts,
          [result.misconception]: (state.misconceptionCounts[result.misconception] ?? 0) + 1,
        },
        activeMisconception: result.misconception,
        help: state.activeMisconception === result.misconception ? state.help : noHelp,
      };
    }

    case 'HINT_REQUESTED':
      return helpStatus(state).action === 'hint' ? { ...state, help: { ...state.help, hintRequested: true } } : state;

    case 'EXAMPLE_REQUESTED':
      return helpStatus(state).action === 'example'
        ? { ...state, help: { ...state.help, exampleRequested: true } }
        : state;

    case 'NEXT_STEP_REQUESTED': {
      const next = nextStepFor(practiceQuestion, currentExpression(state));
      if (helpStatus(state).action !== 'nextStep' || !next) return state;
      return {
        ...state,
        steps: [...state.steps, { expression: next, canonicalExpression: next, status: 'accepted', source: 'system' }],
        currentInput: '',
        attemptCount: 0,
        lastResult: undefined,
        rejectedExpression: undefined,
        help: { ...state.help, nextStepRevealed: true },
        completed: next === practiceQuestion.goal,
      };
    }
  }
}
