import { helpStatus } from './help';
import { currentExpression, noHelp, type PracticeState } from './practiceState';
import { nextStepFor } from './scaffolding';
import { validateStep } from './validation';

export type PracticeAction =
  | { type: 'INPUT_CHANGED'; value: string }
  | { type: 'STEP_SUBMITTED' }
  | { type: 'HINT_REQUESTED' }
  | { type: 'EXAMPLE_REQUESTED' }
  | { type: 'NEXT_STEP_REQUESTED' };

export function practiceReducer(state: PracticeState, action: PracticeAction): PracticeState {
  if (state.completed) return state;

  switch (action.type) {
    case 'INPUT_CHANGED':
      return { ...state, currentInput: action.value };

    case 'STEP_SUBMITTED': {
      const input = state.currentInput.trim();
      if (input === '') return state;

      const result = validateStep(state.question, currentExpression(state), input, {
        simplificationPending: state.steps.at(-1)?.simplification !== undefined,
      });
      const submissions = state.submissions + 1;

      if (result.kind === 'valid' && result.progression === 'skipped') {
        return {
          ...state,
          submissions,
          lastResult: result,
          rejectedExpression: undefined,
          usage: { ...state.usage, skippedValidSteps: state.usage.skippedValidSteps + 1 },
        };
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
              ...(result.simplification && { simplification: result.simplification }),
            },
          ],
          currentInput: '',
          attemptCount: 0,
          submissions,
          helpSource: undefined,
          lastResult: result,
          rejectedExpression: undefined,
          help: noHelp,
          completed: result.canonicalExpression === state.question.goal,
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
      return helpStatus(state).action === 'hint'
        ? {
            ...state,
            help: { ...state.help, hintRequested: true },
            usage: { ...state.usage, hintRequests: state.usage.hintRequests + 1 },
          }
        : state;

    case 'EXAMPLE_REQUESTED':
      return helpStatus(state).action === 'example'
        ? {
            ...state,
            help: { ...state.help, exampleRequested: true },
            usage: { ...state.usage, exampleRequests: state.usage.exampleRequests + 1 },
          }
        : state;

    case 'NEXT_STEP_REQUESTED': {
      const next = nextStepFor(state.question, currentExpression(state));
      if (helpStatus(state).action !== 'nextStep' || !next) return state;
      return {
        ...state,
        steps: [...state.steps, { expression: next, canonicalExpression: next, status: 'accepted', source: 'system' }],
        currentInput: '',
        attemptCount: 0,
        lastResult: undefined,
        rejectedExpression: undefined,
        help: { ...state.help, nextStepRevealed: true },
        usage: { ...state.usage, nextStepReveals: state.usage.nextStepReveals + 1 },
        completed: next === state.question.goal,
      };
    }
  }
}
