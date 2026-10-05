// Fixed-window limiter per anonymous client key. Nothing is kept beyond the current window.
export function createRateLimiter({ max, windowMs, now = Date.now }: { max: number; windowMs: number; now?: () => number }) {
  const windows = new Map<string, { start: number; count: number }>();
  return {
    allow(clientKey: string): boolean {
      const time = now();
      if (windows.size > 1000) for (const [key, w] of windows) if (time - w.start >= windowMs) windows.delete(key);
      const current = windows.get(clientKey);
      if (!current || time - current.start >= windowMs) {
        windows.set(clientKey, { start: time, count: 1 });
        return true;
      }
      current.count += 1;
      return current.count <= max;
    },
  };
}
