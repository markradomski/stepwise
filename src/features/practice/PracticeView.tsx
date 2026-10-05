import { useReducer, useState } from 'react';
import { LearnerView } from '../learner/LearnerView';
import { feedbackForState } from './feedback';
import { helpActionLabels, helpStatus, type HelpAction } from './help';
import { learningStateFromPractice } from './inspectorState';
import { practiceQuestion } from './practiceQuestion';
import { practiceReducer, type PracticeAction } from './practiceReducer';
import { createInitialPracticeState } from './practiceState';
import { scaffolds } from './scaffolding';

type Props = { showInspector?: boolean };

const helpActionEvents: Record<HelpAction, PracticeAction> = {
  hint: { type: 'HINT_REQUESTED' },
  example: { type: 'EXAMPLE_REQUESTED' },
  nextStep: { type: 'NEXT_STEP_REQUESTED' },
};

export function PracticeView({ showInspector }: Props) {
  const [state, dispatch] = useReducer(practiceReducer, undefined, createInitialPracticeState);
  const [focusRequest, setFocusRequest] = useState(0);

  const act = (action: PracticeAction) => {
    dispatch(action);
    setFocusRequest((count) => count + 1);
  };

  const help = helpStatus(state);
  const scaffold = state.activeMisconception && scaffolds[state.activeMisconception];
  const showingRejection = state.rejectedExpression !== undefined;

  const workingSteps = [
    ...state.steps.map((step) => ({
      expression: step.canonicalExpression,
      status: step.status,
      source: step.source,
    })),
    ...(state.rejectedExpression ? [{ expression: state.rejectedExpression, status: 'incorrect' as const }] : []),
  ];

  const primaryAction = state.completed
    ? { label: 'Restart question', onClick: () => act({ type: 'RESET_QUESTION' }), focusKey: focusRequest }
    : {
        label: showingRejection ? 'Try again' : 'Check',
        disabled: state.currentInput.trim() === '',
        onClick: () => act({ type: 'STEP_SUBMITTED' }),
      };

  const secondaryAction = help.action && {
    label: helpActionLabels[help.action],
    emphasis: help.action === 'hint' ? ('quiet' as const) : ('prominent' as const),
    onClick: () => act(helpActionEvents[help.action!]),
  };

  return (
    <LearnerView
      progress={{ current: 2, total: 3, complete: state.completed }}
      question={{ instruction: practiceQuestion.instruction, expression: practiceQuestion.initialExpression }}
      workingSteps={workingSteps}
      input={
        state.completed
          ? undefined
          : {
              value: state.currentInput,
              focusToken: focusRequest,
              onChange: (value) => dispatch({ type: 'INPUT_CHANGED', value }),
              onSubmit: () => act({ type: 'STEP_SUBMITTED' }),
            }
      }
      feedback={feedbackForState(state)}
      hint={showingRejection && state.help.hintRequested ? scaffold?.hint : undefined}
      example={showingRejection && state.help.exampleRequested ? scaffold?.example : undefined}
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
      inspector={showInspector ? learningStateFromPractice(state) : undefined}
    />
  );
}
