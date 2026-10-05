import type { LearningState } from '../../lib/learningState';
import type { PracticeState } from './practiceState';
import type { Misconception } from './validation';

const misconceptionLabels: Record<Misconception, string> = {
  PARTIAL_DISTRIBUTION: 'Partial distribution',
  INCORRECT_INVERSE_OPERATION: 'Incorrect inverse operation',
  ARITHMETIC_ERROR: 'Arithmetic error',
};

const interventions = ['None', 'Targeted prompt', 'Concept reminder'];

function strategyFor(state: PracticeState): string {
  const path = state.steps.map((step) => step.canonicalExpression);
  if (path.includes('3x + 6 = 18')) return 'Distribution';
  if (path.includes('x + 2 = 6')) return 'Divide first';
  return 'Not yet chosen';
}

export function learningStateFromPractice(state: PracticeState): LearningState {
  const detected = state.lastResult?.kind === 'misconception' ? state.lastResult.misconception : undefined;
  return {
    concept: 'Linear equations',
    strategy: strategyFor(state),
    attempt: state.attemptCount,
    misconception: detected ? misconceptionLabels[detected] : 'None',
    repeatedMisconceptionCount: detected ? (state.misconceptionCounts[detected] ?? 0) : 0,
    hintLevel: { current: state.hintLevel, max: 3 },
    masteryEstimate: 0.61,
    intervention: interventions[state.hintLevel] ?? 'None',
    exposure: {
      mastery: 'hidden',
      misconceptionLabel: 'hidden',
      nextSolutionStep: 'hidden',
      hint: state.hintLevel >= 1 ? 'visible' : 'hidden',
      workedExample: state.hintLevel >= 2 ? 'available' : 'hidden',
    },
  };
}
