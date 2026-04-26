interface RateLimiterOptions {
  maxRequests: number;
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * In-memory sliding window rate limiter.
 *
 * Note: state is process-local and is reset whenever Next.js restarts.
 * For production and multi-instance deployments, use a shared store such as Redis.
 */
class SlidingWindowRateLimiter {
  // Хранит timestamp каждого запроса per key
  private windows: Map<string, number[]> = new Map();

  check(key: string, options: RateLimiterOptions): RateLimitResult {
    const now = Date.now();
    const windowStart = now - options.windowMs;

    for (const [mapKey, timestamps] of this.windows.entries()) {
      const active = timestamps.filter((timestamp) => timestamp > windowStart);
      if (active.length === 0) {
        this.windows.delete(mapKey);
      } else if (active.length !== timestamps.length) {
        this.windows.set(mapKey, active);
      }
    }

    const timestamps = this.windows.get(key) ?? [];

    if (timestamps.length >= options.maxRequests) {
      const resetAt = timestamps[0] + options.windowMs;

      if (this.windows.size > 10_000) {
        console.warn(
          `[SlidingWindowRateLimiter] key count exceeded 10,000 (current: ${this.windows.size})`
        );
      }

      return {
        allowed: false,
        remaining: 0,
        resetAt,
      };
    }

    timestamps.push(now);
    this.windows.set(key, timestamps);

    if (this.windows.size > 10_000) {
      console.warn(
        `[SlidingWindowRateLimiter] key count exceeded 10,000 (current: ${this.windows.size})`
      );
    }

    return {
      allowed: true,
      remaining: options.maxRequests - timestamps.length,
      resetAt: timestamps[0] + options.windowMs,
    };
  }
}

export const nimRateLimiter = new SlidingWindowRateLimiter();
