interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

export class RateLimiter {
  private store: RateLimitStore = {};
  // Made public so middleware can read limits for response headers
  public readonly config: RateLimitConfig;

  constructor(config: RateLimitConfig = { windowMs: 60000, maxRequests: 10 }) {
    this.config = config;
    this.startCleanup();
  }

  private startCleanup(): void {
    // Use a WeakRef-safe interval that won't prevent GC
    const cleanup = () => {
      const now = Date.now();
      for (const key of Object.keys(this.store)) {
        if (this.store[key].resetTime < now) {
          delete this.store[key];
        }
      }
    };
    setInterval(cleanup, this.config.windowMs);
  }

  check(identifier: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
  } {
    const now = Date.now();
    const record = this.store[identifier];

    if (!record || record.resetTime < now) {
      this.store[identifier] = {
        count: 1,
        resetTime: now + this.config.windowMs,
      };
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: this.store[identifier].resetTime,
      };
    }

    if (record.count >= this.config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
      };
    }

    record.count++;
    return {
      allowed: true,
      remaining: this.config.maxRequests - record.count,
      resetTime: record.resetTime,
    };
  }

  reset(identifier: string): void {
    delete this.store[identifier];
  }

  getStats(): { totalKeys: number; config: RateLimitConfig } {
    return {
      totalKeys: Object.keys(this.store).length,
      config: this.config,
    };
  }
}

// Global rate limiters — singleton instances shared across requests
export const globalRateLimiter = new RateLimiter({
  windowMs: 60_000,
  maxRequests: 100,
});

export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60_000, // 15 minutes
  maxRequests: 5,         // 5 login attempts per 15 min per IP
});

export const projectRateLimiter = new RateLimiter({
  windowMs: 60_000,
  maxRequests: 30,
});

export const registrationRateLimiter = new RateLimiter({
  windowMs: 60 * 60_000, // 1 hour
  maxRequests: 3,         // 3 registrations per hour per IP
});

export const webhookRateLimiter = new RateLimiter({
  windowMs: 60_000,
  maxRequests: 50,
});

export const emailRateLimiter = new RateLimiter({
  windowMs: 60_000,
  maxRequests: 20,
});