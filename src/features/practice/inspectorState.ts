import type { LearningState } from '../../lib/learningState';
import { assistanceView, currentSupport, forwardActionLabels } from './assistance';
import { currentExpression, type PracticeState } from './practiceState';
import { summariseSession, type PracticeSessionState } from './sessionState';
import type { Misconception, ValidationResult } from './validation';

const misconceptionLabels: Record<Misconception, string> = {
  PARTIAL_DISTRIBUTION: 'Partial distribution',
  INCORRECT_INVERSE_OPERATION: 'Incorrect inverse operation',
  ARITHMETIC_ERROR: 'Arithmetic error',
};

const interventions = ['None', 'Targeted prompt', 'Concept reminder', 'Guided step'];

function strategyFor(state: PracticeState): string {
  const chosen = state.steps.find((step) => state.question.strategies[step.canonicalExpression]);
  return chosen ? state.question.strategies[chosen.canonicalExpression] : 'Not yet chosen';
}

function validationLabel(result?: ValidationResult): string {
  if (!result) return 'None';
  if (result.kind === 'valid') return result.progression === 'direct' ? 'Valid, direct' : 'Valid, skipped steps';
  return result.kind === 'misconception' ? 'Misconception' : 'Unrecognised';
}

export function learningStateFromPractice(state: PracticeState): LearningState {
  const detected = state.lastResult?.kind === 'misconception' ? state.lastResult.misconception : undefined;
  const view = assistanceView(state);
  const level = view.shown === 'example' ? 3 : view.shown === 'hint' ? 2 : view.shown === 'prompt' ? 1 : 0;
  const valid = state.lastResult?.kind === 'valid' ? state.lastResult : undefined;
  const equivalent = valid?.recognition === 'equivalent';
  return {
    concept: 'Linear equations',
    currentExpression: currentExpression(state),
    questionStatus: state.completed ? 'Complete' : 'In progress',
    strategy: strategyFor(state),
    attempt: state.attemptCount,
    lastValidation: validationLabel(state.lastResult),
    recognition: valid && (equivalent ? 'Equivalent form' : 'Exact match'),
    simplification: valid?.simplification ? 'Available' : undefined,
    submittedExpression: equivalent ? valid.submittedExpression : undefined,
    canonicalExpression: equivalent ? valid.canonicalExpression : undefined,
    assistance: {
      source: view.source === 'misconception' ? 'Misconception' : view.source === 'generic' ? 'Generic' : 'None',
      currentSupport: currentSupport(view),
      forwardAction: view.forward ? forwardActionLabels[view.forward] : 'None',
      promptSeen: view.promptSeen ? 'Yes' : 'No',
      hintSeen: view.hintSeen ? 'Yes' : 'No',
      exampleSeen: view.exampleSeen ? 'Yes' : 'No',
      nextStepSeen: view.nextStepSeen ? 'Yes' : 'No',
      repeatedDifficulty: view.repeatedDifficulty,
    },
    misconception: detected ? misconceptionLabels[detected] : 'None',
    repeatedMisconceptionCount: detected ? (state.misconceptionCounts[detected] ?? 0) : 0,
    hintLevel: { current: level, max: 3 },
    masteryEstimate: 0.61,
    intervention: view.source === 'generic' && view.shown === 'prompt' ? 'Generic prompt' : interventions[level],
    exposure: {
      mastery: 'hidden',
      misconceptionLabel: 'hidden',
      nextSolutionStep: view.nextStep,
      hint: view.hint,
      workedExample: view.example,
    },
  };
}

export type ExplanationSnapshot = Omit<NonNullable<LearningState['explanation']>, 'requests'>;

export function learningStateFromSession(session: PracticeSessionState, explanation?: ExplanationSnapshot): LearningState {
  const summary = summariseSession(session);
  return {
    ...learningStateFromPractice(session.currentPractice),
    explanation: explanation && { ...explanation, requests: summary.totalExplanationsRequested },
    masteryEstimate: summary.masteryEstimate,
    session: {
      question: `${summary.questionNumber} / ${summary.totalQuestions}`,
      completed: summary.questionsCompleted,
      independentSolutions: summary.independentSolutions,
      genericHelpRequests: summary.totalGenericHelpRequests,
      hintsRequested: summary.totalHintsRequested,
      examplesRequested: summary.totalExamplesRequested,
      nextStepReveals: summary.totalNextStepReveals,
      skippedReasoning: summary.totalSkippedValidSteps,
      masteryEstimate: summary.masteryEstimate,
    },
  };
}
