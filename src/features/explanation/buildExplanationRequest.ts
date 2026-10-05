import type { PracticeQuestion } from '../practice/practiceQuestion';
import { contentFor } from '../practice/scaffolding';
import { REQUEST_VERSION, type ExplanationRequest, type ExplanationTarget } from './explanationTypes';

export function buildExplanationRequest(target: ExplanationTarget, question: PracticeQuestion): ExplanationRequest {
  const base = { version: REQUEST_VERSION, questionId: target.questionId, targetKind: target.kind } as const;

  switch (target.kind) {
    case 'misconception': {
      const content = contentFor(question, target.misconceptionId);
      return {
        ...base,
        currentExpression: target.expression,
        learnerExpression: target.learnerExpression,
        misconceptionId: target.misconceptionId,
        deterministicLabel: 'Feedback',
        deterministicContent: content?.feedback.first,
      };
    }
    case 'hint': {
      const content = contentFor(question, target.misconceptionId);
      return {
        ...base,
        currentExpression: target.expression,
        misconceptionId: target.misconceptionId,
        deterministicLabel: 'Hint',
        deterministicContent: content?.hint,
      };
    }
    case 'example': {
      const example = contentFor(question, target.misconceptionId)?.example;
      return {
        ...base,
        currentExpression: target.expression,
        misconceptionId: target.misconceptionId,
        deterministicLabel: 'Example',
        deterministicContent: example && `${example.before} → ${example.after}. ${example.explanation}`,
      };
    }
    case 'suggested-step':
      return {
        ...base,
        currentExpression: target.fromExpression,
        canonicalExpression: target.suggestedExpression,
        deterministicLabel: 'Suggested next step',
      };
    case 'accepted-step':
      return {
        ...base,
        currentExpression: target.previousExpression,
        learnerExpression: target.submittedExpression,
        canonicalExpression: target.canonicalExpression,
      };
  }
}
