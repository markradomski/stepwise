import { feedbackForState } from './feedback';
import { learningStateFromPractice } from './inspectorState';
import { practiceReducer, type PracticeAction } from './practiceReducer';
import { createInitialPracticeState, type PracticeState } from './practiceState';

const submit = (state: PracticeState, input: string) =>
  [{ type: 'INPUT_CHANGED', value: input }, { type: 'STEP_SUBMITTED' }].reduce(
    (current, action) => practiceReducer(current, action as PracticeAction),
    state,
  );

const run = (...inputs: string[]) => inputs.reduce(submit, createInitialPracticeState());

describe('practiceReducer', () => {
  it('appends an accepted step and clears the input on a valid submission', () => {
    const state = run('3x + 6 = 18');
    expect(state.steps).toEqual([
      { expression: '3x + 6 = 18', canonicalExpression: '3x + 6 = 18', status: 'accepted' },
    ]);
    expect(state.currentInput).toBe('');
    expect(state.rejectedExpression).toBeUndefined();
    expect(state.misconceptionCounts).toEqual({});
    expect(feedbackForState(state)).toBeUndefined();
  });

  it('records the first partial distribution error with first-level feedback', () => {
    const state = run('3x + 2 = 18');
    expect(state.steps).toHaveLength(0);
    expect(state.attemptCount).toBe(1);
    expect(state.misconceptionCounts).toEqual({ PARTIAL_DISTRIBUTION: 1 });
    expect(state.rejectedExpression).toBe('3x + 2 = 18');
    expect(state.currentInput).toBe('3x + 2 = 18');
    expect(state.hintLevel).toBe(1);
    expect(feedbackForState(state)?.message).toBe('Check what the 3 multiplies inside the brackets.');
  });

  it('gives stronger feedback and a worked example when the error repeats', () => {
    const state = run('3x + 2 = 18', '3x + 2 = 18');
    expect(state.attemptCount).toBe(2);
    expect(state.misconceptionCounts).toEqual({ PARTIAL_DISTRIBUTION: 2 });
    expect(state.hintLevel).toBe(2);
    expect(feedbackForState(state)?.message).toBe(
      'Remember: the number outside the brackets multiplies every term inside.',
    );
    const inspector = learningStateFromPractice(state);
    expect(inspector.repeatedMisconceptionCount).toBe(2);
    expect(inspector.exposure).toMatchObject({ hint: 'visible', workedExample: 'available', mastery: 'hidden' });
  });

  it('exposes only the hint after a first misconception', () => {
    const inspector = learningStateFromPractice(run('3x + 2 = 18'));
    expect(inspector.exposure).toMatchObject({ hint: 'visible', workedExample: 'hidden' });
    expect(inspector.misconception).toBe('Partial distribution');
  });

  it('keeps everything hidden before any error', () => {
    const inspector = learningStateFromPractice(createInitialPracticeState());
    expect(inspector.attempt).toBe(0);
    expect(inspector.misconception).toBe('None');
    expect(Object.values(inspector.exposure)).toEqual(Array(5).fill('hidden'));
  });

  it('gives generic feedback for unrecognised steps without a misconception', () => {
    const state = run('banana');
    expect(state.attemptCount).toBe(1);
    expect(state.misconceptionCounts).toEqual({});
    expect(state.hintLevel).toBe(0);
    expect(state.lastResult).toEqual({ kind: 'invalid' });
    expect(feedbackForState(state)).toEqual({ kind: 'error', message: 'Have another look at that step.' });
  });

  it('uses single-level feedback for the other recognised misconceptions', () => {
    expect(feedbackForState(run('3x + 6 = 18', '3x = 24'))?.message).toBe('Check what happens when you undo the +6.');
    expect(feedbackForState(run('3x + 6 = 18', '3x = 12', 'x = 3'))?.message).toBe(
      'Check the arithmetic in your last step.',
    );
  });

  it('clears the attempt state when a step is accepted after errors', () => {
    const state = run('3x + 2 = 18', '3x + 6 = 18');
    expect(state.attemptCount).toBe(0);
    expect(state.hintLevel).toBe(0);
    expect(state.rejectedExpression).toBeUndefined();
    expect(state.misconceptionCounts).toEqual({ PARTIAL_DISTRIBUTION: 1 });
  });

  it('ignores blank submissions', () => {
    const state = run('   ');
    expect(state.submissions).toBe(0);
    expect(state.lastResult).toBeUndefined();
  });

  it('completes the question along the distribution path', () => {
    const state = run('3x + 6 = 18', '3x = 12', 'x = 4');
    expect(state.completed).toBe(true);
    expect(state.steps.map((step) => step.canonicalExpression)).toEqual(['3x + 6 = 18', '3x = 12', 'x = 4']);
    expect(learningStateFromPractice(state).strategy).toBe('Distribution');
    expect(feedbackForState(state)?.kind).toBe('success');
  });

  it('completes the question along the divide-first path', () => {
    const state = run('x + 2 = 6', 'x = 4');
    expect(state.completed).toBe(true);
    expect(state.steps).toHaveLength(2);
    expect(learningStateFromPractice(state).strategy).toBe('Divide first');
  });

  it('does not accept further input once completed', () => {
    const state = submit(run('x + 2 = 6', 'x = 4'), '3x = 12');
    expect(state.steps).toHaveLength(2);
  });
});
