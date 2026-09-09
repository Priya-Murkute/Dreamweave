const WINDOW_MS = 60_000;
const MAX_REQUESTS = 5;
const PRUNE_EVERY = 500;

const hits = new Map<string, number[]>();
let sincePrune = 0;

/**
 * In-memory, so it resets on redeploy and is per-instance. Fine for a single
 * server; swap for Redis before running more than one.
 */
export function rateLimit(key: string, now = Date.now()) {
  if (++sincePrune >= PRUNE_EVERY) {
    sincePrune = 0;
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }

  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= MAX_REQUESTS) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - recent[0])) / 1000);
    return { allowed: false as const, retryAfter };
  }

  recent.push(now);
  hits.set(key, recent);
  return { allowed: true as const, remaining: MAX_REQUESTS - recent.length };
}

/** Trusts x-forwarded-for, so only run this behind a proxy that sets it. */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export const rateLimitConfig = { WINDOW_MS, MAX_REQUESTS };
