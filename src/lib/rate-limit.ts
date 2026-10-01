// In-memory rate limiter. Works for single-instance deployments.
// For multi-instance production, replace with @upstash/ratelimit + Redis.

type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
  lastCleanup = now;
}

export function checkRateLimit(
  key: string,
  max: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();

  if (now - lastCleanup > 5 * 60 * 1000) cleanup();

  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1 };
  }

  if (entry.count >= max) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: max - entry.count };
}
