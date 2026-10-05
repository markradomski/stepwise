import { explanationContent, misconceptionKey, transitionKey } from './explanationContent';
import {
  OUTPUT_VERSION,
  type ExplanationProvider,
  type ExplanationProviderOutcome,
  type ExplanationRequest,
  type ExplanationResult,
} from './explanationTypes';

const MAX_ECHOED_EXPRESSION = 60;

const titles = {
  misconception: 'Why that step needs another look',
  hint: 'Why this hint helps',
  example: 'Why this example helps',
  'suggested-step': 'Why this step works',
  'accepted-step': 'Why that step works',
} as const;

function misconceptionBody(request: ExplanationRequest): string | undefined {
  if (!request.misconceptionId) return undefined;
  return explanationContent[request.questionId]?.misconceptions[
    misconceptionKey(request.currentExpression, request.misconceptionId)
  ];
}

function transitionBody(request: ExplanationRequest): string | undefined {
  if (!request.canonicalExpression) return undefined;
  return explanationContent[request.questionId]?.transitions[
    transitionKey(request.currentExpression, request.canonicalExpression)
  ];
}

function bodyFor(request: ExplanationRequest): string | undefined {
  switch (request.targetKind) {
    case 'misconception':
    case 'hint':
      return misconceptionBody(request);
    case 'example': {
      const idea = misconceptionBody(request);
      return idea && request.deterministicContent && `The example shows the same idea with different numbers. ${idea}`;
    }
    case 'suggested-step':
      return transitionBody(request);
    case 'accepted-step': {
      const body = transitionBody(request);
      const { learnerExpression, canonicalExpression } = request;
      // The learner's own wording is kept: an equivalent form is described as equivalent, never as what they typed.
      const equivalent =
        learnerExpression &&
        canonicalExpression &&
        learnerExpression !== canonicalExpression &&
        learnerExpression.length <= MAX_ECHOED_EXPRESSION;
      return body && (equivalent ? `${body} You wrote ${learnerExpression}, which is equivalent to ${canonicalExpression}.` : body);
    }
  }
}

export const deterministicExplanationProvider: ExplanationProvider = {
  id: 'deterministic',
  label: 'Deterministic',
  supports: (request) => bodyFor(request) !== undefined,
  async explain(request): Promise<ExplanationProviderOutcome> {
    const body = bodyFor(request);
    if (!body) return { status: 'unavailable' };
    const value: ExplanationResult = { version: OUTPUT_VERSION, title: titles[request.targetKind], body };
    return { status: 'ok', value };
  },
};
