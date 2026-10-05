const minusVariants = /[−–—‒]/g;

export function normaliseExpression(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(minusVariants, '-')
    .replace(/[×·∗]/g, '*')
    .replace(/÷/g, '/')
    .replace(/(\d)\*(?=[x(])/g, '$1')
    .replace(/(?<=[\dx)])([+-])/g, ' $1 ')
    .replace(/=/g, ' = ')
    .replace(/\s+/g, ' ')
    .trim();
}
