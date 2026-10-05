import { feedbackForState } from './feedback';
import { helpStatus } from './help';
import { learningStateFromPractice } from './inspectorState';
import { practiceReducer, type PracticeAction } from './practiceReducer';
import { createInitialPracticeState, type PracticeState } from './practiceState';

const apply = (state: PracticeState, ...actions: PracticeAction[]) =>
  actions.reduce((current, action) => practiceReducer(current, action), state);

const submit = (state: PracticeState, input: string) =>
  apply(state, { type: 'INPUT_CHANGED', value: input }, { type: 'STEP_SUBMITTED' });

const run = (...inputs: string[]) => inputs.reduce(submit, createInitialPracticeState());

const requestHint = (state: PracticeState) => apply(state, { type: 'HINT_REQUESTED' });
const requestExample = (state: PracticeState) => apply(state, { type: 'EXAMPLE_REQUESTED' });
const requestNextStep = (state: PracticeState) => apply(state, { type: 'NEXT_STEP_REQUESTED' });

describe('practiceReducer', () => {
  it('appends an accepted learner step and clears the input on a valid submission', () => {
    const state = run('3x + 6 = 18');
    expect(state.steps).toEqual([
      { expression: '3x + 6 = 18', canonicalExpression: '3x + 6 = 18', status: 'accepted', source: 'learner' },
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
    expect(feedbackForState(state)?.message).toBe('Check what the 3 multiplies inside the brackets.');
  });

  it('gives generic feedback for unrecognised steps without a misconception', () => {
    const state = run('banana');
    expect(state.attemptCount).toBe(1);
    expect(state.misconceptionCounts).toEqual({});
    expect(state.activeMisconception).toBeUndefined();
    expect(state.lastResult).toEqual({ kind: 'invalid' });
    expect(feedbackForState(state)).toEqual({ kind: 'error', message: 'Have another look at that step.' });
  });

  it('uses single-level feedback for the other recognised misconceptions', () => {
    expect(feedbackForState(run('3x + 6 = 18', '3x = 24'))?.message).toBe('Check what happens when you undo the +6.');
    expect(feedbackForState(run('3x + 6 = 18', '3x = 12', 'x = 3'))?.message).toBe(
      'Check the arithmetic in your last step.',
    );
  });

  it('clears the attempt and help state when a step is accepted after errors', () => {
    const state = run('3x + 2 = 18', '3x + 6 = 18');
    expect(state.attemptCount).toBe(0);
    expect(state.activeMisconception).toBeUndefined();
    expect(state.rejectedExpression).toBeUndefined();
    expect(state.misconceptionCounts).toEqual({ PARTIAL_DISTRIBUTION: 1 });
  });

  it('ignores blank submissions', () => {
    const state = run('   ');
    expect(state.submissions).toBe(0);
    expect(state.lastResult).toBeUndefined();
  });

  it('completes the question along both valid paths', () => {
    const distribute = run('3x + 6 = 18', '3x = 12', 'x = 4');
    expect(distribute.completed).toBe(true);
    expect(distribute.steps.map((step) => step.canonicalExpression)).toEqual(['3x + 6 = 18', '3x = 12', 'x = 4']);
    expect(learningStateFromPractice(distribute).strategy).toBe('Distribution');
    expect(feedbackForState(distribute)?.kind).toBe('success');

    const divide = run('x + 2 = 6', 'x = 4');
    expect(divide.completed).toBe(true);
    expect(learningStateFromPractice(divide).strategy).toBe('Divide first');
  });

  it('does not accept further input once completed', () => {
    const state = submit(run('x + 2 = 6', 'x = 4'), '3x = 12');
    expect(state.steps).toHaveLength(2);
  });
});

describe('skipped steps', () => {
  it('acknowledges a correct final answer without accepting it or completing the question', () => {
    const state = run('x = 4');
    expect(state.steps).toHaveLength(0);
    expect(state.completed).toBe(false);
    expect(state.misconceptionCounts).toEqual({});
    expect(state.attemptCount).toBe(0);
    expect(state.rejectedExpression).toBeUndefined();
    expect(feedbackForState(state)).toEqual({
      kind: 'neutral',
      message: 'That answer is correct. Can you show one step that gets you there?',
    });
    expect(learningStateFromPractice(state).lastValidation).toBe('Valid, skipped steps');
  });

  it('lets the learner continue with a supported step afterwards', () => {
    const state = run('x = 4', 'x + 2 = 6', 'x = 4');
    expect(state.completed).toBe(true);
    expect(state.steps.map((step) => step.canonicalExpression)).toEqual(['x + 2 = 6', 'x = 4']);
  });

  it('does not offer help for a skipped step', () => {
    expect(helpStatus(run('x = 4')).level).toBe(0);
  });
});

describe('help scaffolding', () => {
  it('shows nothing before any error', () => {
    expect(helpStatus(createInitialPracticeState())).toEqual({
      hint: 'hidden',
      example: 'hidden',
      nextStep: 'hidden',
      level: 0,
    });
  });

  it('makes the hint available after the first recognised misconception', () => {
    expect(helpStatus(run('3x + 2 = 18'))).toEqual({
      hint: 'available',
      example: 'hidden',
      nextStep: 'hidden',
      level: 1,
      action: 'hint',
    });
  });

  it('makes the hint visible and the example available once the hint is requested', () => {
    const state = requestHint(run('3x + 2 = 18'));
    expect(state.help.hintRequested).toBe(true);
    expect(helpStatus(state)).toMatchObject({ hint: 'visible', example: 'available', action: 'example' });
  });

  it('makes the worked example available when the same misconception repeats', () => {
    const status = helpStatus(run('3x + 2 = 18', '3x + 2 = 18'));
    expect(status).toMatchObject({ hint: 'visible', example: 'available', nextStep: 'hidden', level: 2, action: 'example' });
    expect(learningStateFromPractice(run('3x + 2 = 18', '3x + 2 = 18')).exposure).toMatchObject({
      hint: 'visible',
      workedExample: 'available',
      nextSolutionStep: 'hidden',
      mastery: 'hidden',
    });
  });

  it('shows the example and opens the next-step reveal once the example is requested', () => {
    const state = requestExample(requestHint(run('3x + 2 = 18')));
    expect(state.help.exampleRequested).toBe(true);
    expect(helpStatus(state)).toMatchObject({
      hint: 'visible',
      example: 'visible',
      nextStep: 'available',
      level: 3,
      action: 'nextStep',
    });
  });

  it('ignores help requests that are not yet available', () => {
    const afterMistake = run('3x + 2 = 18');
    expect(requestExample(afterMistake)).toBe(afterMistake);
    expect(requestNextStep(afterMistake)).toBe(afterMistake);
    const fresh = createInitialPracticeState();
    expect(requestHint(fresh)).toBe(fresh);
  });

  it('reveals a system-authored next step that advances the current expression', () => {
    const revealed = requestNextStep(requestExample(requestHint(run('3x + 2 = 18'))));
    expect(revealed.steps).toEqual([
      { expression: '3x + 6 = 18', canonicalExpression: '3x + 6 = 18', status: 'accepted', source: 'system' },
    ]);
    expect(revealed.rejectedExpression).toBeUndefined();
    expect(revealed.currentInput).toBe('');
    expect(revealed.completed).toBe(false);
    expect(feedbackForState(revealed)).toBeUndefined();
    expect(learningStateFromPractice(revealed).exposure).toMatchObject({
      hint: 'visible',
      workedExample: 'visible',
      nextSolutionStep: 'visible',
    });

    const next = submit(revealed, '3x = 12');
    expect(next.steps.map((step) => step.source)).toEqual(['system', 'learner']);
    expect(next.activeMisconception).toBeUndefined();
    expect(Object.values(learningStateFromPractice(next).exposure)).toEqual(Array(5).fill('hidden'));
  });

  it('completes after a revealed step and learner steps', () => {
    const revealed = requestNextStep(requestExample(requestHint(run('3x + 2 = 18'))));
    expect(submit(submit(revealed, '3x = 12'), 'x = 4').completed).toBe(true);
  });

  it('does not fabricate help for an undiagnosed invalid step', () => {
    const state = run('banana');
    expect(helpStatus(state)).toMatchObject({ hint: 'hidden', example: 'hidden', nextStep: 'hidden', level: 0 });
    expect(helpStatus(state).action).toBeUndefined();
    expect(requestHint(state)).toBe(state);
  });

  it('keeps help for the diagnosed misconception after an unrecognised retry', () => {
    const state = run('3x + 2 = 18', 'banana');
    expect(helpStatus(state).action).toBe('hint');
  });

  it('offers a hint but no worked example for an arithmetic error', () => {
    const state = run('3x + 6 = 18', '3x = 12', 'x = 3');
    expect(helpStatus(state)).toMatchObject({ hint: 'available', example: 'hidden', action: 'hint' });
    expect(helpStatus(requestHint(state)).action).toBeUndefined();
  });

  it('offers an example for an incorrect inverse operation', () => {
    const state = requestHint(run('3x + 6 = 18', '3x = 24'));
    expect(helpStatus(state)).toMatchObject({ example: 'available', action: 'example' });
    const revealed = requestNextStep(requestExample(state));
    expect(revealed.steps.at(-1)).toMatchObject({ canonicalExpression: '3x = 12', source: 'system' });
  });

  it('resets everything', () => {
    const used = requestNextStep(requestExample(requestHint(run('3x + 2 = 18'))));
    expect(practiceReducer(used, { type: 'RESET_QUESTION' })).toEqual(createInitialPracticeState());
    const finished = run('x + 2 = 6', 'x = 4');
    expect(practiceReducer(finished, { type: 'RESET_QUESTION' })).toEqual(createInitialPracticeState());
  });
});

describe('inspector state', () => {
  it('reports hint level and intervention from the help state', () => {
    const levelOne = learningStateFromPractice(run('3x + 2 = 18'));
    expect(levelOne).toMatchObject({ misconception: 'Partial distribution', lastValidation: 'Misconception' });
    expect(levelOne.hintLevel).toEqual({ current: 1, max: 3 });
    expect(levelOne.exposure).toMatchObject({ hint: 'available', workedExample: 'hidden' });

    const repeated = learningStateFromPractice(run('3x + 2 = 18', '3x + 2 = 18'));
    expect(repeated.repeatedMisconceptionCount).toBe(2);
    expect(repeated.intervention).toBe('Concept reminder');
  });

  it('keeps everything hidden before any error', () => {
    const inspector = learningStateFromPractice(createInitialPracticeState());
    expect(inspector.attempt).toBe(0);
    expect(inspector.misconception).toBe('None');
    expect(inspector.lastValidation).toBe('None');
    expect(Object.values(inspector.exposure)).toEqual(Array(5).fill('hidden'));
  });
});
