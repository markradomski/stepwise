import type { MisconceptionContent, PracticeQuestion } from './practiceQuestion';
import type { HelpSource } from './practiceState';
import type { Misconception } from './validation';

export function contentFor(question: PracticeQuestion, misconception: Misconception): MisconceptionContent | undefined {
  return question.misconceptions[misconception];
}

// The first listed transition is the preferred path.
export function nextStepFor(question: PracticeQuestion, expression: string): string | undefined {
  return question.transitions[expression]?.[0];
}

export function hintFor(question: PracticeQuestion, source: HelpSource | undefined): string | undefined {
  if (!source) return undefined;
  return source.kind === 'misconception'
    ? contentFor(question, source.misconception)?.hint
    : question.fallbackHints[source.canonicalExpression];
}
