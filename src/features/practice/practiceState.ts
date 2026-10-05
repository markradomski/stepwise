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

export type AssistanceContent = 'prompt' | 'hint' | 'example';

export type MisconceptionSupport = { hintSeen: boolean; exampleSeen: boolean; occurrences: number };

// What has been shown for one canonical expression. Entries stay for the rest of the question,
// so progress closes help on screen without forgetting that it was used.
export type AssistanceEntry = {
  promptSeen: boolean;
  nextStepSeen: boolean;
  misconceptions: Partial<Record<Misconception, MisconceptionSupport>>;
};

export type Assistance = {
  history: Record<string, AssistanceEntry>;
  shown: AssistanceContent | null;
};

export const noAssistance: Assistance = { history: {}, shown: null };

export type QuestionUsage = {
  genericHelpRequests: number;
  hintRequests: number;
  exampleRequests: number;
  nextStepReveals: number;
  skippedValidSteps: number;
};

export const noUsage: QuestionUsage = {
  genericHelpRequests: 0,
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
  // The recognised misconception that currently governs help; cleared by progress.
  diagnosis?: Misconception;
  lastResult?: ValidationResult;
  rejectedExpression?: string;
  assistance: Assistance;
  // Explanation targets already requested in this question; a target counts once however often it is reopened.
  explained: string[];
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
    assistance: noAssistance,
    explained: [],
    usage: noUsage,
    completed: false,
  };
}

export function currentExpression(state: PracticeState): string {
  return state.steps.at(-1)?.canonicalExpression ?? state.question.initialExpression;
}
