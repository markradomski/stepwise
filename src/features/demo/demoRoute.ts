import { demoStates } from './demoStates';

export function parseDemoRoute(search: string) {
  const params = new URLSearchParams(search);
  const demoState = demoStates.find((state) => state.id === params.get('state'));
  const devMode = params.get('dev') === '1';
  const inspectorOn = params.get('inspector') === '1';
  return {
    demoState,
    isStaticPreview: demoState !== undefined,
    devMode,
    inspectorOn,
    showDevTools: devMode || demoState !== undefined,
  };
}

export const cleanLiveHref = (inspectorOn: boolean) => (inspectorOn ? '?inspector=1' : window.location.pathname);
export const devLiveHref = (inspectorOn: boolean) => (inspectorOn ? '?dev=1&inspector=1' : '?dev=1');
export const inspectorToggleHref = (inspectorOn: boolean) => (inspectorOn ? '?dev=1' : '?dev=1&inspector=1');
export const staticPreviewHref = (id: string) => `?state=${id}`;
