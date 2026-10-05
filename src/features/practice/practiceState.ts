import { practiceQuestion } from './practiceQuestion';
import type { Misconception, ValidationResult } from './validation';

export type StepSource = 'learner' | 'system';

export type PracticeStep = {
  expression: string;
  canonicalExpression: string;
  status: 'accepted';
  source: StepSource;
};

export type HelpState = {
  hintRequested: boolean;
  exampleRequested: boolean;
  nextStepRevealed: boolean;
};

export const noHelp: HelpState = { hintRequested: false, exampleRequested: false, nextStepRevealed: false };

export type PracticeState = {
  questionId: string;
  steps: PracticeStep[];
  currentInput: string;
  attemptCount: number;
  submissions: number;
  misconceptionCounts: Partial<Record<Misconception, number>>;
  activeMisconception?: Misconception;
  lastResult?: ValidationResult;
  rejectedExpression?: string;
  help: HelpState;
  completed: boolean;
};

export function createInitialPracticeState(): PracticeState {
  return {
    questionId: practiceQuestion.id,
    steps: [],
    currentInput: '',
    attemptCount: 0,
    submissions: 0,
    misconceptionCounts: {},
    help: noHelp,
    completed: false,
  };
}

export function currentExpression(state: PracticeState): string {
  return state.steps.at(-1)?.canonicalExpression ?? practiceQuestion.initialExpression;
}
