import type { ExposureStatus } from '../../lib/learningState';
import type { WorkedExample } from './practiceQuestion';
import {
  currentExpression,
  type AssistanceContent,
  type AssistanceEntry,
  type MisconceptionSupport,
  type PracticeState,
} from './practiceState';
import { contentFor, genericHintFor, nextStepFor } from './scaffolding';

export type ForwardAction = 'need-help' | 'get-hint' | 'show-example' | 'show-next-step';

export const forwardActionLabels: Record<ForwardAction, string> = {
  'need-help': 'Need help?',
  'get-hint': 'Get a hint',
  'show-example': 'Show an example',
  'show-next-step': 'Show next step',
};

export const reopenActionLabels: Record<AssistanceContent, string> = {
  prompt: 'View prompt',
  hint: 'View hint',
  example: 'View example',
};

export const returnActionLabels: Record<AssistanceContent, string> = {
  prompt: 'Back to prompt',
  hint: 'Back to hint',
  example: 'Back to example',
};

export const availabilityMessages: Partial<Record<ForwardAction, string>> = {
  'get-hint': 'A hint is available for this step.',
  'show-example': 'An example is available for this step.',
  'show-next-step': 'A suggested next step is available.',
};

export type AssistanceSource = 'none' | 'generic' | 'misconception';

export type AssistanceView = {
  source: AssistanceSource;
  shown: AssistanceContent | null;
  forward?: ForwardAction;
  reopen?: AssistanceContent;
  current: AssistanceContent | null;
  promptSeen: boolean;
  hintSeen: boolean;
  exampleSeen: boolean;
  nextStepSeen: boolean;
  repeatedDifficulty: number;
  hint: ExposureStatus;
  example: ExposureStatus;
  nextStep: ExposureStatus;
};

const emptyEntry: AssistanceEntry = { promptSeen: false, nextStepSeen: false, misconceptions: {} };
const emptySupport: MisconceptionSupport = { hintSeen: false, exampleSeen: false, occurrences: 0 };

export const entryFor = (state: PracticeState): AssistanceEntry =>
  state.assistance.history[currentExpression(state)] ?? emptyEntry;

export const supportFor = (state: PracticeState): MisconceptionSupport =>
  (state.diagnosis && entryFor(state).misconceptions[state.diagnosis]) || emptySupport;

// What help can be asked for next depends only on what has already been shown for this state, never on
// time or on how often a mistake repeats. A repeated misconception therefore changes what is available
// (a seen hint leads straight to the example) without revealing anything by itself.
export function assistanceView(state: PracticeState): AssistanceView {
  const entry = entryFor(state);
  const support = supportFor(state);
  const content = state.diagnosis ? contentFor(state.question, state.diagnosis) : undefined;
  const canExample = Boolean(content?.example);
  const canNextStep = canExample && nextStepFor(state.question, currentExpression(state)) !== undefined;
  const source: AssistanceSource = state.diagnosis
    ? 'misconception'
    : entry.promptSeen || state.lastResult?.kind === 'unrecognised'
      ? 'generic'
      : 'none';

  let forward: ForwardAction | undefined;
  if (state.diagnosis) {
    if (!support.hintSeen) forward = 'get-hint';
    else if (!support.exampleSeen && canExample) forward = 'show-example';
    else if (support.exampleSeen && canNextStep) forward = 'show-next-step';
  } else if (!entry.promptSeen && genericHintFor(state.question, currentExpression(state)) !== undefined) {
    forward = 'need-help';
  }

  const { shown } = state.assistance;
  let reopen: AssistanceContent | undefined;
  if (support.exampleSeen && shown !== 'example') reopen = 'example';
  else if (support.hintSeen && shown !== 'hint') reopen = 'hint';
  else if (entry.promptSeen && shown !== 'prompt') reopen = 'prompt';

  const base: AssistanceView = {
    source,
    shown,
    forward,
    reopen,
    current: support.exampleSeen ? 'example' : support.hintSeen ? 'hint' : entry.promptSeen ? 'prompt' : null,
    promptSeen: entry.promptSeen,
    hintSeen: support.hintSeen,
    exampleSeen: support.exampleSeen,
    nextStepSeen: entry.nextStepSeen,
    repeatedDifficulty: support.occurrences,
    hint: shown === 'hint' || shown === 'prompt' ? 'visible' : forward === 'need-help' || forward === 'get-hint' ? 'available' : 'hidden',
    example: shown === 'example' ? 'visible' : forward === 'show-example' ? 'available' : 'hidden',
    nextStep: state.steps.some((step) => step.source === 'system') ? 'visible' : forward === 'show-next-step' ? 'available' : 'hidden',
  };
  if (state.completed) return { ...base, forward: undefined, reopen: undefined, current: null, hint: 'hidden', example: 'hidden', nextStep: 'hidden' };
  return base;
}

// Support currently on screen, for the inspector.
export function currentSupport(view: AssistanceView): 'None' | 'Prompt' | 'Hint' | 'Example' {
  return view.shown === 'prompt' ? 'Prompt' : view.shown === 'hint' ? 'Hint' : view.shown === 'example' ? 'Example' : 'None';
}

export type ShownHelp =
  | { kind: 'prompt' | 'hint'; text: string }
  | { kind: 'example'; example: WorkedExample };

export function shownHelp(state: PracticeState): ShownHelp | undefined {
  const { shown } = state.assistance;
  if (!shown || state.completed) return undefined;
  if (shown === 'prompt') {
    const text = genericHintFor(state.question, currentExpression(state));
    return text ? { kind: 'prompt', text } : undefined;
  }
  const content = state.diagnosis ? contentFor(state.question, state.diagnosis) : undefined;
  if (shown === 'hint') return content ? { kind: 'hint', text: content.hint } : undefined;
  return content?.example ? { kind: 'example', example: content.example } : undefined;
}
