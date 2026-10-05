import { practiceQuestions } from './questions';
import { sessionReducer, type SessionAction } from './sessionReducer';
import { createInitialSession, summariseSession, type PracticeSessionState } from './sessionState';

const apply = (state: PracticeSessionState, ...actions: SessionAction[]) =>
  actions.reduce((current, action) => sessionReducer(current, action), state);

const submit = (state: PracticeSessionState, input: string) =>
  apply(state, { type: 'INPUT_CHANGED', value: input }, { type: 'STEP_SUBMITTED' });

const enter = (state: PracticeSessionState, ...inputs: string[]) => inputs.reduce(submit, state);

const solveQuestion1 = (state: PracticeSessionState) => enter(state, 'x + 2 = 6', 'x = 4');
const solveQuestion2 = (state: PracticeSessionState) => enter(state, '2x = 12', 'x = 6');
const solveQuestion3 = (state: PracticeSessionState) => enter(state, 'x - 1 = 5', 'x = 6');
const next = (state: PracticeSessionState) => apply(state, { type: 'NEXT_QUESTION' });

const fullSession = () => solveQuestion3(next(solveQuestion2(next(solveQuestion1(createInitialSession())))));

describe('session reducer', () => {
  it('starts at the first question with a fresh state', () => {
    const session = createInitialSession();
    expect(session.currentQuestionIndex).toBe(0);
    expect(session.currentPractice.question).toBe(practiceQuestions[0]);
    expect(session.results).toEqual([]);
    expect(session.completed).toBe(false);
    expect(session.masteryEstimate).toBe(0.5);
  });

  it('does not advance when a question completes, and ignores Next question before then', () => {
    const early = next(createInitialSession());
    expect(early.currentQuestionIndex).toBe(0);
    const done = solveQuestion1(createInitialSession());
    expect(done.currentPractice.completed).toBe(true);
    expect(done.currentQuestionIndex).toBe(0);
    expect(done.completed).toBe(false);
    expect(done.results).toHaveLength(1);
  });

  it('advances to question 2 and resets the per-question state', () => {
    const before = enter(solveQuestion1(createInitialSession()));
    const advanced = next(before);
    expect(advanced.currentQuestionIndex).toBe(1);
    expect(advanced.currentPractice.question).toBe(practiceQuestions[1]);
    expect(advanced.currentPractice).toMatchObject({
      steps: [],
      currentInput: '',
      misconceptionCounts: {},
      completed: false,
    });
    expect(advanced.currentPractice.rejectedExpression).toBeUndefined();
    expect(advanced.currentPractice.help).toEqual({ hintRequested: false, exampleRequested: false, nextStepRevealed: false });
    expect(advanced.currentPractice.usage).toEqual({
      genericHelpRequests: 0,
      hintRequests: 0,
      exampleRequests: 0,
      nextStepReveals: 0,
      skippedValidSteps: 0,
    });
  });

  it('keeps session metrics across questions', () => {
    const advanced = next(solveQuestion1(createInitialSession()));
    expect(advanced.results).toHaveLength(1);
    expect(advanced.masteryEstimate).toBe(0.6);
    expect(summariseSession(advanced)).toMatchObject({ questionNumber: 2, questionsCompleted: 1, independentSolutions: 1 });
  });

  it('moves from question 2 to question 3, and completes the session after question 3', () => {
    const atThree = next(solveQuestion2(next(solveQuestion1(createInitialSession()))));
    expect(atThree.currentQuestionIndex).toBe(2);
    expect(atThree.currentPractice.question).toBe(practiceQuestions[2]);
    expect(atThree.completed).toBe(false);

    const done = solveQuestion3(atThree);
    expect(done.completed).toBe(true);
    expect(done.results).toHaveLength(3);
    expect(next(done)).toBe(done);
  });

  it('resets everything with Practice again, but only once the session is complete', () => {
    const midway = solveQuestion1(createInitialSession());
    expect(apply(midway, { type: 'PRACTICE_AGAIN' })).toBe(midway);

    const restarted = apply(fullSession(), { type: 'PRACTICE_AGAIN' });
    expect(restarted).toEqual(createInitialSession());
  });

  it('accumulates help use across questions', () => {
    let session = enter(createInitialSession(), '3x + 2 = 18');
    session = apply(session, { type: 'HINT_REQUESTED' });
    session = enter(session, 'x + 2 = 6', 'x = 4');
    session = enter(next(session), '2x + 5 = 17', '2x = 22');
    session = apply(session, { type: 'HINT_REQUESTED' }, { type: 'EXAMPLE_REQUESTED' }, { type: 'NEXT_STEP_REQUESTED' });
    expect(summariseSession(session)).toMatchObject({
      totalHintsRequested: 2,
      totalExamplesRequested: 1,
      totalNextStepReveals: 1,
    });
  });

  it('includes live usage in the summary without counting a finished question twice', () => {
    let session = enter(createInitialSession(), '3x + 2 = 18');
    session = apply(session, { type: 'HINT_REQUESTED' });
    expect(summariseSession(session).totalHintsRequested).toBe(1);
    expect(summariseSession(session).questionsCompleted).toBe(0);
    session = enter(session, 'x + 2 = 6', 'x = 4');
    expect(summariseSession(session).totalHintsRequested).toBe(1);
    expect(summariseSession(next(session)).totalHintsRequested).toBe(1);
  });

  it('accumulates generic help separately from hints, and resets the help state for each question', () => {
    let session = apply(createInitialSession(), { type: 'HELP_REQUESTED' });
    expect(session.currentPractice.help.hintRequested).toBe(true);
    session = enter(session, 'x + 2 = 6', 'x = 4');
    session = next(session);
    expect(session.currentPractice.help.hintRequested).toBe(false);
    expect(session.currentPractice.helpSource).toBeUndefined();
    session = apply(session, { type: 'HELP_REQUESTED' });
    expect(summariseSession(session)).toMatchObject({
      totalGenericHelpRequests: 2,
      totalHintsRequested: 0,
    });
    session = enter(session, '2x = 12', 'x = 6');
    expect(summariseSession(next(session)).totalGenericHelpRequests).toBe(2);
  });

  it('does not penalise generic help in the mastery estimate', () => {
    const helped = enter(apply(createInitialSession(), { type: 'HELP_REQUESTED' }), 'x + 2 = 6', 'x = 4');
    expect(helped.masteryEstimate).toBe(solveQuestion1(createInitialSession()).masteryEstimate);
    expect(helped.results[0].solvedIndependently).toBe(true);
  });

  it('accumulates misconception counts by type', () => {
    let session = enter(createInitialSession(), '3x + 2 = 18', '3x + 2 = 18', 'x + 2 = 6', 'x = 4');
    session = enter(next(session), '2x + 5 = 17', '2x = 22');
    expect(summariseSession(session).misconceptionTotals).toEqual({
      PARTIAL_DISTRIBUTION: 2,
      INCORRECT_INVERSE_OPERATION: 1,
    });
  });

  it('accumulates skipped reasoning', () => {
    let session = enter(createInitialSession(), 'x = 4', 'x + 2 = 6', 'x = 4');
    expect(session.results[0].skippedValidSteps).toBe(1);
    session = enter(next(session), 'x = 6', '2x = 12', 'x = 6');
    expect(summariseSession(session).totalSkippedValidSteps).toBe(2);
  });

  it('counts a question as independent unless an example or a revealed step was used; hints alone still count', () => {
    let hinted = enter(createInitialSession(), '3x + 2 = 18');
    hinted = apply(hinted, { type: 'HINT_REQUESTED' });
    expect(solveQuestion1(hinted).results[0].solvedIndependently).toBe(true);

    let withExample = enter(createInitialSession(), '3x + 2 = 18');
    withExample = apply(withExample, { type: 'HINT_REQUESTED' }, { type: 'EXAMPLE_REQUESTED' });
    expect(solveQuestion1(withExample).results[0].solvedIndependently).toBe(false);

    let revealed = enter(createInitialSession(), '3x + 2 = 18');
    revealed = apply(revealed, { type: 'HINT_REQUESTED' }, { type: 'EXAMPLE_REQUESTED' }, { type: 'NEXT_STEP_REQUESTED' });
    revealed = enter(revealed, '3x = 12', 'x = 4');
    expect(revealed.results[0].solvedIndependently).toBe(false);
    expect(summariseSession(revealed).independentSolutions).toBe(0);
  });

  it('updates the mastery estimate after each completed question', () => {
    const one = solveQuestion1(createInitialSession());
    const two = solveQuestion2(next(one));
    const three = solveQuestion3(next(two));
    expect([one.masteryEstimate, two.masteryEstimate, three.masteryEstimate]).toEqual([0.6, 0.7, 0.8]);
  });

  it('gives a helped session a lower estimate than a clean one', () => {
    let helped = enter(createInitialSession(), '3x + 2 = 18', '3x + 2 = 18');
    helped = apply(helped, { type: 'EXAMPLE_REQUESTED' }, { type: 'NEXT_STEP_REQUESTED' });
    helped = enter(helped, '3x = 12', 'x = 4');
    expect(helped.masteryEstimate).toBeLessThan(solveQuestion1(createInitialSession()).masteryEstimate);
  });

  it('keeps the estimate within 0 and 1', () => {
    const session = { ...createInitialSession(), masteryEstimate: 0.99 };
    expect(solveQuestion1(session).masteryEstimate).toBe(1);
    const low = { ...createInitialSession(), masteryEstimate: 0 };
    expect(solveQuestion1(low).masteryEstimate).toBeGreaterThanOrEqual(0);
  });

  it('does not let the next question inherit rejected work or help', () => {
    let session = enter(createInitialSession(), '3x + 2 = 18');
    session = apply(session, { type: 'HINT_REQUESTED' });
    session = next(enter(session, 'x + 2 = 6', 'x = 4'));
    expect(session.currentPractice.rejectedExpression).toBeUndefined();
    expect(session.currentPractice.helpSource).toBeUndefined();
    expect(session.currentPractice.misconceptionCounts).toEqual({});
  });
});
