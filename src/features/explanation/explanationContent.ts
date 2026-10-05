import type { Misconception } from '../practice/validation';

// Deterministic explanation text, keyed by question. Nothing is inferred from the algebra: a step or
// misconception without an entry has no explanation.
type QuestionExplanations = {
  misconceptions: Record<string, string>;
  transitions: Record<string, string>;
};

export const misconceptionKey = (from: string, id: Misconception) => `${from} :: ${id}`;
export const transitionKey = (from: string, to: string) => `${from} -> ${to}`;

export const explanationContent: Record<string, QuestionExplanations> = {
  'linear-3-bracket': {
    misconceptions: {
      [misconceptionKey('3(x + 2) = 18', 'PARTIAL_DISTRIBUTION')]:
        'The 3 needs to multiply both terms inside the brackets. In 3(x + 2), the 3 multiplies x and 2, so expanding gives 3x + 6.',
      [misconceptionKey('3x + 6 = 18', 'INCORRECT_INVERSE_OPERATION')]:
        'Undoing + 6 means taking 6 away from both sides, which keeps them equal. That turns 3x + 6 = 18 into 3x = 12.',
      [misconceptionKey('3x = 12', 'ARITHMETIC_ERROR')]:
        'Dividing both sides by 3 leaves x on its own: x = 12 ÷ 3. Since 3 × 4 = 12, that division gives 4.',
    },
    transitions: {
      [transitionKey('3(x + 2) = 18', '3x + 6 = 18')]:
        'Multiplying the 3 by both x and 2 expands the brackets without changing the value, so 3(x + 2) = 18 becomes 3x + 6 = 18.',
      [transitionKey('3(x + 2) = 18', 'x + 2 = 6')]:
        'Dividing both sides by 3 keeps the equation balanced and gives x + 2 = 6.',
      [transitionKey('3x + 6 = 18', '3x = 12')]:
        'Subtracting 6 from both sides keeps the equation balanced, so 3x + 6 = 18 becomes 3x = 12.',
      [transitionKey('x + 2 = 6', 'x = 4')]:
        'Subtracting 2 from both sides isolates x while keeping both sides equal, so x + 2 = 6 becomes x = 4.',
      [transitionKey('3x = 12', 'x = 4')]:
        'Dividing both sides by 3 isolates x while preserving equality, so 3x = 12 becomes x = 4.',
    },
  },
  'linear-two-step': {
    misconceptions: {
      [misconceptionKey('2x + 5 = 17', 'INCORRECT_INVERSE_OPERATION')]:
        'Undoing + 5 means taking 5 away from both sides, which keeps them equal. That turns 2x + 5 = 17 into 2x = 12.',
      [misconceptionKey('2x = 12', 'ARITHMETIC_ERROR')]:
        'Dividing both sides by 2 leaves x on its own: x = 12 ÷ 2. Since 2 × 6 = 12, that division gives 6.',
    },
    transitions: {
      [transitionKey('2x + 5 = 17', '2x = 12')]:
        'Subtracting 5 from both sides keeps the equation balanced, so 2x + 5 = 17 becomes 2x = 12.',
      [transitionKey('2x = 12', 'x = 6')]:
        'Dividing both sides by 2 isolates x while preserving equality, so 2x = 12 becomes x = 6.',
    },
  },
  'linear-4-bracket': {
    misconceptions: {
      [misconceptionKey('4(x - 1) = 20', 'PARTIAL_DISTRIBUTION')]:
        'The 4 needs to multiply both terms inside the brackets. In 4(x − 1), the 4 multiplies x and −1, so expanding gives 4x − 4.',
      [misconceptionKey('4x - 4 = 20', 'INCORRECT_INVERSE_OPERATION')]:
        'Undoing − 4 means adding 4 to both sides, which keeps them equal. That turns 4x − 4 = 20 into 4x = 24.',
      [misconceptionKey('4x = 24', 'ARITHMETIC_ERROR')]:
        'Dividing both sides by 4 leaves x on its own: x = 24 ÷ 4. Since 4 × 6 = 24, that division gives 6.',
    },
    transitions: {
      [transitionKey('4(x - 1) = 20', '4x - 4 = 20')]:
        'Multiplying the 4 by both x and −1 expands the brackets without changing the value, so 4(x − 1) = 20 becomes 4x − 4 = 20.',
      [transitionKey('4(x - 1) = 20', 'x - 1 = 5')]:
        'Dividing both sides by 4 keeps the equation balanced and gives x − 1 = 5.',
      [transitionKey('4x - 4 = 20', '4x = 24')]:
        'Adding 4 to both sides keeps the equation balanced, so 4x − 4 = 20 becomes 4x = 24.',
      [transitionKey('x - 1 = 5', 'x = 6')]:
        'Adding 1 to both sides isolates x while keeping both sides equal, so x − 1 = 5 becomes x = 6.',
      [transitionKey('4x = 24', 'x = 6')]:
        'Dividing both sides by 4 isolates x while preserving equality, so 4x = 24 becomes x = 6.',
    },
  },
};
