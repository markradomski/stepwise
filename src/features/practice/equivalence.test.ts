import { canonicaliseEquation, findSimplification } from './equivalence';
import { normaliseExpression } from './normalise';

const canonical = (input: string) => canonicaliseEquation(normaliseExpression(input));

describe('canonicaliseEquation', () => {
  it('reduces numeric right-hand sides and removes harmless outer brackets', () => {
    expect(canonical('(x + 2) = 18/3')).toBe('x + 2 = 6');
    expect(canonical('x+2=18/3')).toBe('x + 2 = 6');
    expect(canonical('x = 12/3')).toBe('x = 4');
    expect(canonical('(x + 2) = 6')).toBe('x + 2 = 6');
    expect(canonical('x + 2 = (6)')).toBe('x + 2 = 6');
    expect(canonical('3x = 6*2')).toBe('3x = 12');
    expect(canonical('3x + 6 = 2+16')).toBe('3x + 6 = 18');
  });

  it('leaves expressions that are already canonical unchanged', () => {
    for (const expression of ['3(x + 2) = 18', '3x + 6 = 18', '3x = 12', 'x = 4']) {
      expect(canonical(expression)).toBe(expression);
    }
  });

  it('does not evaluate sides containing the variable', () => {
    expect(canonical('3x + 6 = 18')).toBe('3x + 6 = 18');
    expect(canonical('3(x + 2) = 18')).toBe('3(x + 2) = 18');
  });

  it('does not treat reordered terms as equivalent', () => {
    expect(canonical('6 + 3x = 18')).toBe('6 + 3x = 18');
  });

  it('keeps brackets that do not wrap the whole side', () => {
    expect(canonical('(3)(x + 2) = 18')).toBe('(3)(x + 2) = 18');
    expect(canonical('(x + 2)(3) = 18')).toBe('(x + 2)(3) = 18');
  });

  it('handles division by zero safely', () => {
    expect(canonical('x = 12/0')).toBe('x = 12/0');
    expect(canonical('x + 2 = 18/(3-3)')).toBe('x + 2 = 18/(3 - 3)');
  });

  it('passes through anything that is not a single equation', () => {
    expect(canonical('banana')).toBe('banana');
    expect(canonical('x = 1 = 2')).toBe('x = 1 = 2');
    expect(canonical('')).toBe('');
  });
});

describe('findSimplification', () => {
  const find = (input: string) => findSimplification(normaliseExpression(input));

  it('finds a reducible numeric-only side', () => {
    expect(find('x + 2 = 18/3')).toEqual({ expression: '18/3', result: '6' });
    expect(find('x = 12/3')).toEqual({ expression: '12/3', result: '4' });
    expect(find('3x = 6*2')).toEqual({ expression: '6*2', result: '12' });
    expect(find('3x = 18-6')).toEqual({ expression: '18 - 6', result: '12' });
    expect(find('(x + 2) = (18/3)')).toEqual({ expression: '18/3', result: '6' });
  });

  it('finds nothing when the numbers are already simplified', () => {
    for (const input of ['x + 2 = 6', 'x = 4', '3x + 6 = 18', '(x + 2) = (6)', 'x = -4']) {
      expect(find(input)).toBeUndefined();
    }
  });

  it('never evaluates sides that contain the variable', () => {
    expect(find('3x = 12')).toBeUndefined();
    expect(find('x + 2*3 = 18')).toBeUndefined();
  });

  it('ignores unsafe arithmetic', () => {
    expect(find('x = 12/0')).toBeUndefined();
  });
});
