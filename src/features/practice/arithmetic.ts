// Only numeric-only text is ever evaluated: the character whitelist excludes
// variables, identifiers and any other syntax, and nothing here uses eval.
export function evaluateNumeric(text: string): number | undefined {
  const source = text.replace(/\s+/g, '');
  if (!/^[\d+\-*/().]+$/.test(source)) return undefined;

  let index = 0;
  const fail = (): never => {
    throw new Error('unsupported arithmetic');
  };

  const factor = (): number => {
    if (source[index] === '-') {
      index += 1;
      return -factor();
    }
    if (source[index] === '(') {
      index += 1;
      const value = expression();
      if (source[index] !== ')') fail();
      index += 1;
      return value;
    }
    const number = /^\d+(\.\d+)?/.exec(source.slice(index));
    if (!number) return fail();
    index += number[0].length;
    return Number(number[0]);
  };

  const term = (): number => {
    let value = factor();
    while (source[index] === '*' || source[index] === '/') {
      const operator = source[index++];
      const right = factor();
      if (operator === '/' && right === 0) fail();
      value = operator === '*' ? value * right : value / right;
    }
    return value;
  };

  const expression = (): number => {
    let value = term();
    while (source[index] === '+' || source[index] === '-') {
      const operator = source[index++];
      const right = term();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  };

  try {
    const value = expression();
    return index === source.length && Number.isFinite(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

export function formatNumber(value: number): string {
  return String(Number(value.toPrecision(12)));
}
