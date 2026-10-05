import type { FeedbackKind } from '../../components/FeedbackMessage/FeedbackMessage';
import type { WorkingStepSource, WorkingStepStatus } from '../../components/WorkingStep/WorkingStep';
import type { LearningState } from '../../lib/learningState';

export type DemoExplain = { open: boolean; title?: string; body?: string; unavailable?: boolean };

export type DemoState = {
  id: string;
  title: string;
  shortTitle: string;
  progress: { currentQuestion: number; totalQuestions: number };
  question: { instruction: string; expression: string };
  workingSteps: Array<{ expression: string; status: WorkingStepStatus; source?: WorkingStepSource }>;
  input?: { value: string; state: 'empty' | 'focused' };
  feedback?: { kind: FeedbackKind; title?: string; message: string };
  completion?: { title: string; message: string; actionLabel: string };
  primaryAction?: { label: string; disabled?: boolean };
  help?: {
    launcherLabel: string;
    surface?: {
      heading: 'Help' | 'Prompt' | 'Hint' | 'Example';
      message?: string;
      example?: { before: string; after: string; explanation: string };
      forward?: string;
      prior?: string;
    };
  };
  explain?: { feedback?: DemoExplain; step?: DemoExplain };
  completed?: boolean;
  inspector?: LearningState;
};

const baseState = {
  progress: { currentQuestion: 2, totalQuestions: 3 },
  question: { instruction: 'Solve the equation one step at a time.', expression: '3(x + 2) = 18' },
};

const partialDistributionState: DemoState = {
  ...baseState,
  id: '04',
  shortTitle: 'Repeated misconception',
  title: 'Repeated misconception',
  workingSteps: [{ expression: '3x + 2 = 18', status: 'incorrect' }],
  feedback: {
    kind: 'error',
    title: 'Have another look',
    message: 'Remember: the number outside the brackets multiplies every term inside.',
  },
  input: { value: '3x + 2 = 18', state: 'empty' },
  primaryAction: { label: 'Check step' },
  help: { launcherLabel: 'Help' },
};

const firstMisconceptionState: DemoState = {
    ...baseState,
    id: '03',
    shortTitle: 'First misconception',
    title: 'First incorrect attempt',
    workingSteps: [{ expression: '3x + 2 = 18', status: 'incorrect' }],
    feedback: {
      kind: 'error',
      title: 'Have another look',
      message: 'Check what the 3 multiplies inside the brackets.',
    },
    input: { value: '3x + 2 = 18', state: 'empty' },
    primaryAction: { label: 'Check step' },
    help: { launcherLabel: 'Need help?' },
  };

export const demoStates: DemoState[] = [
  {
    ...baseState,
    id: '01',
    shortTitle: 'Untouched',
    title: 'Untouched question',
    workingSteps: [],
    input: { value: '', state: 'empty' },
    primaryAction: { label: 'Check step' },
    help: { launcherLabel: 'Need help?' },
  },
  {
    ...baseState,
    id: '02',
    shortTitle: 'Accepted',
    title: 'Valid step accepted',
    workingSteps: [{ expression: '3x + 6 = 18', status: 'accepted' }],
    input: { value: '', state: 'focused' },
    primaryAction: { label: 'Check step' },
  },
  firstMisconceptionState,
  partialDistributionState,
  {
    ...baseState,
    id: '05',
    shortTitle: 'Complete',
    title: 'Completed question',
    workingSteps: [
      { expression: '3x + 6 = 18', status: 'accepted' },
      { expression: '3x = 12', status: 'accepted' },
      { expression: 'x = 4', status: 'accepted' },
    ],
    completion: { title: 'Question complete', message: 'You finished this question.', actionLabel: 'Next question' },
    completed: true,
  },
  {
    ...partialDistributionState,
    id: '06',
    shortTitle: 'Inspector',
    title: 'Learning State inspector',
    inspector: {
      concept: 'Linear equations',
      strategy: 'Distribution',
      attempt: 2,
      misconception: 'Partial distribution',
      repeatedMisconceptionCount: 2,
      hintLevel: { current: 0, max: 3 },
      masteryEstimate: 0.61,
      intervention: 'None',
      assistance: {
        source: 'Misconception',
        currentSupport: 'None',
        forwardAction: 'Show an example',
        promptSeen: 'No',
        hintSeen: 'Yes',
        exampleSeen: 'No',
        nextStepSeen: 'No',
        repeatedDifficulty: 2,
      },
      exposure: {
        mastery: 'hidden',
        misconceptionLabel: 'hidden',
        nextSolutionStep: 'hidden',
        hint: 'hidden',
        workedExample: 'available',
      },
    },
  },
  {
    ...baseState,
    id: '07',
    shortTitle: 'Prompt open',
    title: 'Help open with a prompt',
    workingSteps: [],
    input: { value: '', state: 'empty' },
    primaryAction: { label: 'Check step' },
    help: {
      launcherLabel: 'Help',
      surface: { heading: 'Prompt', message: 'Think about how you could make the equation simpler.' },
    },
  },
  {
    ...baseState,
    id: '08',
    shortTitle: 'Hint open',
    title: 'Help open with a hint',
    workingSteps: [{ expression: '3x + 2 = 18', status: 'incorrect' }],
    feedback: partialDistributionState.feedback,
    input: { value: '3x + 2 = 18', state: 'empty' },
    primaryAction: { label: 'Check step' },
    help: {
      launcherLabel: 'Help',
      surface: {
        heading: 'Hint',
        message: 'The 3 applies to everything inside the brackets.',
        forward: 'Show an example',
      },
    },
  },
  {
    ...baseState,
    id: '09',
    shortTitle: 'Example open',
    title: 'Help open with an example',
    workingSteps: [{ expression: '3x + 2 = 18', status: 'incorrect' }],
    feedback: partialDistributionState.feedback,
    input: { value: '3x + 2 = 18', state: 'empty' },
    primaryAction: { label: 'Check step' },
    help: {
      launcherLabel: 'Help',
      surface: {
        heading: 'Example',
        example: {
          before: '2(y + 4)',
          after: '2y + 8',
          explanation: 'The number outside the brackets multiplies each term inside.',
        },
        forward: 'Show next step',
        prior: 'View hint',
      },
    },
  },
  {
    ...baseState,
    id: '10',
    shortTitle: 'Suggested step',
    title: 'Suggested next step in the working',
    workingSteps: [{ expression: '3x + 6 = 18', status: 'accepted', source: 'system' }],
    input: { value: '', state: 'focused' },
    primaryAction: { label: 'Check step' },
    help: { launcherLabel: 'Need help?' },
  },
  { ...firstMisconceptionState, id: '11', shortTitle: 'Explain closed', title: 'Misconception with Explain this', explain: { feedback: { open: false } } },
  {
    ...firstMisconceptionState,
    id: '12',
    shortTitle: 'Explanation open',
    title: 'Misconception explanation open',
    explain: {
      feedback: {
        open: true,
        title: 'Why that step needs another look',
        body: 'The 3 needs to multiply both terms inside the brackets. In 3(x + 2), the 3 multiplies x and 2, so expanding gives 3x + 6.',
      },
    },
  },
  {
    ...baseState,
    id: '13',
    shortTitle: 'Accepted explained',
    title: 'Accepted step explanation open',
    workingSteps: [{ expression: '3x + 6 = 18', status: 'accepted' }],
    input: { value: '', state: 'focused' },
    primaryAction: { label: 'Check step' },
    help: { launcherLabel: 'Need help?' },
    explain: {
      step: {
        open: true,
        title: 'Why that step works',
        body: 'Multiplying the 3 by both x and 2 expands the brackets without changing the value, so 3(x + 2) = 18 becomes 3x + 6 = 18.',
      },
    },
  },
  {
    ...baseState,
    id: '14',
    shortTitle: 'Suggested explained',
    title: 'Suggested next step explanation open',
    workingSteps: [{ expression: '3x + 6 = 18', status: 'accepted', source: 'system' }],
    input: { value: '', state: 'focused' },
    primaryAction: { label: 'Check step' },
    help: { launcherLabel: 'Need help?' },
    explain: {
      step: {
        open: true,
        title: 'Why this step works',
        body: 'Multiplying the 3 by both x and 2 expands the brackets without changing the value, so 3(x + 2) = 18 becomes 3x + 6 = 18.',
      },
    },
  },
  {
    ...firstMisconceptionState,
    id: '15',
    shortTitle: 'Explanation unavailable',
    title: 'Explanation unavailable',
    explain: { feedback: { open: true, unavailable: true } },
  },
];

export function getDemoState(id: string): DemoState {
  const state = demoStates.find((candidate) => candidate.id === id);
  if (!state) throw new Error(`Unknown demo state: ${id}`);
  return state;
}

// State 06 is state 04 plus its inspector, so ?inspector=1 can add it to 04 as well.
export function withRequestedInspector(state: DemoState, inspectorOn: boolean): DemoState {
  if (!inspectorOn || state.inspector || state.id !== '04') return state;
  return { ...state, inspector: demoStates.find((candidate) => candidate.id === '06')?.inspector };
}
