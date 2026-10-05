import { useEffect, useId, useMemo, useReducer, useRef, useState } from 'react';
import type { ExplainSlotProps } from '../../components/ExplanationSurface/ExplanationSurface';
import type { HelpSurfaceProps } from '../../components/HelpSurface/HelpSurface';
import { buildExplanationRequest } from '../explanation/buildExplanationRequest';
import { defaultExplanationService } from '../explanation/defaultExplanationService';
import { createExplanationService, type ResolutionMeta } from '../explanation/explanationResolver';
import { explanationTargets, targetKey } from '../explanation/explanationTargets';
import type { ExplanationProvider, ExplanationTarget } from '../explanation/explanationTypes';
import { useExplanation } from '../explanation/useExplanation';
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

type Props = {
  showInspector?: boolean;
  // Tests and fixtures may supply providers; by default the service follows server configuration.
  explanationProvider?: ExplanationProvider;
  explanationFallback?: ExplanationProvider;
};

const forwardActionEvents: Record<ForwardAction, PracticeAction> = {
  'need-help': { type: 'HELP_REQUESTED' },
  'get-hint': { type: 'HINT_REQUESTED' },
  'show-example': { type: 'EXAMPLE_REQUESTED' },
  'show-next-step': { type: 'NEXT_STEP_REQUESTED' },
};

const providerLabel = (id: string) => (id === 'llm' ? 'LLM' : id === 'deterministic' ? 'Deterministic' : id);

const reasonLabels = { timeout: 'Timeout', network: 'Network', 'invalid-output': 'Invalid output', unavailable: 'Unavailable', error: 'Error' };

function outcomeLabel(meta: ResolutionMeta): string {
  const reason = meta.reason ? ` · ${reasonLabels[meta.reason]}` : '';
  const names = { success: 'Success', 'deterministic-only': 'Deterministic only', fallback: 'Fallback', unavailable: 'Unavailable' };
  return `${names[meta.outcome]}${reason}`;
}

const targetLabels: Record<ExplanationTarget['kind'], string> = {
  misconception: 'Misconception feedback',
  hint: 'Hint',
  example: 'Example',
  'suggested-step': 'Suggested step',
  'accepted-step': 'Accepted step',
};

export function PracticeView({ showInspector, explanationProvider, explanationFallback }: Props) {
  const [session, dispatch] = useReducer(sessionReducer, undefined, createInitialSession);
  const [focusRequest, setFocusRequest] = useState(0);
  const { currentPractice: practice, currentQuestionIndex } = session;
  const { question } = practice;

  // Whether the help surface is open is presentation state; what it shows derives from the assistance model.
  const [helpOpen, setHelpOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const surfaceId = useId();
  const explanationSurfaceId = useId();
  const explanationService = useMemo(
    () =>
      explanationProvider
        ? createExplanationService({ primary: explanationProvider, fallback: explanationFallback })
        : defaultExplanationService,
    [explanationProvider, explanationFallback],
  );
  const explanation = useExplanation(explanationService);

  const act = (action: SessionAction, keepHelpOpen = false) => {
    dispatch(action);
    if (!keepHelpOpen) {
      setHelpOpen(false);
      explanation.close();
    }
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

  const explainedTarget = explanation.state.target;
  const meta = explanation.state.meta;
  const explanationInfo = {
    target: explainedTarget ? targetLabels[explainedTarget.kind] : 'None',
    status: explanation.state.status,
    attempted: meta ? providerLabel(meta.attempted) : '—',
    used: meta?.used ? providerLabel(meta.used) : '—',
    outcome: meta ? outcomeLabel(meta) : '—',
    promptVersion: meta?.promptVersion ?? '—',
    latencyMs: meta?.latencyMs,
  };
  const targets = explanationTargets(practice);
  const supported = (target?: ExplanationTarget) =>
    target && explanationService.supports(buildExplanationRequest(target, question)) ? target : undefined;

  // Anything no longer on screen (progress, new question, a different hint) takes its explanation with it.
  const visibleKeys = Object.values(targets).map(targetKey);
  useEffect(() => {
    if (explainedTarget && !visibleKeys.includes(targetKey(explainedTarget))) explanation.close();
  });

  const toggleExplanation = (target: ExplanationTarget) => {
    if (explanation.isOpen(target)) return closeExplanation();
    dispatch({ type: 'EXPLANATION_REQUESTED', key: targetKey(target) });
    void explanation.request(target, question);
  };

  const closeExplanation = () => {
    const trigger = [...document.querySelectorAll('[aria-controls]')].find(
      (element) => element.getAttribute('aria-controls') === explanationSurfaceId,
    );
    explanation.close();
    if (trigger instanceof HTMLElement) trigger.focus();
  };

  const slotFor = (target?: ExplanationTarget): ExplainSlotProps | undefined => {
    if (!target) return undefined;
    const open = explanation.isOpen(target);
    const { status, result } = explanation.state;
    return {
      action: { expanded: open, controls: explanationSurfaceId, onClick: () => toggleExplanation(target) },
      surface:
        open && status !== 'closed'
          ? {
              id: explanationSurfaceId,
              status: status === 'error' ? 'unavailable' : status,
              title: result?.title,
              body: result?.body,
              onClose: closeExplanation,
            }
          : undefined,
    };
  };

  const toggleHelp = () => {
    if (helpOpen) {
      if (explainedTarget?.kind === 'hint' || explainedTarget?.kind === 'example') explanation.close();
      return setHelpOpen(false);
    }
    if (view.forward === 'need-help') dispatch({ type: 'HELP_REQUESTED' });
    else if (view.shown === null && view.reopen) dispatch({ type: 'HELP_REOPENED', content: view.reopen });
    setHelpOpen(true);
  };

  const closeHelp = () => {
    setHelpOpen(false);
    if (explainedTarget?.kind === 'hint' || explainedTarget?.kind === 'example') explanation.close();
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
              explain: helpOpen ? slotFor(supported(targets.help)) : undefined,
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
      explain={{ feedback: slotFor(supported(targets.misconception)), step: slotFor(supported(targets.step)) }}
      inspector={showInspector ? learningStateFromSession(session, explanationInfo) : undefined}
    />
  );
}
