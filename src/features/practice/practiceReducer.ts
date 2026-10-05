import { assistanceView, entryFor, supportFor } from './assistance';
import {
  currentExpression,
  type AssistanceContent,
  type AssistanceEntry,
  type PracticeState,
} from './practiceState';
import { nextStepFor } from './scaffolding';
import { validateStep } from './validation';

export type PracticeAction =
  | { type: 'INPUT_CHANGED'; value: string }
  | { type: 'STEP_SUBMITTED' }
  | { type: 'HELP_REQUESTED' }
  | { type: 'HINT_REQUESTED' }
  | { type: 'EXAMPLE_REQUESTED' }
  | { type: 'NEXT_STEP_REQUESTED' }
  | { type: 'HELP_REOPENED'; content: AssistanceContent }
  | { type: 'EXPLANATION_REQUESTED'; key: string };

function withEntry(state: PracticeState, update: (entry: AssistanceEntry) => AssistanceEntry) {
  return { ...state.assistance.history, [currentExpression(state)]: update(entryFor(state)) };
}

function withSupport(state: PracticeState, update: (support: ReturnType<typeof supportFor>) => ReturnType<typeof supportFor>) {
  const diagnosis = state.diagnosis!;
  return withEntry(state, (entry) => ({
    ...entry,
    misconceptions: { ...entry.misconceptions, [diagnosis]: update(supportFor(state)) },
  }));
}

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

      // Accepted progress moves to a new canonical state: help on screen closes, the history stays.
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
          diagnosis: undefined,
          lastResult: result,
          rejectedExpression: undefined,
          assistance: { ...state.assistance, shown: null },
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

      // An unrecognised step carries no diagnosis and does not touch help.
      if (result.kind === 'unrecognised') return rejected;

      const diagnosed = { ...rejected, diagnosis: result.misconception };
      const support = supportFor(diagnosed);
      return {
        ...diagnosed,
        misconceptionCounts: {
          ...state.misconceptionCounts,
          [result.misconception]: (state.misconceptionCounts[result.misconception] ?? 0) + 1,
        },
        assistance: {
          history: withSupport(diagnosed, () => ({ ...support, occurrences: support.occurrences + 1 })),
          shown: null,
        },
      };
    }

    case 'HELP_REQUESTED':
      return assistanceView(state).forward === 'need-help'
        ? {
            ...state,
            assistance: { history: withEntry(state, (entry) => ({ ...entry, promptSeen: true })), shown: 'prompt' },
            usage: { ...state.usage, genericHelpRequests: state.usage.genericHelpRequests + 1 },
          }
        : state;

    case 'HINT_REQUESTED':
      return assistanceView(state).forward === 'get-hint'
        ? {
            ...state,
            assistance: { history: withSupport(state, (support) => ({ ...support, hintSeen: true })), shown: 'hint' },
            usage: { ...state.usage, hintRequests: state.usage.hintRequests + 1 },
          }
        : state;

    case 'EXAMPLE_REQUESTED':
      return assistanceView(state).forward === 'show-example'
        ? {
            ...state,
            assistance: { history: withSupport(state, (support) => ({ ...support, exampleSeen: true })), shown: 'example' },
            usage: { ...state.usage, exampleRequests: state.usage.exampleRequests + 1 },
          }
        : state;

    case 'NEXT_STEP_REQUESTED': {
      const next = nextStepFor(state.question, currentExpression(state));
      if (assistanceView(state).forward !== 'show-next-step' || !next) return state;
      return {
        ...state,
        steps: [...state.steps, { expression: next, canonicalExpression: next, status: 'accepted', source: 'system' }],
        currentInput: '',
        attemptCount: 0,
        diagnosis: undefined,
        lastResult: undefined,
        rejectedExpression: undefined,
        assistance: { history: withEntry(state, (entry) => ({ ...entry, nextStepSeen: true })), shown: null },
        usage: { ...state.usage, nextStepReveals: state.usage.nextStepReveals + 1 },
        completed: next === state.question.goal,
      };
    }

    // Explanations are informational: they touch nothing but this record.
    case 'EXPLANATION_REQUESTED':
      return state.explained.includes(action.key) ? state : { ...state, explained: [...state.explained, action.key] };

    // Showing help that was already seen is a view, not a request, so it does not touch the usage counts.
    case 'HELP_REOPENED':
      return assistanceView(state).reopen === action.content
        ? { ...state, assistance: { ...state.assistance, shown: action.content } }
        : state;
  }
}
