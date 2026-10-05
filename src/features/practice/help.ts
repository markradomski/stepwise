import type { ExposureStatus } from '../../lib/learningState';
import { hasRepeatedFeedback } from './feedback';
import { practiceQuestion } from './practiceQuestion';
import { currentExpression, type PracticeState } from './practiceState';
import { hintFor, nextStepFor, scaffolds } from './scaffolding';

export type HelpAction = 'hint' | 'example' | 'nextStep';

export type HelpStatus = {
  hint: ExposureStatus;
  example: ExposureStatus;
  nextStep: ExposureStatus;
  level: 0 | 1 | 2 | 3;
  action?: HelpAction;
};

export const helpActionLabels: Record<HelpAction, string> = {
  hint: 'Need a hint?',
  example: 'Show an example',
  nextStep: 'Show next step',
};

const noHelpStatus: HelpStatus = { hint: 'hidden', example: 'hidden', nextStep: 'hidden', level: 0 };

// Everything here is derived from the help source and what the learner has asked for.
// Fallback help stops at a generic hint. Misconception help climbs from a hint to a
// worked example (once the hint is used or the mistake repeats) and then to the next
// step (once the example has been seen).
export function helpStatus(state: PracticeState): HelpStatus {
  const { helpSource, help } = state;
  if (!helpSource || hintFor(helpSource) === undefined) return noHelpStatus;

  const canAsk = state.rejectedExpression !== undefined && !help.nextStepRevealed;

  if (helpSource.kind === 'fallback') {
    return {
      hint: help.hintRequested ? 'visible' : 'available',
      example: 'hidden',
      nextStep: 'hidden',
      level: 1,
      action: canAsk && !help.hintRequested ? 'hint' : undefined,
    };
  }

  const { misconception } = helpSource;
  const scaffold = scaffolds[misconception];
  const repeated = hasRepeatedFeedback(misconception) && (state.misconceptionCounts[misconception] ?? 0) > 1;
  const escalated = help.hintRequested || repeated;
  const hasNextStep = Boolean(scaffold.example && nextStepFor(practiceQuestion, currentExpression(state)));

  const hint: ExposureStatus = escalated || help.nextStepRevealed ? 'visible' : 'available';
  const example: ExposureStatus = !scaffold.example
    ? 'hidden'
    : help.exampleRequested || help.nextStepRevealed
      ? 'visible'
      : escalated
        ? 'available'
        : 'hidden';
  const nextStep: ExposureStatus = !hasNextStep
    ? 'hidden'
    : help.nextStepRevealed
      ? 'visible'
      : help.exampleRequested
        ? 'available'
        : 'hidden';

  const level = nextStep !== 'hidden' ? 3 : example !== 'hidden' ? 2 : 1;

  let action: HelpAction | undefined;
  if (canAsk) {
    if (nextStep === 'available') action = 'nextStep';
    else if (example === 'available') action = 'example';
    else if (!help.hintRequested && !help.exampleRequested && hint === 'available') action = 'hint';
  }

  return { hint, example, nextStep, level, action };
}
