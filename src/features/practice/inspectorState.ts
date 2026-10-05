import type { LearningState } from '../../lib/learningState';
import { helpStatus } from './help';
import type { PracticeState } from './practiceState';
import type { Misconception, ValidationResult } from './validation';

const misconceptionLabels: Record<Misconception, string> = {
  PARTIAL_DISTRIBUTION: 'Partial distribution',
  INCORRECT_INVERSE_OPERATION: 'Incorrect inverse operation',
  ARITHMETIC_ERROR: 'Arithmetic error',
};

const interventions = ['None', 'Targeted prompt', 'Concept reminder', 'Guided step'];

function strategyFor(state: PracticeState): string {
  const path = state.steps.map((step) => step.canonicalExpression);
  if (path.includes('3x + 6 = 18')) return 'Distribution';
  if (path.includes('x + 2 = 6')) return 'Divide first';
  return 'Not yet chosen';
}

function validationLabel(result?: ValidationResult): string {
  if (!result) return 'None';
  if (result.kind === 'valid') return result.progression === 'direct' ? 'Valid, direct' : 'Valid, skipped steps';
  return result.kind === 'misconception' ? 'Misconception' : 'Not recognised';
}

export function learningStateFromPractice(state: PracticeState): LearningState {
  const detected = state.lastResult?.kind === 'misconception' ? state.lastResult.misconception : undefined;
  const help = helpStatus(state);
  return {
    concept: 'Linear equations',
    strategy: strategyFor(state),
    attempt: state.attemptCount,
    lastValidation: validationLabel(state.lastResult),
    misconception: detected ? misconceptionLabels[detected] : 'None',
    repeatedMisconceptionCount: detected ? (state.misconceptionCounts[detected] ?? 0) : 0,
    hintLevel: { current: help.level, max: 3 },
    masteryEstimate: 0.61,
    intervention: interventions[help.level],
    exposure: {
      mastery: 'hidden',
      misconceptionLabel: 'hidden',
      nextSolutionStep: help.nextStep,
      hint: help.hint,
      workedExample: help.example,
    },
  };
}
