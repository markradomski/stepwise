import { practiceQuestion } from './practiceQuestion';
import { validateStep } from './validation';

const initial = '3(x + 2) = 18';
const check = (from: string, input: string) => validateStep(practiceQuestion, from, input);

describe('validateStep', () => {
  it('accepts distributing the bracket', () => {
    expect(check(initial, '3x + 6 = 18')).toEqual({ kind: 'valid', canonicalExpression: '3x + 6 = 18' });
  });

  it('accepts dividing both sides first', () => {
    expect(check(initial, 'x + 2 = 6')).toEqual({ kind: 'valid', canonicalExpression: 'x + 2 = 6' });
  });

  it('accepts whitespace and operator formatting variations', () => {
    for (const input of ['3x+6=18', '3x +6 =18', '3 x + 6 = 18', '3×x + 6 = 18']) {
      expect(check(initial, input)).toEqual({ kind: 'valid', canonicalExpression: '3x + 6 = 18' });
    }
  });

  it('accepts each later step on both paths', () => {
    expect(check('3x + 6 = 18', '3x = 12').kind).toBe('valid');
    expect(check('3x = 12', 'x = 4').kind).toBe('valid');
    expect(check('x + 2 = 6', 'x = 4').kind).toBe('valid');
  });

  it('accepts a valid step that skips ahead', () => {
    expect(check('3x + 6 = 18', 'x = 4').kind).toBe('valid');
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
