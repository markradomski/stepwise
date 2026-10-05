import type { LearningState } from '../../lib/learningState';
import { helpStatus } from './help';
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

function helpSourceLabel(state: PracticeState): string {
  if (!state.helpSource) return 'None';
  return state.helpSource.kind === 'misconception' ? 'Misconception' : 'Generic';
}

export function learningStateFromPractice(state: PracticeState): LearningState {
  const detected = state.lastResult?.kind === 'misconception' ? state.lastResult.misconception : undefined;
  const help = helpStatus(state);
  const valid = state.lastResult?.kind === 'valid' ? state.lastResult : undefined;
  const equivalent = valid?.recognition === 'equivalent';
  return {
    concept: 'Linear equations',
    currentExpression: currentExpression(state),
    strategy: strategyFor(state),
    attempt: state.attemptCount,
    lastValidation: validationLabel(state.lastResult),
    recognition: valid && (equivalent ? 'Equivalent form' : 'Exact match'),
    simplification: valid?.simplification ? 'Available' : undefined,
    submittedExpression: equivalent ? valid.submittedExpression : undefined,
    canonicalExpression: equivalent ? valid.canonicalExpression : undefined,
    helpSource: helpSourceLabel(state),
    misconception: detected ? misconceptionLabels[detected] : 'None',
    repeatedMisconceptionCount: detected ? (state.misconceptionCounts[detected] ?? 0) : 0,
    hintLevel: { current: help.level, max: 3 },
    masteryEstimate: 0.61,
    intervention: state.helpSource?.kind === 'fallback' ? 'Generic prompt' : interventions[help.level],
    exposure: {
      mastery: 'hidden',
      misconceptionLabel: 'hidden',
      nextSolutionStep: help.nextStep,
      hint: help.hint,
      workedExample: help.example,
    },
  };
}

export function learningStateFromSession(session: PracticeSessionState): LearningState {
  const summary = summariseSession(session);
  return {
    ...learningStateFromPractice(session.currentPractice),
    masteryEstimate: summary.masteryEstimate,
    session: {
      question: `${summary.questionNumber} / ${summary.totalQuestions}`,
      completed: summary.questionsCompleted,
      independentSolutions: summary.independentSolutions,
      hintsRequested: summary.totalHintsRequested,
      examplesRequested: summary.totalExamplesRequested,
      nextStepReveals: summary.totalNextStepReveals,
      skippedReasoning: summary.totalSkippedValidSteps,
      masteryEstimate: summary.masteryEstimate,
    },
  };
}
