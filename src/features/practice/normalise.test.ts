import { normaliseExpression } from './normalise';
import { practiceQuestion } from './practiceQuestion';

describe('normaliseExpression', () => {
  it.each(['3x + 6 = 18', '3x+6=18', '3x +6 =18', '  3 x + 6 = 18 ', '3X+6=18', '3×x+6=18', '3*x+6=18'])(
    'treats %j as 3x + 6 = 18',
    (input) => {
      expect(normaliseExpression(input)).toBe('3x + 6 = 18');
    },
  );

  it('handles brackets and multiplication signs', () => {
    expect(normaliseExpression('3*(x+2)=18')).toBe('3(x + 2) = 18');
    expect(normaliseExpression('3×(x + 2) = 18')).toBe('3(x + 2) = 18');
  });

  it('accepts typographic minus signs and keeps unary minus', () => {
    expect(normaliseExpression('3x − 6 = 18')).toBe('3x - 6 = 18');
    expect(normaliseExpression('x=−4')).toBe('x = -4');
  });

  it('does not rewrite different expressions into each other', () => {
    expect(normaliseExpression('3x + 2 = 18')).not.toBe(normaliseExpression('3x + 6 = 18'));
    expect(normaliseExpression('3*4 = 12')).toBe('3*4 = 12');
  });

  it('stores every question expression in normalised form', () => {
    const { transitions, knownMistakes, initialExpression, goal } = practiceQuestion;
    const expressions = [
      initialExpression,
      goal,
      ...Object.entries(transitions).flatMap(([from, next]) => [from, ...next]),
      ...knownMistakes.flatMap((mistake) => [mistake.from, mistake.entered]),
    ];
    for (const expression of expressions) expect(normaliseExpression(expression)).toBe(expression);
  });
});
