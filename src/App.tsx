import { DemoSelector } from './features/demo/DemoSelector';
import { DemoView } from './features/demo/DemoView';
import { getDemoState } from './features/demo/demoStates';

export function App() {
  const state = getDemoState(new URLSearchParams(window.location.search).get('state'));
  return (
    <>
      <DemoView state={state} />
      <DemoSelector activeId={state.id} />
    </>
  );
}
