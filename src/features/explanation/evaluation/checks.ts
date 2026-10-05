import { practiceQuestions } from '../../practice/questions';
import { validateExplanationResult } from '../validateExplanation';
import type { EvaluationCase } from './corpus';

export type CheckResult = {
  schema: boolean;
  boundary: boolean;
  grounded: boolean;
  pedagogy: boolean;
  authorship: boolean | null;
  // Heuristic signals. They are conservative pattern checks, not judgements of meaning.
  futureLeak: boolean;
  concision: 0 | 1 | 2;
  restatesHint: boolean;
  characters: number;
  notes: string[];
};

export const normalise = (text: string) =>
  text.replace(/[−–]/g, '-').replace(/[×]/g, '*').replace(/\s+/g, ' ').trim();

const boundaryPatterns: Array<[RegExp, string]> = [
  [/\b(is|are|was|were) (correct|incorrect|wrong|right)\b/i, 'judges correctness'],
  [/\b(your|the) answer\b/i, 'comments on the answer'],
  [/\b(AI|LLM|language model|prompt|instruction|assistant)\b/, 'mentions the system'],
  [/\b(mastery|score|scoring|misconception|diagnos\w*|escalat\w*|canonical|progress)\b/i, 'internal terminology'],
  [/\byou (forgot|should have|made the mistake|got it wrong|failed)\b/i, 'blames the learner'],
  [/\b(great job|well done|excellent|perfect|fantastic)\b/i, 'excessive praise'],
  [/[<>]|https?:|\]\(/, 'markup or links'],
];

const tokens = (text: string) => new Set(normalise(text).toLowerCase().split(/[^a-z0-9=+*/()-]+/).filter(Boolean));

// Word-overlap (Jaccard) between two texts. A rough restatement signal only.
export function similarity(a: string, b: string): number {
  const left = tokens(a);
  const right = tokens(b);
  const shared = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : shared / union;
}

// Expressions of the question that come after what the request supplied: a rough list of solution steps
// not yet revealed to the learner.
export function futureExpressions(testCase: EvaluationCase): string[] {
  const { request } = testCase;
  const question = practiceQuestions.find((candidate) => candidate.id === request.questionId);
  if (!question) return [];
  const supplied = new Set([request.currentExpression, request.canonicalExpression, request.learnerExpression].filter(Boolean) as string[]);
  const frontier = request.targetKind === 'suggested-step' || request.targetKind === 'accepted-step' ? request.canonicalExpression : request.currentExpression;
  const seen = new Set<string>();
  const walk = (expression?: string) => {
    for (const next of (expression && question.transitions[expression]) || []) {
      if (!seen.has(next)) {
        seen.add(next);
        walk(next);
      }
    }
  };
  walk(frontier);
  return [...seen].filter((expression) => !supplied.has(expression));
}

export function checkExplanation(testCase: EvaluationCase, output: unknown): CheckResult {
  const notes: string[] = [];
  const validated = validateExplanationResult(output);
  if (!validated.ok) {
    return { schema: false, boundary: false, grounded: false, pedagogy: false, authorship: null, futureLeak: false, concision: 0, restatesHint: false, characters: 0, notes: [`schema: ${validated.reason}`] };
  }
  const text = normalise(`${validated.value.title} ${validated.value.body} ${validated.value.example ?? ''}`);
  const { expect, request } = testCase;

  let boundary = true;
  for (const [pattern, label] of boundaryPatterns) {
    if (pattern.test(text)) {
      boundary = false;
      notes.push(`boundary: ${label}`);
    }
  }
  for (const claim of expect.forbidden) {
    if (text.includes(normalise(claim))) {
      boundary = false;
      notes.push(`boundary: states "${claim}"`);
    }
  }

  let authorship: boolean | null = null;
  if (expect.authorship) {
    const { canonical } = expect.authorship;
    authorship = !new RegExp(`\\b(you|your)\\b[^.]{0,20}\\b(wrote|typed|entered|put)\\b[^.]{0,12}${canonical.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(text);
    if (!authorship) {
      boundary = false;
      notes.push('authorship: claims the canonical form was typed');
    }
  }

  const conceptsOk = expect.concepts.every((group) => group.some((pattern) => pattern.test(text)));
  const mentionsOk = expect.mentions.length === 0 || expect.mentions.some((expression) => text.includes(normalise(expression)));
  const grounded = conceptsOk && mentionsOk;
  if (!conceptsOk) notes.push('grounding: missing an expected concept');
  if (!mentionsOk) notes.push('grounding: does not refer to the supplied expressions');

  const content = request.deterministicContent ? normalise(request.deterministicContent) : undefined;
  const restates = content !== undefined && text.includes(content);
  const explainsWhy = /(because|so |since|keeps|balanc|equal|means|gives|leaves|undo|isolat)/i.test(text);
  const pedagogy = explainsWhy && !restates;
  if (!pedagogy) notes.push(restates ? 'pedagogy: restates the hint' : 'pedagogy: does not explain why');

  const future = futureExpressions(testCase).filter((expression) => text.includes(normalise(expression)));
  const futureLeak = future.length > 0;
  if (futureLeak) notes.push(`heuristic: names a later step (${future.join(', ')})`);
  const characters = validated.value.body.length;
  const concision = characters <= 220 ? 2 : characters <= 380 ? 1 : 0;
  const restatesHint = content !== undefined && (restates || similarity(text, content) > 0.8);

  return { schema: true, boundary, grounded, pedagogy, authorship, futureLeak, concision, restatesHint, characters, notes };
}
