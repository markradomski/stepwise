import type { ExplainSlotProps } from '../../components/ExplanationSurface/ExplanationSurface';
import { LearnerView } from '../learner/LearnerView';
import type { DemoExplain, DemoState } from './demoStates';

type Props = { state: DemoState };

const previewExplanationId = 'preview-explanation';

function explainSlot(explain?: DemoExplain): ExplainSlotProps | undefined {
  if (!explain) return undefined;
  return {
    action: { expanded: explain.open, controls: previewExplanationId },
    surface: explain.open
      ? {
          id: previewExplanationId,
          status: explain.unavailable ? 'unavailable' : 'ready',
          title: explain.title,
          body: explain.body,
        }
      : undefined,
  };
}

export function DemoView({ state }: Props) {
  const { input, help, explain, ...view } = state;
  return (
    <LearnerView
      {...view}
      input={input && { value: input.value, focused: input.state === 'focused' }}
      explain={{ feedback: explainSlot(explain?.feedback), step: explainSlot(explain?.step) }}
      help={
        help && {
          launcher: { label: help.launcherLabel },
          surface: help.surface && {
            id: 'preview-help',
            heading: help.surface.heading,
            message: help.surface.message,
            example: help.surface.example,
            forward: help.surface.forward ? { label: help.surface.forward } : undefined,
            prior: help.surface.prior ? { label: help.surface.prior } : undefined,
          },
        }
      }
      preview
    />
  );
}
