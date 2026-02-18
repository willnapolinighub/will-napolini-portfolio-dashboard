/**
 * Simple in-memory rate limiter for API routes.
 * For production, consider using Redis or a similar distributed store.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests per window */
  max: number;
  /** Key prefix for namespacing */
  keyPrefix?: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check rate limit for a given identifier (e.g., IP address)
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const key = `${config.keyPrefix || 'rl'}:${identifier}`;
  const now = Date.now();
  const entry = store.get(key);

  // Clean up expired entries periodically
  if (store.size > 1000) {
    for (const [k, v] of store.entries()) {
      if (v.resetTime < now) {
        store.delete(k);
      }
    }
  }

  if (!entry || entry.resetTime < now) {
    // New window
    store.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      success: true,
      limit: config.max,
      remaining: config.max - 1,
      reset: now + config.windowMs,
    };
  }

  if (entry.count >= config.max) {
    // Rate limit exceeded
    return {
      success: false,
      limit: config.max,
      remaining: 0,
      reset: entry.resetTime,
    };
  }

  // Increment count
  entry.count++;
  return {
    success: true,
    limit: config.max,
    remaining: config.max - entry.count,
    reset: entry.resetTime,
  };
}

/**
 * Extract client IP from request headers
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return 'unknown';
}

/**
 * Preset rate limiters for common use cases
 */
export const rateLimiters = {
  /** Strict limiter for auth endpoints (5 req/min) */
  auth: (ip: string) => checkRateLimit(ip, {
    windowMs: 60 * 1000,
    max: 5,
    keyPrefix: 'auth',
  }),
  
  /** Moderate limiter for chat/AI endpoints (20 req/min) */
  chat: (ip: string) => checkRateLimit(ip, {
    windowMs: 60 * 1000,
    max: 20,
    keyPrefix: 'chat',
  }),
  
  /** Lenient limiter for public API (60 req/min) */
  public: (ip: string) => checkRateLimit(ip, {
    windowMs: 60 * 1000,
    max: 60,
    keyPrefix: 'public',
  }),
};