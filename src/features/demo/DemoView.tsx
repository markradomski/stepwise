import { LearnerView } from '../learner/LearnerView';
import type { DemoState } from './demoStates';

type Props = { state: DemoState };

export function DemoView({ state }: Props) {
  const { input, help, ...view } = state;
  return (
    <LearnerView
      {...view}
      input={input && { value: input.value, focused: input.state === 'focused' }}
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
