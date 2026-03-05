interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateLimitEntry>();

export function consumeRateLimit(
  key: string,
  options: { max: number; windowMs: number }
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + options.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: options.max - 1, resetAt };
  }

  existing.count += 1;
  buckets.set(key, existing);

  const remaining = Math.max(options.max - existing.count, 0);
  const allowed = existing.count <= options.max;
  return { allowed, remaining, resetAt: existing.resetAt };
}
