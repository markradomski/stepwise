import { initialMasteryEstimate, masteryAfterQuestion } from './mastery';
import type { QuestionResult } from './sessionState';

const clean: QuestionResult = {
  questionId: 'q',
  hintRequests: 0,
  exampleRequests: 0,
  nextStepReveals: 0,
  skippedValidSteps: 0,
  misconceptionCounts: {},
  solvedIndependently: true,
};

const after = (result: Partial<QuestionResult>, previous = initialMasteryEstimate) =>
  masteryAfterQuestion(previous, { ...clean, ...result });

describe('masteryAfterQuestion', () => {
  it('starts at 0.5 and rises after an independent solution', () => {
    expect(initialMasteryEstimate).toBe(0.5);
    expect(after({})).toBe(0.6);
  });

  it('gains less when a worked example was used, and less again for a revealed step', () => {
    const withExample = after({ exampleRequests: 1, solvedIndependently: false });
    const withNextStep = after({ nextStepReveals: 1, solvedIndependently: false });
    expect(withExample).toBeLessThan(after({}));
    expect(withNextStep).toBeLessThan(withExample);
  });

  it('applies a small penalty for hints, repeated misconceptions and skipped reasoning', () => {
    expect(after({ hintRequests: 1 })).toBe(0.58);
    expect(after({ skippedValidSteps: 1 })).toBe(0.59);
  });

  it('penalises repeats of a misconception but not the first occurrence', () => {
    expect(after({ misconceptionCounts: { PARTIAL_DISTRIBUTION: 1 } })).toBe(after({}));
    expect(after({ misconceptionCounts: { PARTIAL_DISTRIBUTION: 3 } })).toBe(0.56);
    expect(after({ misconceptionCounts: { PARTIAL_DISTRIBUTION: 2, ARITHMETIC_ERROR: 2 } })).toBe(0.56);
  });

  it('is deterministic', () => {
    const result = { ...clean, hintRequests: 2, misconceptionCounts: { ARITHMETIC_ERROR: 2 } };
    expect(masteryAfterQuestion(0.5, result)).toBe(masteryAfterQuestion(0.5, result));
  });

  it('stays between 0 and 1', () => {
    expect(after({}, 0.97)).toBe(1);
    expect(after({}, 1)).toBe(1);
    expect(after({ nextStepReveals: 4, exampleRequests: 3, hintRequests: 5 }, 0.05)).toBe(0);
    expect(after({}, 0)).toBe(0.1);
  });
});
