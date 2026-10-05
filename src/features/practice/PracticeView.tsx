import { useReducer, useState } from 'react';
import { LearnerView } from '../learner/LearnerView';
import { feedbackForState } from './feedback';
import { helpActionLabels, helpStatus, type HelpAction } from './help';
import { learningStateFromPractice } from './inspectorState';
import { practiceQuestion } from './practiceQuestion';
import { practiceReducer, type PracticeAction } from './practiceReducer';
import { createInitialPracticeState } from './practiceState';
import { hintFor, scaffolds } from './scaffolding';

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
  const example = state.helpSource?.kind === 'misconception' ? scaffolds[state.helpSource.misconception].example : undefined;
  const showingRejection = state.rejectedExpression !== undefined;

  const workingSteps = [
    ...state.steps.map((step) => ({
      expression: step.expression,
      status: step.status,
      source: step.source,
    })),
    ...(state.rejectedExpression
      ? [
          {
            expression: state.rejectedExpression,
            status: state.lastResult?.kind === 'misconception' ? ('incorrect' as const) : ('unrecognised' as const),
          },
        ]
      : []),
  ];

  const primaryAction = state.completed
    ? { label: 'Restart question', onClick: () => act({ type: 'RESET_QUESTION' }), focusKey: focusRequest }
    : {
        label: 'Check step',
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
      hint={showingRejection && state.help.hintRequested ? hintFor(state.helpSource) : undefined}
      example={showingRejection && state.help.exampleRequested ? example : undefined}
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
      inspector={showInspector ? learningStateFromPractice(state) : undefined}
    />
  );
}
