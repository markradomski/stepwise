export type ExposureStatus = 'hidden' | 'visible' | 'available';

export type SessionState = {
  question: string;
  completed: number;
  independentSolutions: number;
  genericHelpRequests: number;
  hintsRequested: number;
  examplesRequested: number;
  nextStepReveals: number;
  skippedReasoning: number;
  masteryEstimate: number;
};

export type AssistanceState = {
  source: string;
  currentSupport: string;
  forwardAction: string;
  promptSeen: string;
  hintSeen: string;
  exampleSeen: string;
  nextStepSeen: string;
  repeatedDifficulty: number;
};

export type ExplanationInfo = { target: string; status: string; provider: string; requests: number };

export type LearningState = {
  concept: string;
  currentExpression?: string;
  session?: SessionState;
  strategy: string;
  attempt: number;
  questionStatus?: string;
  lastValidation?: string;
  recognition?: string;
  simplification?: string;
  submittedExpression?: string;
  canonicalExpression?: string;
  assistance?: AssistanceState;
  explanation?: ExplanationInfo;
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
