import type { PracticeQuestion } from './practiceQuestion';

const instruction = 'Solve the equation one step at a time.';
const arithmeticHint = 'Do the division again, then multiply back to check it.';
const isolateHint = 'What operation would leave x on its own?';

// Expressions are stored in normalised form. Any expression reachable from the
// current one through the transitions counts as valid, so steps may be skipped.
const bracketsAdded: PracticeQuestion = {
  id: 'linear-3-bracket',
  instruction,
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
  misconceptions: {
    PARTIAL_DISTRIBUTION: {
      feedback: {
        first: 'Check what the 3 multiplies inside the brackets.',
        repeated: 'Remember: the number outside the brackets multiplies every term inside.',
      },
      hint: 'The 3 applies to everything inside the brackets.',
      example: {
        before: '2(y + 4)',
        after: '2y + 8',
        explanation: 'The number outside the brackets multiplies each term inside.',
      },
    },
    INCORRECT_INVERSE_OPERATION: {
      feedback: { first: 'Check what happens when you undo the +6.' },
      hint: 'Undo an addition by subtracting the same amount from both sides.',
      example: {
        before: 'y + 5 = 12',
        after: 'y = 7',
        explanation: 'Subtracting 5 from both sides undoes the +5.',
      },
    },
    ARITHMETIC_ERROR: { feedback: { first: 'Check the arithmetic in your last step.' }, hint: arithmeticHint },
  },
  genericHints: {
    '3(x + 2) = 18': 'Think about how you could make the equation simpler.',
    '3x + 6 = 18': 'What operation would undo the +6?',
    'x + 2 = 6': 'What operation would undo the +2?',
    '3x = 12': isolateHint,
  },
  strategies: { '3x + 6 = 18': 'Distribution', 'x + 2 = 6': 'Divide first' },
  solvedMessage: 'x = 4 makes both sides equal 18.',
};

const twoStep: PracticeQuestion = {
  id: 'linear-two-step',
  instruction,
  initialExpression: '2x + 5 = 17',
  goal: 'x = 6',
  transitions: {
    '2x + 5 = 17': ['2x = 12'],
    '2x = 12': ['x = 6'],
  },
  knownMistakes: [
    { from: '2x + 5 = 17', entered: '2x = 22', misconception: 'INCORRECT_INVERSE_OPERATION' },
    { from: '2x = 12', entered: 'x = 5', misconception: 'ARITHMETIC_ERROR' },
  ],
  misconceptions: {
    INCORRECT_INVERSE_OPERATION: {
      feedback: { first: 'Check what happens when you undo the +5.' },
      hint: 'What operation undoes +5?',
      example: {
        before: 'y + 3 = 8',
        after: 'y = 5',
        explanation: 'Subtracting 3 from both sides undoes the +3.',
      },
    },
    ARITHMETIC_ERROR: { feedback: { first: 'Check the arithmetic in your last step.' }, hint: arithmeticHint },
  },
  genericHints: {
    '2x + 5 = 17': 'What operation would undo the +5?',
    '2x = 12': isolateHint,
  },
  strategies: { '2x = 12': 'Subtract, then divide' },
  solvedMessage: 'x = 6 makes both sides equal 17.',
};

const bracketsSubtracted: PracticeQuestion = {
  id: 'linear-4-bracket',
  instruction,
  initialExpression: '4(x - 1) = 20',
  goal: 'x = 6',
  transitions: {
    '4(x - 1) = 20': ['4x - 4 = 20', 'x - 1 = 5'],
    '4x - 4 = 20': ['4x = 24'],
    'x - 1 = 5': ['x = 6'],
    '4x = 24': ['x = 6'],
  },
  knownMistakes: [
    { from: '4(x - 1) = 20', entered: '4x - 1 = 20', misconception: 'PARTIAL_DISTRIBUTION' },
    { from: '4x - 4 = 20', entered: '4x = 16', misconception: 'INCORRECT_INVERSE_OPERATION' },
    { from: '4x = 24', entered: 'x = 5', misconception: 'ARITHMETIC_ERROR' },
  ],
  misconceptions: {
    PARTIAL_DISTRIBUTION: {
      feedback: {
        first: 'Check what the 4 multiplies inside the brackets.',
        repeated: 'Remember: the number outside the brackets multiplies every term inside.',
      },
      hint: 'The 4 applies to everything inside the brackets.',
      example: {
        before: '2(y - 3)',
        after: '2y - 6',
        explanation: 'The number outside the brackets multiplies each term inside.',
      },
    },
    INCORRECT_INVERSE_OPERATION: {
      feedback: { first: 'Check what happens when you undo the -4.' },
      hint: 'Undo a subtraction by adding the same amount to both sides.',
      example: {
        before: 'y - 2 = 5',
        after: 'y = 7',
        explanation: 'Adding 2 to both sides undoes the -2.',
      },
    },
    ARITHMETIC_ERROR: { feedback: { first: 'Check the arithmetic in your last step.' }, hint: arithmeticHint },
  },
  genericHints: {
    '4(x - 1) = 20': 'Think about how you could simplify the left-hand side or both sides.',
    '4x - 4 = 20': 'What operation would undo the −4?',
    'x - 1 = 5': 'What operation would undo the −1?',
    '4x = 24': isolateHint,
  },
  strategies: { '4x - 4 = 20': 'Distribution', 'x - 1 = 5': 'Divide first' },
  solvedMessage: 'x = 6 makes both sides equal 20.',
};

export const practiceQuestions: PracticeQuestion[] = [bracketsAdded, twoStep, bracketsSubtracted];
