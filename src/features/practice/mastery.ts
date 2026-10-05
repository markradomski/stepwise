import type { QuestionResult } from './sessionState';

export const initialMasteryEstimate = 0.5;

const completionGain = 0.1;
const hintPenalty = 0.02;
const examplePenalty = 0.03;
const nextStepPenalty = 0.05;
const repeatedMisconceptionPenalty = 0.02;
const skippedReasoningPenalty = 0.01;

const round = (value: number) => Math.round(value * 100) / 100;

// An illustrative signal only, not a validated assessment model: each completed
// question adds a small gain, reduced by the help it needed. Clamped to 0-1.
export function masteryAfterQuestion(previous: number, result: QuestionResult): number {
  const repeats = Object.values(result.misconceptionCounts).reduce((sum, count) => sum + Math.max(count - 1, 0), 0);
  const gain =
    completionGain -
    result.hintRequests * hintPenalty -
    result.exampleRequests * examplePenalty -
    result.nextStepReveals * nextStepPenalty -
    repeats * repeatedMisconceptionPenalty -
    result.skippedValidSteps * skippedReasoningPenalty;
  return Math.min(1, Math.max(0, round(previous + gain)));
}
