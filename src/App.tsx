import { DemoSelector } from './features/demo/DemoSelector';
import { DemoView } from './features/demo/DemoView';
import { demoStates } from './features/demo/demoStates';
import { PracticeView } from './features/practice/PracticeView';

export function App() {
  const params = new URLSearchParams(window.location.search);
  const demoState = demoStates.find((state) => state.id === params.get('state'));
  const inspectorOn = params.get('inspector') === '1';

  return (
    <>
      {demoState ? <DemoView state={demoState} /> : <PracticeView showInspector={inspectorOn} />}
      <DemoSelector activeId={demoState?.id ?? null} inspectorOn={inspectorOn} />
    </>
  );
}
