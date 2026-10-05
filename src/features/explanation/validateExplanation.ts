import { LIMITS, OUTPUT_VERSION, type ExplanationResult } from './explanationTypes';

export type ExplanationValidation = { ok: true; value: ExplanationResult } | { ok: false; reason: string };

const allowedKeys = new Set(['version', 'title', 'body', 'example']);

const text = (value: unknown, max: number): string | undefined =>
  typeof value === 'string' && value.trim() !== '' && value.length <= max ? value.trim() : undefined;

// Everything a provider returns is untrusted: only a value that passes here may reach the UI.
export function validateExplanationResult(input: unknown): ExplanationValidation {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return { ok: false, reason: 'shape' };
  const record = input as Record<string, unknown>;
  if (Object.keys(record).some((key) => !allowedKeys.has(key))) return { ok: false, reason: 'unknown-field' };
  if (record.version !== OUTPUT_VERSION) return { ok: false, reason: 'version' };

  const title = text(record.title, LIMITS.title);
  if (!title) return { ok: false, reason: 'title' };
  const body = text(record.body, LIMITS.body);
  if (!body) return { ok: false, reason: 'body' };

  if (record.example === undefined) return { ok: true, value: { version: OUTPUT_VERSION, title, body } };
  const example = text(record.example, LIMITS.example);
  if (!example) return { ok: false, reason: 'example' };
  return { ok: true, value: { version: OUTPUT_VERSION, title, body, example } };
}
