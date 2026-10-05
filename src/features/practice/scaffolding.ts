import type { PracticeQuestion } from './practiceQuestion';
import type { HelpSource } from './practiceState';
import type { Misconception } from './validation';

export type WorkedExample = { before: string; after: string; explanation: string };

export type Scaffold = { hint: string; example?: WorkedExample };

export const scaffolds: Record<Misconception, Scaffold> = {
  PARTIAL_DISTRIBUTION: {
    hint: 'The 3 applies to everything inside the brackets.',
    example: {
      before: '2(y + 4)',
      after: '2y + 8',
      explanation: 'The number outside the brackets multiplies each term inside.',
    },
  },
  INCORRECT_INVERSE_OPERATION: {
    hint: 'Undo an addition by subtracting the same amount from both sides.',
    example: {
      before: 'y + 5 = 12',
      after: 'y = 7',
      explanation: 'Subtracting 5 from both sides undoes the +5.',
    },
  },
  ARITHMETIC_ERROR: {
    hint: 'Do the division again, then multiply back to check it.',
  },
};

// The first listed transition is the preferred path.
export function nextStepFor(question: PracticeQuestion, expression: string): string | undefined {
  return question.transitions[expression]?.[0];
}

const fallbackHints: Record<string, string> = {
  '3(x + 2) = 18': 'Try making the equation simpler while doing the same thing to both sides.',
  '3x + 6 = 18': 'Think about which operation would undo the +6.',
  'x + 2 = 6': 'Think about which operation would undo the +2.',
  '3x = 12': 'What operation would leave x on its own?',
};

export function hintFor(source: HelpSource | undefined): string | undefined {
  if (!source) return undefined;
  return source.kind === 'misconception' ? scaffolds[source.misconception].hint : fallbackHints[source.canonicalExpression];
}
