import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter } from './rate-limit';
import { addSecurityHeaders, addNoCacheHeaders } from './security';
import { logger } from '@/lib/logger';

export interface RateLimitMiddlewareOptions {
  limiter: RateLimiter;
  keyGenerator?: (req: NextRequest) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export function createRateLimitMiddleware(options: RateLimitMiddlewareOptions) {
  const {
    limiter,
    keyGenerator = (req) => {
      // Use IP address as default identifier
      const forwarded = req.headers.get('x-forwarded-for');
      const realIp = req.headers.get('x-real-ip');
      const ip = forwarded?.split(',')[0] || realIp || 'unknown';
      return ip;
    },
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  return async (
    req: NextRequest,
    handler: () => Promise<NextResponse>
  ): Promise<NextResponse> => {
    const identifier = keyGenerator(req);
    const result = limiter.check(identifier);

    // Add rate limit headers to all responses
    const addRateLimitHeaders = (response: NextResponse) => {
      response.headers.set('X-RateLimit-Limit', limiter['config'].maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      response.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
      return response;
    };

    if (!result.allowed) {
      await logger.warn('Rate limit exceeded', {
        identifier,
        limit: limiter['config'].maxRequests,
        windowMs: limiter['config'].windowMs,
        resetTime: result.resetTime,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        path: new URL(req.url).pathname,
        method: req.method,
      });

      const errorResponse = addSecurityHeaders(
        addNoCacheHeaders(
          NextResponse.json(
            {
              success: false,
              error: 'Too many requests',
              retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000),
            },
            { 
              status: 429,
              headers: {
                'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
              }
            }
          )
        )
      );
      return addRateLimitHeaders(errorResponse);
    }

    try {
      const response = await handler();
      
      // Skip rate limit counting for successful requests if configured
      if (skipSuccessfulRequests && response.status >= 200 && response.status < 300) {
        limiter.reset(identifier);
      }
      
      // Skip rate limit counting for failed requests if configured
      if (skipFailedRequests && response.status >= 400) {
        limiter.reset(identifier);
      }

      return addRateLimitHeaders(response);
    } catch (error) {
      // If handler throws an error, count it as a failed request
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

// Predefined rate limit middleware for common use cases
export const withAuthRateLimit = createRateLimitMiddleware({
  limiter: authRateLimiter,
  keyGenerator: (req) => {
    // For auth endpoints, use a combination of IP and email if available
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || 'unknown';
    
    // Try to get email from request body for POST requests
    const email = req.nextUrl.searchParams.get('email') || ip;
    return `auth:${email}`;
  },
});

export const withProjectRateLimit = createRateLimitMiddleware({
  limiter: projectRateLimiter,
  keyGenerator: (req) => {
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || 'unknown';
    return `project:${ip}`;
  },
});

export const withRegistrationRateLimit = createRateLimitMiddleware({
  limiter: registrationRateLimiter,
  keyGenerator: (req) => {
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || 'unknown';
    return `registration:${ip}`;
  },
});

export const withGlobalRateLimit = createRateLimitMiddleware({
  limiter: globalRateLimiter,
  keyGenerator: (req) => {
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || 'unknown';
    return `global:${ip}`;
  },
});

// Import the rate limiters
import { authRateLimiter, projectRateLimiter, registrationRateLimiter, globalRateLimiter } from './rate-limit';
