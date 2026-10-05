import { useEffect, useId, useReducer, useRef, useState } from 'react';
import type { HelpSurfaceProps } from '../../components/HelpSurface/HelpSurface';
import { LearnerView } from '../learner/LearnerView';
import { feedbackForSession } from './feedback';
import {
  assistanceView,
  availabilityMessages,
  forwardActionLabels,
  reopenActionLabels,
  returnActionLabels,
  shownHelp,
  type ForwardAction,
} from './assistance';
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

  // Whether the help surface is open is presentation state; what it shows derives from the assistance model.
  const [helpOpen, setHelpOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const surfaceId = useId();

  const act = (action: SessionAction, keepHelpOpen = false) => {
    dispatch(action);
    if (!keepHelpOpen) setHelpOpen(false);
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

  const toggleHelp = () => {
    if (helpOpen) return setHelpOpen(false);
    if (view.forward === 'need-help') dispatch({ type: 'HELP_REQUESTED' });
    else if (view.shown === null && view.reopen) dispatch({ type: 'HELP_REOPENED', content: view.reopen });
    setHelpOpen(true);
  };

  const closeHelp = () => {
    setHelpOpen(false);
    launcherRef.current?.focus();
  };

  const forward = view.forward && view.forward !== 'need-help' ? view.forward : undefined;
  const viewingPrior = view.shown !== null && view.shown !== view.current;
  const heading: HelpSurfaceProps['heading'] = view.shown === 'prompt' ? 'Prompt' : view.shown === 'hint' ? 'Hint' : view.shown === 'example' ? 'Example' : 'Help';

  const showLauncher = !practice.completed && Boolean(view.forward || view.reopen || view.shown || helpOpen);
  const helpProps = showLauncher
    ? {
        launcher: { label: view.current ? 'Help' : 'Need help?', onClick: toggleHelp, ref: launcherRef },
        surface: helpOpen
          ? {
              id: surfaceId,
              heading,
              message: help?.kind === 'example' ? undefined : (help?.text ?? (forward && availabilityMessages[forward])),
              example: help?.kind === 'example' ? help.example : undefined,
              forward: forward && {
                label: forwardActionLabels[forward],
                onClick: () => act(forwardActionEvents[forward], forward !== 'show-next-step'),
              },
              prior: view.reopen && {
                label: viewingPrior ? returnActionLabels[view.current!] : reopenActionLabels[view.reopen],
                onClick: () => act({ type: 'HELP_REOPENED', content: view.reopen! }, true),
              },
              onClose: closeHelp,
            }
          : undefined,
      }
    : undefined;

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
      primaryAction={primaryAction}
      completion={completion}
      help={helpProps}
      inspector={showInspector ? learningStateFromSession(session) : undefined}
    />
  );
}
