import { useCallback, useRef, useState } from 'react';
import type { PracticeQuestion } from '../practice/practiceQuestion';
import { buildExplanationRequest } from './buildExplanationRequest';
import { targetKey } from './explanationTargets';
import type { ExplanationProvider, ExplanationResult, ExplanationTarget } from './explanationTypes';
import { validateExplanationResult } from './validateExplanation';

export type ExplanationUIState = {
  target: ExplanationTarget | null;
  status: 'closed' | 'loading' | 'ready' | 'unavailable' | 'error';
  result?: ExplanationResult;
};

const closed: ExplanationUIState = { target: null, status: 'closed' };

// Trusted state -> request -> provider -> validation -> UI. Nothing a provider returns reaches
// rendering without passing validateExplanationResult.
export function useExplanation(provider: ExplanationProvider) {
  const [state, setState] = useState<ExplanationUIState>(closed);
  const latest = useRef(0);

  const close = useCallback(() => {
    latest.current += 1;
    setState(closed);
  }, []);

  const request = useCallback(
    async (target: ExplanationTarget, question: PracticeQuestion) => {
      const id = ++latest.current;
      const settle = (next: ExplanationUIState) => {
        if (id === latest.current) setState(next);
      };
      setState({ target, status: 'loading' });
      try {
        const outcome = await provider.explain(buildExplanationRequest(target, question));
        if (outcome.status === 'unavailable') return settle({ target, status: 'unavailable' });
        const validated = validateExplanationResult(outcome.value);
        settle(validated.ok ? { target, status: 'ready', result: validated.value } : { target, status: 'error' });
      } catch {
        settle({ target, status: 'error' });
      }
    },
    [provider],
  );

  const isOpen = (target: ExplanationTarget | undefined) =>
    Boolean(target && state.target && targetKey(state.target) === targetKey(target));

  return { state, request, close, isOpen };
}
