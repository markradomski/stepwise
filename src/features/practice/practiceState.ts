import type { PracticeQuestion } from './practiceQuestion';
import type { Simplification } from './equivalence';
import type { Misconception, ValidationResult } from './validation';

export type StepSource = 'learner' | 'system';

export type PracticeStep = {
  expression: string;
  canonicalExpression: string;
  status: 'accepted';
  source: StepSource;
  simplification?: Simplification;
};

// Fallback help is deliberately not a misconception: an unrecognised step carries no diagnosis.
export type HelpSource =
  | { kind: 'misconception'; misconception: Misconception }
  | { kind: 'fallback'; canonicalExpression: string };

export type HelpState = {
  hintRequested: boolean;
  exampleRequested: boolean;
  nextStepRevealed: boolean;
};

export const noHelp: HelpState = { hintRequested: false, exampleRequested: false, nextStepRevealed: false };

export type QuestionUsage = {
  hintRequests: number;
  exampleRequests: number;
  nextStepReveals: number;
  skippedValidSteps: number;
};

export const noUsage: QuestionUsage = {
  hintRequests: 0, exampleRequests: 0, nextStepReveals: 0,
  skippedValidSteps: 0,
};

// Everything about the question on screen. The session (sessionState.ts) owns what carries across questions.
export type PracticeState = {
  question: PracticeQuestion;
  steps: PracticeStep[];
  currentInput: string;
  attemptCount: number;
  submissions: number;
  misconceptionCounts: Partial<Record<Misconception, number>>;
  helpSource?: HelpSource;
  lastResult?: ValidationResult;
  rejectedExpression?: string;
  help: HelpState;
  usage: QuestionUsage;
  completed: boolean;
};

export function createInitialPracticeState(question: PracticeQuestion): PracticeState {
  return {
    question,
    steps: [],
    currentInput: '',
    attemptCount: 0,
    submissions: 0,
    misconceptionCounts: {},
    help: noHelp,
    usage: noUsage,
    completed: false,
  };
}

export function currentExpression(state: PracticeState): string {
  return state.steps.at(-1)?.canonicalExpression ?? state.question.initialExpression;
}
