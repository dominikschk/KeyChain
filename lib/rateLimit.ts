/**
 * In-memory rate limit for Edge Functions (best-effort per isolate).
 * Not a substitute for Cloudflare — just slows abuse of draft-order creation.
 */

export type RateLimitResult = {
  allowed: boolean
  remaining: number
  retryAfterSec: number
}

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export function checkRateLimit(
  key: string,
  opts: { limit: number; windowMs: number; now?: number } = { limit: 20, windowMs: 60_000 }
): RateLimitResult {
  const now = opts.now ?? Date.now()
  const limit = Math.max(1, opts.limit)
  const windowMs = Math.max(1000, opts.windowMs)

  // Opportunistic cleanup
  if (buckets.size > 5000) {
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k)
    }
  }

  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, remaining: limit - 1, retryAfterSec: Math.ceil(windowMs / 1000) }
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }

  existing.count += 1
  buckets.set(key, existing)
  return {
    allowed: true,
    remaining: Math.max(0, limit - existing.count),
    retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  }
}

/** Reset (tests only). */
export function resetRateLimitBuckets(): void {
  buckets.clear()
}
