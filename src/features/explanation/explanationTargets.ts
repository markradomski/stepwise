import { assistanceView } from '../practice/assistance';
import { currentExpression, type PracticeState } from '../practice/practiceState';
import type { ExplanationTarget } from './explanationTypes';

export type ExplanationTargets = {
  misconception?: Extract<ExplanationTarget, { kind: 'misconception' }>;
  step?: Extract<ExplanationTarget, { kind: 'accepted-step' | 'suggested-step' }>;
  help?: Extract<ExplanationTarget, { kind: 'hint' | 'example' }>;
};

// Targets exist only for content that is on screen now. A question that is complete explains nothing.
export function explanationTargets(state: PracticeState): ExplanationTargets {
  if (state.completed) return {};
  const questionId = state.question.id;
  const expression = currentExpression(state);
  const targets: ExplanationTargets = {};

  const attempt = state.rejectedExpression;
  if (state.diagnosis && state.lastResult?.kind === 'misconception' && attempt) {
    targets.misconception = {
      kind: 'misconception',
      questionId,
      expression,
      misconceptionId: state.diagnosis,
      learnerExpression: attempt,
    };
  }

  // While an attempt is being worked on, the attempt is what needs attention, not the previous line.
  const last = state.steps.at(-1);
  if (last && !attempt) {
    const previous = state.steps.at(-2)?.canonicalExpression ?? state.question.initialExpression;
    targets.step =
      last.source === 'system'
        ? { kind: 'suggested-step', questionId, fromExpression: previous, suggestedExpression: last.canonicalExpression }
        : {
            kind: 'accepted-step',
            questionId,
            previousExpression: previous,
            submittedExpression: last.expression,
            canonicalExpression: last.canonicalExpression,
          };
  }

  const { shown } = assistanceView(state);
  if (state.diagnosis && (shown === 'hint' || shown === 'example')) {
    targets.help = { kind: shown, questionId, expression, misconceptionId: state.diagnosis };
  }
  return targets;
}

export function targetKey(target: ExplanationTarget): string {
  switch (target.kind) {
    case 'misconception':
      return `misconception|${target.expression}|${target.misconceptionId}|${target.learnerExpression}`;
    case 'hint':
    case 'example':
      return `${target.kind}|${target.expression}|${target.misconceptionId}`;
    case 'suggested-step':
      return `suggested|${target.fromExpression}|${target.suggestedExpression}`;
    case 'accepted-step':
      return `accepted|${target.previousExpression}|${target.canonicalExpression}`;
  }
}
