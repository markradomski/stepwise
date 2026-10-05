import {
  REQUEST_VERSION,
  type ExplanationRequest,
  type ExplanationTargetKind,
} from './explanationTypes';

const targetKinds: ExplanationTargetKind[] = ['misconception', 'hint', 'example', 'suggested-step', 'accepted-step'];
const misconceptions = ['PARTIAL_DISTRIBUTION', 'INCORRECT_INVERSE_OPERATION', 'ARITHMETIC_ERROR'];

const MAX = { questionId: 64, expression: 200, label: 60, content: 400 } as const;
const allowedKeys = new Set([
  'version',
  'questionId',
  'targetKind',
  'currentExpression',
  'learnerExpression',
  'canonicalExpression',
  'misconceptionId',
  'deterministicLabel',
  'deterministicContent',
]);

export type RequestValidation = { ok: true; value: ExplanationRequest } | { ok: false; reason: string };

const str = (value: unknown, max: number, required = false): string | undefined | null => {
  if (value === undefined) return required ? null : undefined;
  return typeof value === 'string' && value.length <= max && (!required || value.trim() !== '') ? value : null;
};

// The server never trusts the browser, even though this app built the request: it checks shape, enums
// and sizes, and rejects any field it does not know, so nothing like a prompt can ride along.
export function validateExplanationRequest(input: unknown): RequestValidation {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return { ok: false, reason: 'shape' };
  const record = input as Record<string, unknown>;
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) return { ok: false, reason: 'unknown-field' };
  if (record.version !== REQUEST_VERSION) return { ok: false, reason: 'version' };
  if (!targetKinds.includes(record.targetKind as ExplanationTargetKind)) return { ok: false, reason: 'target-kind' };
  if (record.misconceptionId !== undefined && !misconceptions.includes(record.misconceptionId as string)) {
    return { ok: false, reason: 'misconception' };
  }

  const questionId = str(record.questionId, MAX.questionId, true);
  const currentExpression = str(record.currentExpression, MAX.expression, true);
  const learnerExpression = str(record.learnerExpression, MAX.expression);
  const canonicalExpression = str(record.canonicalExpression, MAX.expression);
  const deterministicLabel = str(record.deterministicLabel, MAX.label);
  const deterministicContent = str(record.deterministicContent, MAX.content);
  if (
    questionId === null ||
    currentExpression === null ||
    learnerExpression === null ||
    canonicalExpression === null ||
    deterministicLabel === null ||
    deterministicContent === null
  ) {
    return { ok: false, reason: 'field' };
  }

  return {
    ok: true,
    value: {
      version: REQUEST_VERSION,
      questionId: questionId as string,
      targetKind: record.targetKind as ExplanationTargetKind,
      currentExpression: currentExpression as string,
      ...(learnerExpression !== undefined && { learnerExpression }),
      ...(canonicalExpression !== undefined && { canonicalExpression }),
      ...(record.misconceptionId !== undefined && { misconceptionId: record.misconceptionId as ExplanationRequest['misconceptionId'] }),
      ...(deterministicLabel !== undefined && { deterministicLabel }),
      ...(deterministicContent !== undefined && { deterministicContent }),
    },
  };
}
