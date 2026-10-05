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
  help: { type: 'HELP_REQUESTED' },
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
  const showingHelp = !practice.help.nextStepRevealed;

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

  const secondaryAction = help.action && {
    label: helpActionLabels[help.action],
    onClick: () => act(helpActionEvents[help.action!]),
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
      hint={showingHelp && practice.help.hintRequested ? hintFor(question, practice.helpSource) : undefined}
      hintTitle={practice.helpSource?.kind === 'generic' ? 'Prompt' : 'Hint'}
      example={showingHelp && practice.help.exampleRequested ? example : undefined}
      primaryAction={primaryAction}
      completion={completion}
      secondaryAction={secondaryAction}
      inspector={showInspector ? learningStateFromSession(session) : undefined}
    />
  );
}
