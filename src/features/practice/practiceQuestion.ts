import type { Misconception } from './validation';

export type PracticeQuestion = {
  id: string;
  instruction: string;
  initialExpression: string;
  goal: string;
  transitions: Record<string, string[]>;
  knownMistakes: Array<{ from: string; entered: string; misconception: Misconception }>;
};

// Expressions are stored in normalised form. Any expression reachable from the
// current one through these transitions counts as valid, so steps may be skipped.
export const practiceQuestion: PracticeQuestion = {
  id: 'linear-3-bracket',
  instruction: 'Solve the equation one step at a time.',
  initialExpression: '3(x + 2) = 18',
  goal: 'x = 4',
  transitions: {
    '3(x + 2) = 18': ['3x + 6 = 18', 'x + 2 = 6'],
    '3x + 6 = 18': ['3x = 12'],
    'x + 2 = 6': ['x = 4'],
    '3x = 12': ['x = 4'],
  },
  knownMistakes: [
    { from: '3(x + 2) = 18', entered: '3x + 2 = 18', misconception: 'PARTIAL_DISTRIBUTION' },
    { from: '3x + 6 = 18', entered: '3x = 24', misconception: 'INCORRECT_INVERSE_OPERATION' },
    { from: '3x = 12', entered: 'x = 3', misconception: 'ARITHMETIC_ERROR' },
  ],
};
