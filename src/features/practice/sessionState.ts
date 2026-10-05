import { initialMasteryEstimate } from './mastery';
import { createInitialPracticeState, type PracticeState } from './practiceState';
import { practiceQuestions } from './questions';
import type { Misconception } from './validation';

export type QuestionResult = {
  questionId: string;
  genericHelpRequests: number;
  hintRequests: number;
  exampleRequests: number;
  nextStepReveals: number;
  skippedValidSteps: number;
  misconceptionCounts: Partial<Record<Misconception, number>>;
  solvedIndependently: boolean;
};

// Question state (PracticeState) is replaced for each question; this is what carries across them.
export type PracticeSessionState = {
  currentQuestionIndex: number;
  results: QuestionResult[];
  currentPractice: PracticeState;
  completed: boolean;
  masteryEstimate: number;
};

export function createInitialSession(): PracticeSessionState {
  return {
    currentQuestionIndex: 0,
    results: [],
    currentPractice: createInitialPracticeState(practiceQuestions[0]),
    completed: false,
    masteryEstimate: initialMasteryEstimate,
  };
}

// Independent means the learner reached the answer without a worked example or a revealed step. Hints don't count against it.
export function resultFromPractice(practice: PracticeState): QuestionResult {
  const { usage } = practice;
  return {
    questionId: practice.question.id,
    ...usage,
    misconceptionCounts: practice.misconceptionCounts,
    solvedIndependently: usage.exampleRequests === 0 && usage.nextStepReveals === 0,
  };
}

export type SessionSummary = {
  questionNumber: number;
  totalQuestions: number;
  questionsCompleted: number;
  independentSolutions: number;
  totalGenericHelpRequests: number;
  totalHintsRequested: number;
  totalExamplesRequested: number;
  totalNextStepReveals: number;
  totalSkippedValidSteps: number;
  misconceptionTotals: Partial<Record<Misconception, number>>;
  masteryEstimate: number;
};

export function summariseSession(session: PracticeSessionState): SessionSummary {
  const { currentPractice } = session;
  // A finished question is already in results; only an unfinished one still has live usage to add.
  const inProgress = currentPractice.completed ? [] : [currentPractice];
  const misconceptionTotals: Partial<Record<Misconception, number>> = {};
  const counts = [...session.results.map((r) => r.misconceptionCounts), ...inProgress.map((p) => p.misconceptionCounts)];
  for (const perQuestion of counts) {
    for (const [type, count] of Object.entries(perQuestion) as [Misconception, number][]) {
      misconceptionTotals[type] = (misconceptionTotals[type] ?? 0) + count;
    }
  }
  const sum = (pick: (usage: PracticeState['usage']) => number) =>
    session.results.reduce((total, result) => total + pick(result), 0) +
    inProgress.reduce((total, practice) => total + pick(practice.usage), 0);

  return {
    questionNumber: session.currentQuestionIndex + 1,
    totalQuestions: practiceQuestions.length,
    questionsCompleted: session.results.length,
    independentSolutions: session.results.filter((result) => result.solvedIndependently).length,
    totalGenericHelpRequests: sum((usage) => usage.genericHelpRequests),
    totalHintsRequested: sum((usage) => usage.hintRequests),
    totalExamplesRequested: sum((usage) => usage.exampleRequests),
    totalNextStepReveals: sum((usage) => usage.nextStepReveals),
    totalSkippedValidSteps: sum((usage) => usage.skippedValidSteps),
    misconceptionTotals,
    masteryEstimate: session.masteryEstimate,
  };
}
