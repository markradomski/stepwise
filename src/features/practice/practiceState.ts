import { practiceQuestion } from './practiceQuestion';
import type { Misconception, ValidationResult } from './validation';

export type PracticeStep = {
  expression: string;
  canonicalExpression: string;
  status: 'accepted';
};

export type PracticeState = {
  questionId: string;
  steps: PracticeStep[];
  currentInput: string;
  attemptCount: number;
  submissions: number;
  misconceptionCounts: Partial<Record<Misconception, number>>;
  lastResult?: ValidationResult;
  rejectedExpression?: string;
  hintLevel: number;
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
    hintLevel: 0,
    completed: false,
  };
}

export function currentExpression(state: PracticeState): string {
  return state.steps.at(-1)?.canonicalExpression ?? practiceQuestion.initialExpression;
}
