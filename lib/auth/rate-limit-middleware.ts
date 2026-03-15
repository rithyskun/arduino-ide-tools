import { NextRequest, NextResponse } from 'next/server';
import {
  RateLimiter,
  authRateLimiter,
  projectRateLimiter,
  registrationRateLimiter,
  globalRateLimiter,
} from './rate-limit';
import { addSecurityHeaders, addNoCacheHeaders } from './security';

export interface RateLimitMiddlewareOptions {
  limiter: RateLimiter;
  keyGenerator?: (req: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  return forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
}

export function createRateLimitMiddleware(options: RateLimitMiddlewareOptions) {
  const {
    limiter,
    keyGenerator = (req) => getClientIp(req),
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  return async (
    req: NextRequest,
    handler: () => Promise<NextResponse>
  ): Promise<NextResponse> => {
    const identifier = keyGenerator(req);
    const result = limiter.check(identifier);

    const addRateLimitHeaders = (response: NextResponse) => {
      response.headers.set(
        'X-RateLimit-Limit',
        limiter.config.maxRequests.toString()
      );
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set(
        'X-RateLimit-Reset',
        new Date(result.resetTime).toISOString()
      );
      return response;
    };

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
      const errorResponse = addSecurityHeaders(
        addNoCacheHeaders(
          NextResponse.json(
            {
              success: false,
              error: 'Too many requests. Please try again later.',
              retryAfter,
            },
            {
              status: 429,
              headers: {
                'Retry-After': retryAfter.toString(),
              },
            }
          )
        )
      );
      return addRateLimitHeaders(errorResponse);
    }

    try {
      const response = await handler();

      if (
        skipSuccessfulRequests &&
        response.status >= 200 &&
        response.status < 300
      ) {
        limiter.reset(identifier);
      }

      if (skipFailedRequests && response.status >= 400) {
        limiter.reset(identifier);
      }

      return addRateLimitHeaders(response);
    } catch (error) {
      if (skipFailedRequests) {
        limiter.reset(identifier);
      }
      const errorResponse = addSecurityHeaders(
        addNoCacheHeaders(
          NextResponse.json(
            { success: false, error: 'Internal server error' },
            { status: 500 }
          )
        )
      );
      return addRateLimitHeaders(errorResponse);
    }
  };
}

// ── Pre-built middleware instances ────────────────────────────────

export const withAuthRateLimit = createRateLimitMiddleware({
  limiter: authRateLimiter,
  keyGenerator: (req) => {
    const ip = getClientIp(req);
    return `auth:${ip}`;
  },
});

export const withProjectRateLimit = createRateLimitMiddleware({
  limiter: projectRateLimiter,
  keyGenerator: (req) => `project:${getClientIp(req)}`,
});

export const withRegistrationRateLimit = createRateLimitMiddleware({
  limiter: registrationRateLimiter,
  keyGenerator: (req) => `registration:${getClientIp(req)}`,
});

export const withGlobalRateLimit = createRateLimitMiddleware({
  limiter: globalRateLimiter,
  keyGenerator: (req) => `global:${getClientIp(req)}`,
});