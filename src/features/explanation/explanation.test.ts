import { buildExplanationRequest } from './buildExplanationRequest';
import { deterministicExplanationProvider as provider } from './deterministicExplanationProvider';
import { OUTPUT_VERSION, REQUEST_VERSION, type ExplanationRequest, type ExplanationTarget } from './explanationTypes';
import { validateExplanationResult } from './validateExplanation';
import { practiceQuestions } from '../practice/questions';

const [q1, q2] = practiceQuestions;

const misconceptionTarget: ExplanationTarget = {
  kind: 'misconception',
  questionId: q1.id,
  expression: '3(x + 2) = 18',
  misconceptionId: 'PARTIAL_DISTRIBUTION',
  learnerExpression: '3x + 2 = 18',
};
const acceptedTarget: ExplanationTarget = {
  kind: 'accepted-step',
  questionId: q2.id,
  previousExpression: '2x + 5 = 17',
  submittedExpression: '2x = 17 - 5',
  canonicalExpression: '2x = 12',
};
const suggestedTarget: ExplanationTarget = {
  kind: 'suggested-step',
  questionId: q1.id,
  fromExpression: '3(x + 2) = 18',
  suggestedExpression: 'x + 2 = 6',
};

const explain = async (request: ExplanationRequest) => provider.explain(request);

describe('explanation request builder', () => {
  it('builds a misconception request from the target and the question content', () => {
    expect(buildExplanationRequest(misconceptionTarget, q1)).toEqual({
      version: 'explanation-request/1',
      questionId: 'linear-3-bracket',
      targetKind: 'misconception',
      currentExpression: '3(x + 2) = 18',
      learnerExpression: '3x + 2 = 18',
      misconceptionId: 'PARTIAL_DISTRIBUTION',
      deterministicLabel: 'Feedback',
      deterministicContent: 'Check what the 3 multiplies inside the brackets.',
    });
  });

  it('keeps both the learner’s expression and the canonical one for an accepted step', () => {
    const request = buildExplanationRequest(acceptedTarget, q2);
    expect(request).toMatchObject({
      targetKind: 'accepted-step',
      currentExpression: '2x + 5 = 17',
      learnerExpression: '2x = 17 - 5',
      canonicalExpression: '2x = 12',
    });
  });

  it('carries the from and to expressions of a suggested step', () => {
    expect(buildExplanationRequest(suggestedTarget, q1)).toMatchObject({
      targetKind: 'suggested-step',
      currentExpression: '3(x + 2) = 18',
      canonicalExpression: 'x + 2 = 6',
    });
  });

  it('uses the current request version', () => {
    expect(buildExplanationRequest(suggestedTarget, q1).version).toBe(REQUEST_VERSION);
  });

  it.each([misconceptionTarget, acceptedTarget, suggestedTarget])(
    'contains no mastery, session analytics or unrelated attempts ($kind)',
    (target) => {
      const request = buildExplanationRequest(target, q1);
      const serialised = JSON.stringify(request);
      expect(serialised).not.toMatch(/mastery|session|attempt|count|usage|history|inspector/i);
      const allowed = [
        'version',
        'questionId',
        'targetKind',
        'currentExpression',
        'learnerExpression',
        'canonicalExpression',
        'misconceptionId',
        'deterministicLabel',
        'deterministicContent',
      ];
      expect(Object.keys(request).every((key) => allowed.includes(key))).toBe(true);
    },
  );
});

describe('validateExplanationResult', () => {
  const valid = { version: OUTPUT_VERSION, title: 'Why that step works', body: 'Subtracting keeps balance.' };

  it('accepts valid output, with or without an example', () => {
    expect(validateExplanationResult(valid)).toEqual({ ok: true, value: valid });
    expect(validateExplanationResult({ ...valid, example: 'y + 2 = 5' }).ok).toBe(true);
  });

  it('rejects the wrong version', () => {
    expect(validateExplanationResult({ ...valid, version: 'explanation-output/2' }).ok).toBe(false);
  });

  it('rejects a missing title and an empty body', () => {
    expect(validateExplanationResult({ version: OUTPUT_VERSION, body: 'x' }).ok).toBe(false);
    expect(validateExplanationResult({ ...valid, body: '   ' }).ok).toBe(false);
  });

  it('rejects over-long title, body and example', () => {
    expect(validateExplanationResult({ ...valid, title: 'a'.repeat(81) }).ok).toBe(false);
    expect(validateExplanationResult({ ...valid, body: 'a'.repeat(501) }).ok).toBe(false);
    expect(validateExplanationResult({ ...valid, example: 'a'.repeat(201) }).ok).toBe(false);
    expect(validateExplanationResult({ ...valid, title: 'a'.repeat(80), body: 'a'.repeat(500) }).ok).toBe(true);
  });

  it('rejects unknown fields such as correctness or progression', () => {
    for (const extra of [{ isCorrect: true }, { score: 1 }, { misconceptionId: 'X' }, { completeQuestion: true }]) {
      expect(validateExplanationResult({ ...valid, ...extra }).ok).toBe(false);
    }
  });

  it.each([null, undefined, 'text', 42, [], [valid], { version: OUTPUT_VERSION, title: 1, body: 2 }])(
    'fails safely on malformed shape %#',
    (input) => {
      expect(validateExplanationResult(input).ok).toBe(false);
    },
  );
});

describe('deterministic explanation provider', () => {
  const ok = async (target: ExplanationTarget, question = q1) => {
    const outcome = await explain(buildExplanationRequest(target, question));
    expect(outcome.status).toBe('ok');
    return outcome.status === 'ok' ? validateExplanationResult(outcome.value) : { ok: false as const, reason: '' };
  };

  it('explains partial distribution without blame', async () => {
    const result = await ok(misconceptionTarget);
    expect(result).toMatchObject({ ok: true, value: { title: 'Why that step needs another look' } });
    expect(result.ok && result.value.body).toContain('the 3 multiplies x and 2, so expanding gives 3x + 6');
    expect(result.ok && result.value.body).not.toMatch(/you forgot|you should|you made/i);
  });

  it('explains an inverse-operation misconception', async () => {
    const result = await ok({
      kind: 'misconception',
      questionId: q2.id,
      expression: '2x + 5 = 17',
      misconceptionId: 'INCORRECT_INVERSE_OPERATION',
      learnerExpression: '2x = 22',
    }, q2);
    expect(result.ok && result.value.body).toContain('Undoing + 5 means taking 5 away from both sides');
  });

  it('explains an arithmetic misconception where one exists', async () => {
    const result = await ok({
      kind: 'misconception',
      questionId: q2.id,
      expression: '2x = 12',
      misconceptionId: 'ARITHMETIC_ERROR',
      learnerExpression: 'x = 5',
    }, q2);
    expect(result.ok && result.value.body).toContain('12 ÷ 2');
  });

  it('explains an accepted step by the operation that kept it balanced', async () => {
    const result = await ok({ ...acceptedTarget, submittedExpression: '2x = 12' } as ExplanationTarget, q2);
    expect(result).toMatchObject({ ok: true, value: { title: 'Why that step works' } });
    expect(result.ok && result.value.body).toBe(
      'Subtracting 5 from both sides keeps the equation balanced, so 2x + 5 = 17 becomes 2x = 12.',
    );
  });

  it('explains a suggested step', async () => {
    const result = await ok(suggestedTarget);
    expect(result).toMatchObject({ ok: true, value: { title: 'Why this step works' } });
    expect(result.ok && result.value.body).toContain('Dividing both sides by 3');
  });

  it('keeps the learner’s own wording for an equivalent expression', async () => {
    const result = await ok(acceptedTarget, q2);
    expect(result.ok && result.value.body).toContain('You wrote 2x = 17 - 5, which is equivalent to 2x = 12.');
    expect(result.ok && result.value.body).not.toContain('You wrote 2x = 12');
  });

  it('explains a hint and an example', async () => {
    const hint = await ok({ kind: 'hint', questionId: q1.id, expression: '3(x + 2) = 18', misconceptionId: 'PARTIAL_DISTRIBUTION' });
    expect(hint).toMatchObject({ ok: true, value: { title: 'Why this hint helps' } });
    const example = await ok({ kind: 'example', questionId: q1.id, expression: '3(x + 2) = 18', misconceptionId: 'PARTIAL_DISTRIBUTION' });
    expect(example).toMatchObject({ ok: true, value: { title: 'Why this example helps' } });
  });

  it('returns unavailable, without guessing, for anything outside its mapping', async () => {
    const unsupported: ExplanationTarget[] = [
      { ...acceptedTarget, previousExpression: '2x + 5 = 17', canonicalExpression: 'x = 6' } as ExplanationTarget,
      { ...misconceptionTarget, expression: '3x = 12' } as ExplanationTarget,
      { ...suggestedTarget, questionId: 'unknown-question' } as ExplanationTarget,
    ];
    for (const target of unsupported) {
      const request = buildExplanationRequest(target, q1);
      expect(provider.supports(request)).toBe(false);
      expect(await explain(request)).toEqual({ status: 'unavailable' });
    }
  });

  it('only ever returns display text, never correctness or progression fields', async () => {
    for (const target of [misconceptionTarget, acceptedTarget, suggestedTarget]) {
      const outcome = await explain(buildExplanationRequest(target, q1));
      if (outcome.status !== 'ok') continue;
      expect(Object.keys(outcome.value as object).sort()).toEqual(['body', 'title', 'version']);
    }
  });
});
