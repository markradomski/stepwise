import { validateExplanationResult } from '../validateExplanation';
import type { EvaluationCase } from './corpus';

export type CheckResult = {
  schema: boolean;
  boundary: boolean;
  grounded: boolean;
  pedagogy: boolean;
  authorship: boolean | null;
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

export function checkExplanation(testCase: EvaluationCase, output: unknown): CheckResult {
  const notes: string[] = [];
  const validated = validateExplanationResult(output);
  if (!validated.ok) {
    return { schema: false, boundary: false, grounded: false, pedagogy: false, authorship: null, notes: [`schema: ${validated.reason}`] };
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

  return { schema: true, boundary, grounded, pedagogy, authorship, notes };
}
