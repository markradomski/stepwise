import { useEffect, useReducer, useRef, useState } from 'react';
import { LearnerView } from '../learner/LearnerView';
import { feedbackForSession } from './feedback';
import { assistanceView, forwardActionLabels, reopenActionLabels, shownHelp, type ForwardAction } from './assistance';
import { learningStateFromSession } from './inspectorState';
import type { PracticeAction } from './practiceReducer';
import { practiceQuestions } from './questions';
import { sessionReducer, type SessionAction } from './sessionReducer';
import { createInitialSession } from './sessionState';

type Props = { showInspector?: boolean };

const forwardActionEvents: Record<ForwardAction, PracticeAction> = {
  'need-help': { type: 'HELP_REQUESTED' },
  'get-hint': { type: 'HINT_REQUESTED' },
  'show-example': { type: 'EXAMPLE_REQUESTED' },
  'show-next-step': { type: 'NEXT_STEP_REQUESTED' },
};

export function PracticeView({ showInspector }: Props) {
  const [session, dispatch] = useReducer(sessionReducer, undefined, createInitialSession);
  const [focusRequest, setFocusRequest] = useState(0);
  const { currentPractice: practice, currentQuestionIndex } = session;
  const { question } = practice;

  const act = (action: SessionAction) => {
    dispatch(action);
    setFocusRequest((count) => count + 1);
  };

  const shownQuestionIndex = useRef(currentQuestionIndex);
  useEffect(() => {
    if (shownQuestionIndex.current === currentQuestionIndex) return;
    shownQuestionIndex.current = currentQuestionIndex;
    document.documentElement.scrollTop = 0;
  }, [currentQuestionIndex]);

  const view = assistanceView(practice);
  const help = shownHelp(practice);

  const workingSteps = [
    ...practice.steps.map((step) => ({
      expression: step.expression,
      status: step.status,
      source: step.source,
    })),
    ...(practice.rejectedExpression
      ? [
          {
            expression: practice.rejectedExpression,
            status: practice.lastResult?.kind === 'misconception' ? ('incorrect' as const) : ('unrecognised' as const),
          },
        ]
      : []),
  ];

  const completion = practice.completed
    ? session.completed
      ? {
          title: 'Practice complete',
          message: `You finished all ${practiceQuestions.length} questions.`,
          actionLabel: 'Practice again',
          onAction: () => act({ type: 'PRACTICE_AGAIN' }),
          focusKey: focusRequest,
        }
      : {
          title: 'Question complete',
          message: 'You finished this question.',
          actionLabel: 'Next question',
          onAction: () => act({ type: 'NEXT_QUESTION' }),
          focusKey: focusRequest,
        }
    : undefined;

  const primaryAction = practice.completed
    ? undefined
    : {
        label: 'Check step',
        disabled: practice.currentInput.trim() === '',
        onClick: () => act({ type: 'STEP_SUBMITTED' }),
      };

  const secondaryAction = view.forward && {
    label: forwardActionLabels[view.forward],
    onClick: () => act(forwardActionEvents[view.forward!]),
  };

  const reopenAction = view.reopen && {
    label: reopenActionLabels[view.reopen],
    onClick: () => act({ type: 'HELP_REOPENED', content: view.reopen! }),
  };

  return (
    <LearnerView
      progress={{
        currentQuestion: currentQuestionIndex + 1,
        totalQuestions: practiceQuestions.length,
      }}
      question={{ instruction: question.instruction, expression: question.initialExpression }}
      guideOpen={currentQuestionIndex === 0 && practice.steps.length === 0}
      workingSteps={workingSteps}
      input={
        practice.completed
          ? undefined
          : {
              value: practice.currentInput,
              focusToken: focusRequest,
              onChange: (value) => dispatch({ type: 'INPUT_CHANGED', value }),
              onSubmit: () => act({ type: 'STEP_SUBMITTED' }),
            }
      }
      feedback={feedbackForSession(session)}
      hint={help && help.kind !== 'example' ? help.text : undefined}
      hintTitle={help?.kind === 'prompt' ? 'Prompt' : 'Hint'}
      example={help?.kind === 'example' ? help.example : undefined}
      primaryAction={primaryAction}
      completion={completion}
      secondaryAction={secondaryAction}
      reopenAction={reopenAction}
      inspector={showInspector ? learningStateFromSession(session) : undefined}
    />
  );
}
