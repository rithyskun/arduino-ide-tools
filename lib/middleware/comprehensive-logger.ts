import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { createRequestLogger, type RequestLogOptions } from './request-logger';

export interface ComprehensiveLogOptions extends RequestLogOptions {
  logAuthEvents?: boolean;
  logRateLimitEvents?: boolean;
  logPerformanceMetrics?: boolean;
}

export function createComprehensiveLogger(options: ComprehensiveLogOptions = {}) {
  const requestLogger = createRequestLogger(options);

  return async (
    req: NextRequest,
    handler: () => Promise<NextResponse>
  ): Promise<NextResponse> => {
    const startTime = Date.now();
    const path = new URL(req.url).pathname;
    const method = req.method;
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
              req.headers.get('x-real-ip') || 
              'unknown';

    // Log request start
    if (options.logPerformanceMetrics) {
      await logger.debug('Request started', {
        method,
        path,
        ip,
        userAgent: req.headers.get('user-agent'),
      });
    }

    try {
      const response = await requestLogger(req, handler);
      const duration = Date.now() - startTime;

      // Performance metrics
      if (options.logPerformanceMetrics && duration > 1000) {
        await logger.warn('Slow request detected', {
          method,
          path,
          ip,
          duration,
          statusCode: response.status,
        });
      }

      // Log successful requests
      if (response.status >= 200 && response.status < 400) {
        await logger.info('Request completed successfully', {
          method,
          path,
          ip,
          statusCode: response.status,
          duration,
        });
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      await logger.error('Request failed with exception', {
        method,
        path,
        ip,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      throw error;
    }
  };
}

// Predefined comprehensive loggers
export const withComprehensiveLogging = createComprehensiveLogger({
  excludeStatusCodes: [200, 201, 204], // Only log non-successful requests
  logAuthEvents: true,
  logRateLimitEvents: true,
  logPerformanceMetrics: true,
});

export const withMinimalLogging = createComprehensiveLogger({
  excludeStatusCodes: [200, 201, 204, 400, 401, 403, 404], // Only log errors and rate limits
  logPerformanceMetrics: false,
});

export const withDebugLogging = createComprehensiveLogger({
  excludeStatusCodes: [], // Log everything
  logBody: true,
  logHeaders: true,
  logAuthEvents: true,
  logRateLimitEvents: true,
  logPerformanceMetrics: true,
});
