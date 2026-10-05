import { feedbackForState } from './feedback';
import { assistanceView, shownHelp } from './assistance';
import { learningStateFromPractice } from './inspectorState';
import { practiceReducer, type PracticeAction } from './practiceReducer';
import { createInitialPracticeState, type PracticeState } from './practiceState';
import { practiceQuestions } from './questions';

const question1 = practiceQuestions[0];

const apply = (state: PracticeState, ...actions: PracticeAction[]) =>
  actions.reduce((current, action) => practiceReducer(current, action), state);

const submit = (state: PracticeState, input: string) =>
  apply(state, { type: 'INPUT_CHANGED', value: input }, { type: 'STEP_SUBMITTED' });

const run = (...inputs: string[]) => inputs.reduce(submit, createInitialPracticeState(question1));

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
    expect(state.lastResult).toEqual({ kind: 'unrecognised', submittedExpression: 'banana' });
    expect(state.diagnosis).toBeUndefined();
    expect(assistanceView(state).source).toBe('generic');
    expect(feedbackForState(state)).toEqual({
      kind: 'neutral',
      title: 'I can’t quite match that step yet.',
      message: 'Check whether both sides still represent the same value.',
    });
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
    expect(state.diagnosis).toBeUndefined();
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
    expect(feedbackForState(distribute)).toBeUndefined();

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
      kind: 'success',
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
    expect(run('x = 4').assistance.shown).toBeNull();
    expect(forward(run('x = 4'))).toBe('need-help');
  });
});

describe('equivalent forms', () => {
  it('stores what the learner entered and progresses from the canonical expression', () => {
    const state = run('(x+2)=18/3');
    expect(state.steps).toEqual([
      {
        expression: '(x + 2) = 18/3',
        canonicalExpression: 'x + 2 = 6',
        status: 'accepted',
        source: 'learner',
        simplification: { expression: '18/3', result: '6' },
      },
    ]);
    expect(state.misconceptionCounts).toEqual({});
    expect(state.diagnosis).toBeUndefined();
    expect(state.rejectedExpression).toBeUndefined();
    expect(feedbackForState(state)?.kind).toBe('success');
    expect(submit(state, 'x = 4').completed).toBe(true);
  });

  it('completes when the final step is an unsimplified division', () => {
    const state = run('3x + 6 = 18', '3x = 12', 'x = 12/3');
    expect(state.completed).toBe(true);
    expect(state.steps.at(-1)).toMatchObject({ expression: 'x = 12/3', canonicalExpression: 'x = 4' });
  });

  it('does not complete from an unsimplified final answer that skips steps', () => {
    const state = run('x = 12/3');
    expect(state.completed).toBe(false);
    expect(state.steps).toHaveLength(0);
    expect(feedbackForState(state)?.message).toBe('That answer is correct. Can you show one step that gets you there?');
  });
});

describe('simplification guidance', () => {
  it('asks the learner to simplify without changing the canonical state', () => {
    const state = run('x + 2 = 18/3');
    expect(state.steps[0]).toMatchObject({
      expression: 'x + 2 = 18/3',
      canonicalExpression: 'x + 2 = 6',
      simplification: { expression: '18/3', result: '6' },
    });
    expect(feedbackForState(state)).toEqual({
      kind: 'success',
      title: 'That step works.',
      message: 'Can you simplify 18/3?',
    });
    expect(state.misconceptionCounts).toEqual({});
    expect(learningStateFromPractice(state)).toMatchObject({ simplification: 'Available', recognition: 'Equivalent form' });
  });

  it('accepts the simplified line as the next step and then carries on', () => {
    const state = run('x + 2 = 18/3', 'x + 2 = 6');
    expect(state.steps.map((step) => step.expression)).toEqual(['x + 2 = 18/3', 'x + 2 = 6']);
    expect(state.steps.map((step) => step.canonicalExpression)).toEqual(['x + 2 = 6', 'x + 2 = 6']);
    expect(feedbackForState(state)).toBeUndefined();
    expect(learningStateFromPractice(state).simplification).toBeUndefined();
    expect(run('x + 2 = 18/3', 'x + 2 = 6', 'x = 4').completed).toBe(true);
  });

  it('does not accept a repeat of the same equation when nothing was left to simplify', () => {
    const state = run('3x + 6 = 18', '3x + 6 = 18');
    expect(state.steps).toHaveLength(1);
    expect(state.lastResult?.kind).toBe('unrecognised');
  });

  it('lets the learner move straight on instead of simplifying', () => {
    expect(run('x + 2 = 18/3', 'x = 4').completed).toBe(true);
  });

  it('does not hold back completion for an unsimplified final answer', () => {
    const state = run('3x + 6 = 18', '3x = 12', 'x = 12/3');
    expect(state.completed).toBe(true);
    expect(feedbackForState(state)).toBeUndefined();
  });

  it('guides a simplification of a subtraction too', () => {
    expect(feedbackForState(run('3x + 6 = 18', '3x = 18 - 6'))?.message).toBe('Can you simplify 18 - 6?');
  });
});

describe('inspector state', () => {
  it('reports hint level and intervention from the help state', () => {
    const levelOne = learningStateFromPractice(run('3x + 2 = 18'));
    expect(levelOne).toMatchObject({ misconception: 'Partial distribution', lastValidation: 'Misconception' });
    expect(levelOne.hintLevel).toEqual({ current: 0, max: 3 });
    expect(levelOne.exposure).toMatchObject({ hint: 'available', workedExample: 'hidden' });

    const repeated = learningStateFromPractice(run('3x + 2 = 18', '3x + 2 = 18'));
    expect(repeated.repeatedMisconceptionCount).toBe(2);
    expect(repeated.intervention).toBe('None');
    expect(repeated.assistance).toMatchObject({ forwardAction: 'Get a hint', repeatedDifficulty: 2 });
  });

  it('distinguishes exact, equivalent and unrecognised steps', () => {
    expect(learningStateFromPractice(run('3x + 6 = 18'))).toMatchObject({
      lastValidation: 'Valid, direct',
      recognition: 'Exact match',
      submittedExpression: undefined,
    });

    expect(learningStateFromPractice(run('(x + 2) = 18/3'))).toMatchObject({
      lastValidation: 'Valid, direct',
      recognition: 'Equivalent form',
      submittedExpression: '(x + 2) = 18/3',
      canonicalExpression: 'x + 2 = 6',
    });

    expect(learningStateFromPractice(run('6 + 3x = 18'))).toMatchObject({
      lastValidation: 'Unrecognised',
      intervention: 'None',
      recognition: undefined,
      misconception: 'None',
    });

    expect(learningStateFromPractice(run('3x + 2 = 18'))).toMatchObject({
      lastValidation: 'Misconception',
    });
  });

  it('exposes only generic help before any error', () => {
    const inspector = learningStateFromPractice(createInitialPracticeState(question1));
    expect(inspector.attempt).toBe(0);
    expect(inspector.misconception).toBe('None');
    expect(inspector.lastValidation).toBe('None');
    expect(inspector.exposure).toMatchObject({ hint: 'available', workedExample: 'hidden', nextSolutionStep: 'hidden' });
  });
});

const needHelp = (s: PracticeState) => apply(s, { type: 'HELP_REQUESTED' });
const reopen = (s: PracticeState, content: 'prompt' | 'hint' | 'example') =>
  apply(s, { type: 'HELP_REOPENED', content });
const forward = (s: PracticeState) => assistanceView(s).forward;
const mistake = '3x + 2 = 18';

describe('assistance model', () => {
  it('offers Need help? on a fresh state with nothing exposed', () => {
    const view = assistanceView(createInitialPracticeState(question1));
    expect(view.forward).toBe('need-help');
    expect(view.reopen).toBeUndefined();
    expect(view.shown).toBeNull();
  });

  it('shows a generic prompt first, then no further forward action without a diagnosis', () => {
    const state = needHelp(createInitialPracticeState(question1));
    expect(shownHelp(state)?.kind).toBe('prompt');
    expect(forward(state)).toBeUndefined();
    expect(state.usage.genericHelpRequests).toBe(1);
  });

  it('escalates hint, example, next step for one misconception', () => {
    let state = run(mistake);
    expect(forward(state)).toBe('get-hint');
    state = apply(state, { type: 'HINT_REQUESTED' });
    expect(shownHelp(state)?.kind).toBe('hint');
    expect(forward(state)).toBe('show-example');
    state = apply(state, { type: 'EXAMPLE_REQUESTED' });
    expect(shownHelp(state)?.kind).toBe('example');
    expect(forward(state)).toBe('show-next-step');
  });

  it('ignores requests that are not the current forward action', () => {
    const state = run(mistake);
    expect(apply(state, { type: 'EXAMPLE_REQUESTED' })).toEqual(state);
    expect(apply(state, { type: 'NEXT_STEP_REQUESTED' })).toEqual(state);
    expect(apply(state, { type: 'HELP_REQUESTED' })).toEqual(state);
  });

  it('does not auto-reveal on a repeated misconception before the hint', () => {
    const state = run(mistake, mistake);
    expect(state.assistance.shown).toBeNull();
    expect(forward(state)).toBe('get-hint');
    expect(assistanceView(state).repeatedDifficulty).toBe(2);
  });

  it('moves availability to the example after a hint was seen and the mistake repeats', () => {
    const state = submit(apply(run(mistake), { type: 'HINT_REQUESTED' }), mistake);
    expect(state.assistance.shown).toBeNull();
    expect(forward(state)).toBe('show-example');
    expect(assistanceView(state).reopen).toBe('hint');
  });

  it('moves availability to the next step after an example was seen and the mistake repeats', () => {
    const state = submit(apply(run(mistake), { type: 'HINT_REQUESTED' }, { type: 'EXAMPLE_REQUESTED' }), mistake);
    expect(state.assistance.shown).toBeNull();
    expect(forward(state)).toBe('show-next-step');
    expect(assistanceView(state).reopen).toBe('example');
  });

  it('treats a different misconception as a fresh diagnosis', () => {
    const state = submit(apply(run('3x + 6 = 18', mistake), { type: 'HINT_REQUESTED' }), '3x = 24');
    expect(state.diagnosis).toBe('INCORRECT_INVERSE_OPERATION');
    expect(forward(state)).toBe('get-hint');
  });

  it('never creates a misconception from an unrecognised attempt', () => {
    const state = run('banana', 'banana');
    expect(state.diagnosis).toBeUndefined();
    expect(state.misconceptionCounts).toEqual({});
    expect(forward(state)).toBe('need-help');
  });

  it('closes assistance after a next-step reveal and offers help again for the new state', () => {
    const state = apply(
      run(mistake),
      { type: 'HINT_REQUESTED' },
      { type: 'EXAMPLE_REQUESTED' },
      { type: 'NEXT_STEP_REQUESTED' },
    );
    expect(state.assistance.shown).toBeNull();
    expect(state.diagnosis).toBeUndefined();
    expect(state.usage.nextStepReveals).toBe(1);
    expect(forward(state)).toBe('need-help');
    expect(apply(state, { type: 'NEXT_STEP_REQUESTED' })).toEqual(state);
  });

  it('collapses shown help and resets availability when a valid step is accepted', () => {
    const state = submit(apply(run(mistake), { type: 'HINT_REQUESTED' }), '3x + 6 = 18');
    expect(state.assistance.shown).toBeNull();
    expect(state.diagnosis).toBeUndefined();
    expect(forward(state)).toBe('need-help');
  });

  it('reopens seen help without counting it as new usage', () => {
    const hinted = apply(run(mistake), { type: 'HINT_REQUESTED' });
    const hidden = submit(hinted, '3x + 6 = 18');
    expect(assistanceView(hidden).reopen).toBeUndefined();
    const again = submit(hinted, mistake);
    const reopened = reopen(again, 'hint');
    expect(reopened.assistance.shown).toBe('hint');
    expect(reopened.usage).toEqual(again.usage);
  });

  it('ignores reopen for content that was never seen', () => {
    const state = run(mistake);
    expect(reopen(state, 'example')).toEqual(state);
    expect(reopen(state, 'hint')).toEqual(state);
  });

  it('offers one forward action and at most one reopen action', () => {
    const state = submit(apply(run(mistake), { type: 'HINT_REQUESTED' }, { type: 'EXAMPLE_REQUESTED' }), mistake);
    const view = assistanceView(state);
    expect(view.forward).toBe('show-next-step');
    expect(view.reopen).toBe('example');
  });

  it('keeps question-level history after progress', () => {
    const state = submit(apply(run(mistake), { type: 'HINT_REQUESTED' }), '3x + 6 = 18');
    const entries = Object.values(state.assistance.history);
    expect(entries.some((e) => e.misconceptions.PARTIAL_DISTRIBUTION?.hintSeen)).toBe(true);
  });

  it('offers no forward or reopen action once complete', () => {
    const state = run('3x + 6 = 18', '3x = 12', 'x = 4');
    const view = assistanceView(state);
    expect(state.completed).toBe(true);
    expect(view.forward).toBeUndefined();
    expect(view.reopen).toBeUndefined();
  });

  it('counts each newly requested help once', () => {
    const state = apply(run(mistake), { type: 'HINT_REQUESTED' }, { type: 'EXAMPLE_REQUESTED' });
    expect(state.usage).toMatchObject({ hintRequests: 1, exampleRequests: 1, nextStepReveals: 0 });
  });
});
