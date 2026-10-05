import type { ExplanationRequest } from '../src/features/explanation/explanationTypes';

type Entry<T> = { value: T; expires: number };

// Small in-memory cache: bounded by entry count, expiring by TTL, least recently used out first.
export function createExplainCache<T>({ ttlMs, maxEntries, now = Date.now }: { ttlMs: number; maxEntries: number; now?: () => number }) {
  const entries = new Map<string, Entry<T>>();
  return {
    get(key: string): T | undefined {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (entry.expires <= now()) {
        entries.delete(key);
        return undefined;
      }
      entries.delete(key);
      entries.set(key, entry);
      return entry.value;
    },
    set(key: string, value: T) {
      entries.delete(key);
      entries.set(key, { value, expires: now() + ttlMs });
      while (entries.size > maxEntries) entries.delete(entries.keys().next().value as string);
    },
    get size() {
      return entries.size;
    },
  };
}

// Prompt version and model are part of the key, so changing either never serves an older answer.
export function cacheKey(promptVersion: string, model: string, request: ExplanationRequest): string {
  return JSON.stringify([
    promptVersion,
    model,
    request.version,
    request.questionId,
    request.targetKind,
    request.currentExpression,
    request.learnerExpression ?? null,
    request.canonicalExpression ?? null,
    request.misconceptionId ?? null,
    request.deterministicLabel ?? null,
    request.deterministicContent ?? null,
  ]);
}
