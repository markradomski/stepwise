import { evaluateNumeric, formatNumber } from './arithmetic';

describe('evaluateNumeric', () => {
  it.each([
    ['18/3', 6],
    ['12/3', 4],
    ['2+4', 6],
    ['3*4', 12],
    ['8-2', 6],
    ['6/1', 6],
    ['2 + 4 * 3', 14],
    ['(2 + 4) * 3', 18],
    ['-3 + 5', 2],
    ['(6)', 6],
    ['7/2', 3.5],
  ])('evaluates %s', (text, expected) => {
    expect(evaluateNumeric(text)).toBe(expected);
  });

  it('rejects division by zero without producing Infinity', () => {
    expect(evaluateNumeric('18/0')).toBeUndefined();
    expect(evaluateNumeric('1/(2-2)')).toBeUndefined();
  });

  it.each(['3x', 'x+2', '3(x+2)', 'x', '2(3)', ''])('does not evaluate %j', (text) => {
    expect(evaluateNumeric(text)).toBeUndefined();
  });

  it.each(['alert(1)', '2**3', '1;2', '1e3', '2^3', '[1]', 'constructor', '(1', '1)', '1+', '*2', '1..2'])(
    'does not run arbitrary syntax: %j',
    (text) => {
      expect(evaluateNumeric(text)).toBeUndefined();
    },
  );

  it('formats results without floating-point noise', () => {
    expect(formatNumber(evaluateNumeric('0.1+0.2')!)).toBe('0.3');
    expect(formatNumber(6)).toBe('6');
  });
});
