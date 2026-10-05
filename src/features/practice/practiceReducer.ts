import { helpStatus } from './help';
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
              expression: result.submittedExpression,
              canonicalExpression: result.canonicalExpression,
              status: 'accepted',
              source: 'learner',
            },
          ],
          currentInput: '',
          attemptCount: 0,
          submissions,
          helpSource: undefined,
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
        rejectedExpression: result.submittedExpression,
      };

      if (result.kind === 'unrecognised') {
        const keepsMisconceptionHelp = state.helpSource?.kind === 'misconception';
        return {
          ...rejected,
          helpSource: keepsMisconceptionHelp
            ? state.helpSource
            : { kind: 'fallback', canonicalExpression: currentExpression(state) },
        };
      }

      const previous = state.helpSource;
      const sameMisconception = previous?.kind === 'misconception' && previous.misconception === result.misconception;
      return {
        ...rejected,
        misconceptionCounts: {
          ...state.misconceptionCounts,
          [result.misconception]: (state.misconceptionCounts[result.misconception] ?? 0) + 1,
        },
        helpSource: { kind: 'misconception', misconception: result.misconception },
        help: sameMisconception ? state.help : noHelp,
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
