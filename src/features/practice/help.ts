import type { ExposureStatus } from '../../lib/learningState';
import { hasRepeatedFeedback } from './feedback';
import { practiceQuestion } from './practiceQuestion';
import { currentExpression, type PracticeState } from './practiceState';
import { nextStepFor, scaffolds } from './scaffolding';

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

// Everything here is derived from the diagnosis and what the learner has asked for.
// Help attaches to the active misconception: a hint is the first rung, a worked
// example opens once the hint is used or the mistake repeats, and revealing the
// next step opens only after the example has been seen.
export function helpStatus(state: PracticeState): HelpStatus {
  const { activeMisconception, help } = state;
  const scaffold = activeMisconception && scaffolds[activeMisconception];
  if (!activeMisconception || !scaffold) {
    return { hint: 'hidden', example: 'hidden', nextStep: 'hidden', level: 0 };
  }

  const repeated =
    hasRepeatedFeedback(activeMisconception) && (state.misconceptionCounts[activeMisconception] ?? 0) > 1;
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
  if (state.rejectedExpression !== undefined && !help.nextStepRevealed) {
    if (nextStep === 'available') action = 'nextStep';
    else if (example === 'available') action = 'example';
    else if (!help.hintRequested && !help.exampleRequested && hint === 'available') action = 'hint';
  }

  return { hint, example, nextStep, level, action };
}
