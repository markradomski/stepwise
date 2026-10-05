export type ExposureStatus = 'hidden' | 'visible' | 'available';

export type SessionState = {
  question: string;
  completed: number;
  independentSolutions: number;
  hintsRequested: number;
  examplesRequested: number;
  nextStepReveals: number;
  skippedReasoning: number;
  masteryEstimate: number;
};

export type LearningState = {
  concept: string;
  currentExpression?: string;
  session?: SessionState;
  strategy: string;
  attempt: number;
  lastValidation?: string;
  recognition?: string;
  simplification?: string;
  submittedExpression?: string;
  canonicalExpression?: string;
  helpSource?: string;
  misconception: string;
  repeatedMisconceptionCount: number;
  hintLevel: { current: number; max: number };
  masteryEstimate: number;
  intervention: string;
  exposure: {
    mastery: ExposureStatus;
    misconceptionLabel: ExposureStatus;
    nextSolutionStep: ExposureStatus;
    hint: ExposureStatus;
    workedExample: ExposureStatus;
  };
};
