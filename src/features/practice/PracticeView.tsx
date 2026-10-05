import { useReducer } from 'react';
import { LearnerView } from '../learner/LearnerView';
import { feedbackForState } from './feedback';
import { learningStateFromPractice } from './inspectorState';
import { practiceQuestion } from './practiceQuestion';
import { practiceReducer } from './practiceReducer';
import { createInitialPracticeState } from './practiceState';

type Props = { showInspector?: boolean };

export function PracticeView({ showInspector }: Props) {
  const [state, dispatch] = useReducer(practiceReducer, undefined, createInitialPracticeState);
  const submit = () => dispatch({ type: 'STEP_SUBMITTED' });

  const workingSteps = [
    ...state.steps.map((step) => ({ expression: step.canonicalExpression, status: 'accepted' as const })),
    ...(state.rejectedExpression ? [{ expression: state.rejectedExpression, status: 'incorrect' as const }] : []),
  ];

  const hintAction =
    state.lastResult?.kind === 'misconception'
      ? state.hintLevel > 1
        ? { label: 'Show an example', emphasis: 'prominent' as const }
        : { label: 'Need a hint?', emphasis: 'quiet' as const }
      : undefined;

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
              focusToken: state.submissions,
              onChange: (value) => dispatch({ type: 'INPUT_CHANGED', value }),
              onSubmit: submit,
            }
      }
      feedback={feedbackForState(state)}
      primaryAction={
        state.completed
          ? undefined
          : {
              label: state.rejectedExpression ? 'Try again' : 'Check',
              disabled: state.currentInput.trim() === '',
              onClick: submit,
            }
      }
      secondaryAction={state.completed ? undefined : hintAction}
      inspector={showInspector ? learningStateFromPractice(state) : undefined}
    />
  );
}
