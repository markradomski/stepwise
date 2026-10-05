import { practiceQuestion } from './practiceQuestion';
import { validateStep } from './validation';

const initial = '3(x + 2) = 18';
const check = (from: string, input: string) => validateStep(practiceQuestion, from, input);

describe('validateStep', () => {
  it('accepts distributing the bracket', () => {
    expect(check(initial, '3x + 6 = 18')).toEqual({
      kind: 'valid',
      progression: 'direct',
      recognition: 'exact',
      submittedExpression: '3x + 6 = 18',
      canonicalExpression: '3x + 6 = 18',
    });
  });

  it('accepts dividing both sides first', () => {
    expect(check(initial, 'x + 2 = 6')).toMatchObject({
      kind: 'valid',
      progression: 'direct',
      recognition: 'exact',
      canonicalExpression: 'x + 2 = 6',
    });
  });

  it('accepts whitespace and operator formatting variations', () => {
    for (const input of ['3x+6=18', '3x +6 =18', '3 x + 6 = 18', '3×x + 6 = 18']) {
      expect(check(initial, input)).toMatchObject({
        kind: 'valid',
        progression: 'direct',
        recognition: 'exact',
        submittedExpression: '3x + 6 = 18',
        canonicalExpression: '3x + 6 = 18',
      });
    }
  });

  it('accepts each later step on both paths as a direct step', () => {
    for (const [from, input] of [
      ['3x + 6 = 18', '3x = 12'],
      ['3x = 12', 'x = 4'],
      ['x + 2 = 6', 'x = 4'],
    ]) {
      expect(check(from, input)).toMatchObject({ kind: 'valid', progression: 'direct' });
    }
  });

  it('recognises a correct final answer from the start as skipping steps', () => {
    expect(check(initial, 'x = 4')).toMatchObject({
      kind: 'valid',
      progression: 'skipped',
      canonicalExpression: 'x = 4',
    });
    expect(check(initial, '3x = 12')).toMatchObject({ kind: 'valid', progression: 'skipped' });
    expect(check('3x + 6 = 18', 'x = 4')).toMatchObject({ kind: 'valid', progression: 'skipped' });
  });

  it('does not treat a skipped step as a misconception or an invalid step', () => {
    const result = check(initial, 'x = 4');
    expect(result.kind).toBe('valid');
    expect(result).not.toHaveProperty('misconception');
  });

  it('recognises partial distribution', () => {
    expect(check(initial, '3x + 2 = 18')).toEqual({
      kind: 'misconception',
      misconception: 'PARTIAL_DISTRIBUTION',
      submittedExpression: '3x + 2 = 18',
    });
    expect(check(initial, '3x+2=18').kind).toBe('misconception');
  });

  it('recognises an incorrect inverse operation', () => {
    expect(check('3x + 6 = 18', '3x = 24')).toMatchObject({
      kind: 'misconception',
      misconception: 'INCORRECT_INVERSE_OPERATION',
    });
  });

  it('recognises an arithmetic error', () => {
    expect(check('3x = 12', 'x = 3')).toMatchObject({ kind: 'misconception', misconception: 'ARITHMETIC_ERROR' });
  });

  it('does not invent a misconception for unsupported steps', () => {
    for (const input of ['x = 5', '2x + 4 = 18', 'banana', '3(x + 2) = 18', '', '6 + 3x = 18', 'x = 12/0']) {
      expect(check(initial, input).kind).toBe('unrecognised');
    }
  });

  it('only diagnoses a mistake from the expression it applies to', () => {
    expect(check('3x = 12', '3x + 2 = 18').kind).toBe('unrecognised');
  });

  it('recognises equivalent arithmetic forms and preserves what was submitted', () => {
    expect(check(initial, '(x + 2) = 18/3')).toEqual({
      kind: 'valid',
      progression: 'direct',
      recognition: 'equivalent',
      submittedExpression: '(x + 2) = 18/3',
      canonicalExpression: 'x + 2 = 6',
      simplification: { expression: '18/3', result: '6' },
    });
    expect(check(initial, 'x+2=18/3')).toMatchObject({
      recognition: 'equivalent',
      submittedExpression: 'x + 2 = 18/3',
      canonicalExpression: 'x + 2 = 6',
    });
    expect(check('3x = 12', 'x = 12/3')).toMatchObject({
      kind: 'valid',
      progression: 'direct',
      recognition: 'equivalent',
      submittedExpression: 'x = 12/3',
      canonicalExpression: 'x = 4',
    });
    expect(check('3x + 6 = 18', '3x = 18 - 6')).toMatchObject({ progression: 'direct', canonicalExpression: '3x = 12' });
  });

  it('keeps skipped-step behaviour for equivalent forms', () => {
    expect(check(initial, 'x = 12/3')).toMatchObject({ progression: 'skipped', canonicalExpression: 'x = 4' });
    expect(check('3x + 6 = 18', 'x = 8/2')).toMatchObject({ progression: 'skipped', recognition: 'equivalent' });
  });

  it('still prefers a recognised misconception over the fallback, including equivalent forms', () => {
    expect(check('3x = 12', 'x = 9/3')).toMatchObject({ kind: 'misconception', misconception: 'ARITHMETIC_ERROR' });
    expect(check(initial, '3x + 2 = 18')).toMatchObject({ kind: 'misconception' });
  });

  it('does not accept a different equation just because its arithmetic reduces', () => {
    expect(check(initial, 'x + 2 = 18/2').kind).toBe('unrecognised');
    expect(check(initial, '3(x + 2) = 6').kind).toBe('unrecognised');
  });

  it.each([
    ['x + 2 = 18/3', '18/3', '6'],
    ['3x = 12/1', '12/1', '12'],
    ['x = 12/3', '12/3', '4'],
    ['3x = 6*2', '6*2', '12'],
    ['3x = 18 - 6', '18 - 6', '12'],
  ])('flags a reducible numeric side in %s', (input, expression, result) => {
    const from = input.startsWith('x + 2') ? initial : input.startsWith('x =') ? '3x = 12' : '3x + 6 = 18';
    expect(check(from, input)).toMatchObject({ kind: 'valid', simplification: { expression, result } });
  });

  it('does not flag already simplified or symbolic expressions', () => {
    for (const [from, input] of [
      [initial, 'x + 2 = 6'],
      [initial, '3x + 6 = 18'],
      ['3x = 12', 'x = 4'],
      [initial, '(x + 2) = 6'],
      [initial, '(x + 2) = (6)'],
    ]) {
      expect(check(from, input)).not.toHaveProperty('simplification');
    }
  });

  it('does not let simplification change the canonical progression', () => {
    const withGuidance = check(initial, 'x + 2 = 18/3');
    const without = check(initial, 'x + 2 = 6');
    expect(withGuidance).toMatchObject({ canonicalExpression: 'x + 2 = 6', progression: 'direct' });
    expect(withGuidance).toMatchObject({ canonicalExpression: (without as { canonicalExpression: string }).canonicalExpression });
    expect(withGuidance).toHaveProperty('submittedExpression', 'x + 2 = 18/3');
  });

  it('accepts the simplified restatement only while a simplification is pending', () => {
    const restate = (pending: boolean) =>
      validateStep(practiceQuestion, 'x + 2 = 6', 'x + 2 = 6', { simplificationPending: pending });
    expect(restate(true)).toMatchObject({ kind: 'valid', progression: 'direct', canonicalExpression: 'x + 2 = 6' });
    expect(restate(false).kind).toBe('unrecognised');
    expect(
      validateStep(practiceQuestion, 'x + 2 = 6', 'x + 2 = 12/2', { simplificationPending: true }),
    ).toMatchObject({ kind: 'unrecognised' });
  });
});
