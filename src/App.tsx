import { useEffect, useState } from 'react';
import styles from './App.module.css';
import { cleanLiveHref, parseDemoRoute } from './features/demo/demoRoute';
import { DemoSelector } from './features/demo/DemoSelector';
import { DemoView } from './features/demo/DemoView';
import { withRequestedInspector } from './features/demo/demoStates';
import { PreviewBanner } from './features/demo/PreviewBanner';
import { PracticeView } from './features/practice/PracticeView';

export function App() {
  const [search, setSearch] = useState(window.location.search);

  useEffect(() => {
    const syncSearch = () => setSearch(window.location.search);
    window.addEventListener('popstate', syncSearch);
    return () => window.removeEventListener('popstate', syncSearch);
  }, []);

  const navigate = (href: string) => {
    window.history.pushState(null, '', href);
    setSearch(window.location.search);
  };

  const { demoState, isStaticPreview, inspectorOn, showDevTools } = parseDemoRoute(search);

  return (
    <div className={styles.app}>
      {demoState ? <DemoView state={withRequestedInspector(demoState, inspectorOn)} /> : <PracticeView showInspector={inspectorOn} />}
      {showDevTools && (
        <div className={styles.devTools}>
          <DemoSelector demoStateId={demoState?.id ?? null} inspectorOn={inspectorOn} onNavigate={navigate} />
          {isStaticPreview && <PreviewBanner returnToLiveHref={cleanLiveHref(inspectorOn)} onNavigate={navigate} />}
        </div>
      )}
    </div>
  );
}
