import { practiceQuestion } from './practiceQuestion';
import { validateStep } from './validation';

const initial = '3(x + 2) = 18';
const check = (from: string, input: string) => validateStep(practiceQuestion, from, input);

describe('validateStep', () => {
  it('accepts distributing the bracket', () => {
    expect(check(initial, '3x + 6 = 18')).toEqual({
      kind: 'valid',
      progression: 'direct',
      canonicalExpression: '3x + 6 = 18',
    });
  });

  it('accepts dividing both sides first', () => {
    expect(check(initial, 'x + 2 = 6')).toEqual({
      kind: 'valid',
      progression: 'direct',
      canonicalExpression: 'x + 2 = 6',
    });
  });

  it('accepts whitespace and operator formatting variations', () => {
    for (const input of ['3x+6=18', '3x +6 =18', '3 x + 6 = 18', '3×x + 6 = 18']) {
      expect(check(initial, input)).toEqual({
        kind: 'valid',
        progression: 'direct',
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
    expect(check(initial, 'x = 4')).toEqual({ kind: 'valid', progression: 'skipped', canonicalExpression: 'x = 4' });
    expect(check(initial, '3x = 12')).toMatchObject({ kind: 'valid', progression: 'skipped' });
    expect(check('3x + 6 = 18', 'x = 4')).toMatchObject({ kind: 'valid', progression: 'skipped' });
  });

  it('does not treat a skipped step as a misconception or an invalid step', () => {
    const result = check(initial, 'x = 4');
    expect(result.kind).toBe('valid');
    expect(result).not.toHaveProperty('misconception');
  });

  it('recognises partial distribution', () => {
    expect(check(initial, '3x + 2 = 18')).toEqual({ kind: 'misconception', misconception: 'PARTIAL_DISTRIBUTION' });
    expect(check(initial, '3x+2=18').kind).toBe('misconception');
  });

  it('recognises an incorrect inverse operation', () => {
    expect(check('3x + 6 = 18', '3x = 24')).toEqual({
      kind: 'misconception',
      misconception: 'INCORRECT_INVERSE_OPERATION',
    });
  });

  it('recognises an arithmetic error', () => {
    expect(check('3x = 12', 'x = 3')).toEqual({ kind: 'misconception', misconception: 'ARITHMETIC_ERROR' });
  });

  it('does not invent a misconception for unsupported steps', () => {
    for (const input of ['x = 5', '2x + 4 = 18', 'banana', '3(x + 2) = 18', '']) {
      expect(check(initial, input)).toEqual({ kind: 'invalid' });
    }
  });

  it('only diagnoses a mistake from the expression it applies to', () => {
    expect(check('3x = 12', '3x + 2 = 18')).toEqual({ kind: 'invalid' });
  });
});
