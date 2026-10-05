import { useCallback, useRef, useState } from 'react';
import type { PracticeQuestion } from '../practice/practiceQuestion';
import { buildExplanationRequest } from './buildExplanationRequest';
import { targetKey } from './explanationTargets';
import type { ExplanationService, ResolutionMeta } from './explanationResolver';
import type { ExplanationResult, ExplanationTarget } from './explanationTypes';

export type ExplanationUIState = {
  target: ExplanationTarget | null;
  status: 'closed' | 'loading' | 'ready' | 'unavailable' | 'error';
  result?: ExplanationResult;
  meta?: ResolutionMeta;
};

const closed: ExplanationUIState = { target: null, status: 'closed' };

// Trusted state -> request -> service (provider, validation, fallback) -> UI. Provider output reaches
// rendering only as a validated ExplanationResult.
export function useExplanation(service: ExplanationService) {
  const [state, setState] = useState<ExplanationUIState>(closed);
  const latest = useRef(0);
  const inFlight = useRef<string | null>(null);

  const close = useCallback(() => {
    latest.current += 1;
    inFlight.current = null;
    setState(closed);
  }, []);

  const request = useCallback(
    async (target: ExplanationTarget, question: PracticeQuestion) => {
      const key = targetKey(target);
      if (inFlight.current === key) return;
      inFlight.current = key;
      const id = ++latest.current;
      const settle = (next: ExplanationUIState) => {
        if (id !== latest.current) return;
        inFlight.current = null;
        setState(next);
      };
      setState({ target, status: 'loading' });
      const resolution = await service.resolve(buildExplanationRequest(target, question));
      if (resolution.status === 'ready') {
        return settle({ target, status: 'ready', result: resolution.result, meta: resolution.meta });
      }
      const status = resolution.meta.reason === 'unavailable' ? 'unavailable' : 'error';
      settle({ target, status, meta: resolution.meta });
    },
    [service],
  );

  const isOpen = (target: ExplanationTarget | undefined) =>
    Boolean(target && state.target && targetKey(state.target) === targetKey(target));

  return { state, request, close, isOpen };
}
