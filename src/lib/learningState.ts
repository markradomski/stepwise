export type ExposureStatus = 'hidden' | 'visible' | 'available';

export type LearningState = {
  concept: string;
  strategy: string;
  attempt: number;
  lastValidation?: string;
  recognition?: string;
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
