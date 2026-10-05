import { useEffect, useReducer, useRef, useState } from 'react';
import { LearnerView } from '../learner/LearnerView';
import { feedbackForSession } from './feedback';
import { helpActionLabels, helpStatus, type HelpAction } from './help';
import { learningStateFromSession } from './inspectorState';
import type { PracticeAction } from './practiceReducer';
import { practiceQuestions } from './questions';
import { contentFor, hintFor } from './scaffolding';
import { sessionReducer, type SessionAction } from './sessionReducer';
import { createInitialSession } from './sessionState';

type Props = { showInspector?: boolean };

const helpActionEvents: Record<HelpAction, PracticeAction> = {
  hint: { type: 'HINT_REQUESTED' },
  example: { type: 'EXAMPLE_REQUESTED' },
  nextStep: { type: 'NEXT_STEP_REQUESTED' },
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

  const help = helpStatus(practice);
  const example =
    practice.helpSource?.kind === 'misconception'
      ? contentFor(question, practice.helpSource.misconception)?.example
      : undefined;
  const showingRejection = practice.rejectedExpression !== undefined;

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

  const completedAction = session.completed
    ? { label: 'Practice again', onClick: () => act({ type: 'PRACTICE_AGAIN' }) }
    : { label: 'Next question', onClick: () => act({ type: 'NEXT_QUESTION' }) };

  const primaryAction = practice.completed
    ? { ...completedAction, focusKey: focusRequest }
    : {
        label: 'Check step',
        disabled: practice.currentInput.trim() === '',
        onClick: () => act({ type: 'STEP_SUBMITTED' }),
      };

  const secondaryAction = help.action && {
    label: helpActionLabels[help.action],
    emphasis: help.action === 'hint' ? ('quiet' as const) : ('prominent' as const),
    onClick: () => act(helpActionEvents[help.action!]),
  };

  return (
    <LearnerView
      progress={{
        currentQuestion: currentQuestionIndex + 1,
        totalQuestions: practiceQuestions.length,
        complete: practice.completed,
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
      hint={showingRejection && practice.help.hintRequested ? hintFor(question, practice.helpSource) : undefined}
      example={showingRejection && practice.help.exampleRequested ? example : undefined}
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
      inspector={showInspector ? learningStateFromSession(session) : undefined}
    />
  );
}
