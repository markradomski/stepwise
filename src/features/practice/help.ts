import type { ExposureStatus } from '../../lib/learningState';
import { hasRepeatedFeedback } from './feedback';
import { currentExpression, type PracticeState } from './practiceState';
import { contentFor, genericHintFor, hintFor, nextStepFor } from './scaffolding';

export type HelpAction = 'help' | 'hint' | 'example' | 'nextStep';

export type HelpStatus = {
  hint: ExposureStatus;
  example: ExposureStatus;
  nextStep: ExposureStatus;
  level: 0 | 1 | 2 | 3;
  action?: HelpAction;
};

export const helpActionLabels: Record<HelpAction, string> = {
  help: 'Need help?',
  hint: 'Get a hint',
  example: 'Show an example',
  nextStep: 'Show next step',
};

const noHelpStatus: HelpStatus = { hint: 'hidden', example: 'hidden', nextStep: 'hidden', level: 0 };

// Derived from the help source and what the learner has asked for. Generic help (no diagnosis)
// is one light prompt and cannot escalate, so it is never a shortcut to the answer. Only a
// recognised misconception climbs from a hint to a worked example (once the hint is used or the
// mistake repeats) and then to the next step (once the example has been seen). A recognised
// misconception always replaces generic help.
export function helpStatus(state: PracticeState): HelpStatus {
  const { helpSource, help } = state;
  if (help.nextStepRevealed) return revealedStatus;
  if (state.completed) return noHelpStatus;

  if (!helpSource) {
    return genericHintFor(state.question, currentExpression(state)) === undefined
      ? noHelpStatus
      : { hint: 'available', example: 'hidden', nextStep: 'hidden', level: 0, action: 'help' };
  }
  if (hintFor(state.question, helpSource) === undefined) return noHelpStatus;

  if (helpSource.kind === 'generic') {
    return {
      hint: help.hintRequested ? 'visible' : 'available',
      example: 'hidden',
      nextStep: 'hidden',
      level: 1,
      action: help.hintRequested ? undefined : 'help',
    };
  }

  const { misconception } = helpSource;
  const scaffold = contentFor(state.question, misconception);
  if (!scaffold) return noHelpStatus;
  const repeated = hasRepeatedFeedback(state, misconception) && (state.misconceptionCounts[misconception] ?? 0) > 1;
  const escalated = help.hintRequested || repeated;
  const hasNextStep = Boolean(scaffold.example && nextStepFor(state.question, currentExpression(state)));

  const hint: ExposureStatus = escalated ? 'visible' : 'available';
  const example: ExposureStatus = !scaffold.example
    ? 'hidden'
    : help.exampleRequested
      ? 'visible'
      : escalated
        ? 'available'
        : 'hidden';
  const nextStep: ExposureStatus = !hasNextStep ? 'hidden' : help.exampleRequested ? 'available' : 'hidden';

  const level = nextStep !== 'hidden' ? 3 : example !== 'hidden' ? 2 : 1;

  let action: HelpAction | undefined;
  if (nextStep === 'available') action = 'nextStep';
  else if (example === 'available') action = 'example';
  else if (!help.hintRequested && !help.exampleRequested && hint === 'available') action = 'hint';

  return { hint, example, nextStep, level, action };
}

// Once a step has been revealed the exposure keeps showing what was used, but nothing more is offered.
const revealedStatus: HelpStatus = { hint: 'visible', example: 'visible', nextStep: 'visible', level: 3 };
