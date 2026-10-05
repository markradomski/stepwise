import type { FeedbackKind } from '../../components/FeedbackMessage/FeedbackMessage';
import type { WorkingStepStatus } from '../../components/WorkingStep/WorkingStep';
import type { LearningState } from '../../lib/learningState';

export type DemoState = {
  id: string;
  title: string;
  progress: { current: number; total: number; complete?: boolean };
  question: { instruction: string; expression: string };
  workingSteps: Array<{ expression: string; status: WorkingStepStatus }>;
  input?: { value: string; state: 'empty' | 'focused' };
  feedback?: { kind: FeedbackKind; title?: string; message: string };
  primaryAction?: { label: string; disabled?: boolean };
  secondaryAction?: { label: string; emphasis?: 'quiet' | 'prominent' };
  completed?: boolean;
  inspector?: LearningState;
};

const baseState = {
  progress: { current: 2, total: 3 },
  question: { instruction: 'Solve the equation.', expression: '3(x + 2) = 18' },
};

const partialDistributionState: DemoState = {
  ...baseState,
  id: '04',
  title: 'Repeated misconception',
  workingSteps: [{ expression: '3x + 2 = 18', status: 'incorrect' }],
  feedback: {
    kind: 'error',
    title: 'Have another look',
    message: 'Remember: the number outside the brackets multiplies every term inside.',
  },
  primaryAction: { label: 'Try again' },
  secondaryAction: { label: 'Show an example', emphasis: 'prominent' },
};

export const demoStates: DemoState[] = [
  {
    ...baseState,
    id: '01',
    title: 'Untouched question',
    workingSteps: [],
    input: { value: '', state: 'empty' },
    primaryAction: { label: 'Check' },
  },
  {
    ...baseState,
    id: '02',
    title: 'Valid step accepted',
    workingSteps: [{ expression: '3x + 6 = 18', status: 'accepted' }],
    input: { value: '', state: 'focused' },
    primaryAction: { label: 'Check' },
  },
  {
    ...baseState,
    id: '03',
    title: 'First incorrect attempt',
    workingSteps: [{ expression: '3x + 2 = 18', status: 'incorrect' }],
    feedback: {
      kind: 'error',
      title: 'Have another look',
      message: 'Check what the 3 multiplies inside the brackets.',
    },
    primaryAction: { label: 'Try again' },
    secondaryAction: { label: 'Need a hint?', emphasis: 'quiet' },
  },
  partialDistributionState,
  {
    ...baseState,
    id: '05',
    title: 'Completed question',
    progress: { current: 2, total: 3, complete: true },
    workingSteps: [
      { expression: '3x + 6 = 18', status: 'accepted' },
      { expression: '3x = 12', status: 'accepted' },
      { expression: 'x = 4', status: 'accepted' },
    ],
    feedback: { kind: 'success', title: 'Solved', message: 'x = 4 makes both sides equal 18.' },
    primaryAction: { label: 'Next question' },
    completed: true,
  },
  {
    ...partialDistributionState,
    id: '06',
    title: 'Learning State inspector',
    inspector: {
      concept: 'Linear equations',
      strategy: 'Distribution',
      attempt: 2,
      misconception: 'Partial distribution',
      repeatedMisconceptionCount: 2,
      hintLevel: { current: 2, max: 3 },
      masteryEstimate: 0.61,
      intervention: 'Concept reminder',
      exposure: {
        mastery: 'hidden',
        misconceptionLabel: 'hidden',
        nextSolutionStep: 'hidden',
        hint: 'visible',
        workedExample: 'available',
      },
    },
  },
];

export function getDemoState(id: string): DemoState {
  const state = demoStates.find((candidate) => candidate.id === id);
  if (!state) throw new Error(`Unknown demo state: ${id}`);
  return state;
}
