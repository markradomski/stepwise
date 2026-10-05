import { evaluateNumeric, formatNumber } from './arithmetic';

function stripOuterParentheses(side: string): string {
  let current = side;
  while (current.startsWith('(') && current.endsWith(')')) {
    let depth = 0;
    let wrapsWholeSide = true;
    for (let index = 0; index < current.length - 1; index += 1) {
      depth += current[index] === '(' ? 1 : current[index] === ')' ? -1 : 0;
      if (depth === 0) {
        wrapsWholeSide = false;
        break;
      }
    }
    if (!wrapsWholeSide) break;
    current = current.slice(1, -1).trim();
  }
  return current;
}

// Only numeric-only sides are reduced. Sides containing x stay as written, so
// reordered or rearranged algebra (6 + 3x = 18) is deliberately not matched.
function simplifySide(side: string): string {
  const unwrapped = stripOuterParentheses(side.trim());
  const value = evaluateNumeric(unwrapped);
  return value === undefined ? unwrapped : formatNumber(value);
}

export function canonicaliseEquation(normalisedExpression: string): string {
  const sides = normalisedExpression.split('=');
  if (sides.length !== 2) return normalisedExpression;
  return `${simplifySide(sides[0])} = ${simplifySide(sides[1])}`;
}

export type Simplification = { expression: string; result: string };

// Only a whole side that is numeric-only and not already a plain number counts, e.g. the 18/3 in x + 2 = 18/3.
export function findSimplification(normalisedExpression: string): Simplification | undefined {
  for (const side of normalisedExpression.split('=')) {
    const unwrapped = stripOuterParentheses(side.trim());
    const value = evaluateNumeric(unwrapped);
    if (value !== undefined && formatNumber(value) !== unwrapped) {
      return { expression: unwrapped, result: formatNumber(value) };
    }
  }
  return undefined;
}
