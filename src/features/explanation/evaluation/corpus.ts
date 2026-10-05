import { buildExplanationRequest } from '../buildExplanationRequest';
import type { ExplanationRequest, ExplanationTarget } from '../explanationTypes';
import { practiceQuestions } from '../../practice/questions';

const [q1, q2, q3] = practiceQuestions;

export type EvaluationCase = {
  id: string;
  description: string;
  request: ExplanationRequest;
  // Deterministic expectations. These describe what a sound explanation must and must not do; they are
  // not a single correct sentence.
  expect: {
    supported: boolean;
    // Each group needs at least one match.
    concepts: RegExp[][];
    // At least one of these expressions from the request should appear.
    mentions: string[];
    forbidden: string[];
    authorship?: { learner: string; canonical: string };
  };
};

const make = (id: string, description: string, target: ExplanationTarget, expectation: EvaluationCase['expect']) => {
  const question = practiceQuestions.find((candidate) => candidate.id === target.questionId) ?? q1;
  return { id, description, request: buildExplanationRequest(target, question), expect: expectation };
};

const balanced = [/both sides/i, /equal|balanc/i];

export const corpus: EvaluationCase[] = [
  make('q1-misconception-partial-distribution', 'Q1 partial distribution', {
    kind: 'misconception', questionId: q1.id, expression: '3(x + 2) = 18', misconceptionId: 'PARTIAL_DISTRIBUTION', learnerExpression: '3x + 2 = 18',
  }, { supported: true, concepts: [[/multipl/i], [/both|every|each/i], [/bracket/i]], mentions: ['3(x + 2)'], forbidden: ['x = 4', '3x + 6'] }),
  make('q1-accepted-divide', 'Q1 accepted divide-both-sides step', {
    kind: 'accepted-step', questionId: q1.id, previousExpression: '3(x + 2) = 18', submittedExpression: 'x + 2 = 6', canonicalExpression: 'x + 2 = 6',
  }, { supported: true, concepts: [[/divid/i], balanced], mentions: ['x + 2 = 6'], forbidden: ['x = 4'] }),
  make('q1-suggested-step', 'Q1 suggested next step', {
    kind: 'suggested-step', questionId: q1.id, fromExpression: '3(x + 2) = 18', suggestedExpression: 'x + 2 = 6',
  }, { supported: true, concepts: [[/divid/i], balanced], mentions: ['x + 2 = 6'], forbidden: ['x = 4'] }),
  make('q2-misconception-inverse-operation', 'Q2 inverse operation', {
    kind: 'misconception', questionId: q2.id, expression: '2x + 5 = 17', misconceptionId: 'INCORRECT_INVERSE_OPERATION', learnerExpression: '2x = 22',
  }, { supported: true, concepts: [[/take|subtract|undo/i], [/both sides/i]], mentions: ['2x + 5 = 17', '+ 5'], forbidden: ['x = 6', '2x = 12'] }),
  make('q2-accepted-subtraction', 'Q2 accepted subtraction step', {
    kind: 'accepted-step', questionId: q2.id, previousExpression: '2x + 5 = 17', submittedExpression: '2x = 12', canonicalExpression: '2x = 12',
  }, { supported: true, concepts: [[/subtract/i], balanced], mentions: ['2x = 12'], forbidden: ['x = 6'] }),
  make('q2-accepted-equivalent-form', 'Q2 equivalent learner form', {
    kind: 'accepted-step', questionId: q2.id, previousExpression: '2x + 5 = 17', submittedExpression: '2x = 17 - 5', canonicalExpression: '2x = 12',
  }, {
    supported: true,
    concepts: [[/subtract/i], balanced, [/equivalent/i]],
    mentions: ['17 - 5', '2x = 12'],
    forbidden: ['x = 6'],
    authorship: { learner: '2x = 17 - 5', canonical: '2x = 12' },
  }),
  make('q2-accepted-division', 'Q2 accepted division step', {
    kind: 'accepted-step', questionId: q2.id, previousExpression: '2x = 12', submittedExpression: 'x = 6', canonicalExpression: 'x = 6',
  }, { supported: true, concepts: [[/divid/i], [/both sides/i]], mentions: ['x = 6', '2x = 12'], forbidden: [] }),
  make('q3-misconception-partial-distribution', 'Q3 partial distribution', {
    kind: 'misconception', questionId: q3.id, expression: '4(x - 1) = 20', misconceptionId: 'PARTIAL_DISTRIBUTION', learnerExpression: '4x - 1 = 20',
  }, { supported: true, concepts: [[/multipl/i], [/both|every|each/i], [/bracket/i]], mentions: ['4(x - 1)'], forbidden: ['x = 6', '4x - 4'] }),
  make('q3-accepted-distribution', 'Q3 accepted distribution step', {
    kind: 'accepted-step', questionId: q3.id, previousExpression: '4(x - 1) = 20', submittedExpression: '4x - 4 = 20', canonicalExpression: '4x - 4 = 20',
  }, { supported: true, concepts: [[/multipl/i], [/both|each|every/i]], mentions: ['4x - 4 = 20'], forbidden: ['x = 6'] }),
  make('q3-suggested-step', 'Q3 suggested next step', {
    kind: 'suggested-step', questionId: q3.id, fromExpression: '4(x - 1) = 20', suggestedExpression: 'x - 1 = 5',
  }, { supported: true, concepts: [[/divid/i], balanced], mentions: ['x - 1 = 5'], forbidden: ['x = 6'] }),
  make('q2-misconception-arithmetic', 'Q2 arithmetic misconception', {
    kind: 'misconception', questionId: q2.id, expression: '2x = 12', misconceptionId: 'ARITHMETIC_ERROR', learnerExpression: 'x = 5',
  }, { supported: true, concepts: [[/divid|÷/i]], mentions: ['12'], forbidden: [] }),
  make('q1-unsupported-skipped-step', 'Unsupported target: a skipped transition has no mapped explanation', {
    kind: 'accepted-step', questionId: q1.id, previousExpression: '3x + 6 = 18', submittedExpression: 'x = 4', canonicalExpression: 'x = 4',
  }, { supported: false, concepts: [], mentions: [], forbidden: [] }),
];
