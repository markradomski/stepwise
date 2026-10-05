import type { Misconception } from './validation';

export type WorkedExample = { before: string; after: string; explanation: string };

export type MisconceptionContent = {
  feedback: { first: string; repeated?: string };
  hint: string;
  example?: WorkedExample;
};

export type PracticeQuestion = {
  id: string;
  instruction: string;
  initialExpression: string;
  goal: string;
  transitions: Record<string, string[]>;
  knownMistakes: Array<{ from: string; entered: string; misconception: Misconception }>;
  misconceptions: Partial<Record<Misconception, MisconceptionContent>>;
  genericHints: Record<string, string>;
  strategies: Record<string, string>;
  solvedMessage: string;
};
