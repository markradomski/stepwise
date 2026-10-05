import { LearnerView } from '../learner/LearnerView';
import type { DemoState } from './demoStates';

type Props = { state: DemoState };

export function DemoView({ state }: Props) {
  const { input, ...view } = state;
  return (
    <LearnerView
      {...view}
      input={input && { value: input.value, focused: input.state === 'focused' }}
    />
  );
}
