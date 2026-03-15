import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export interface RequestLogOptions {
  excludePaths?: string[];
  excludeStatusCodes?: number[];
  logBody?: boolean;
  logHeaders?: boolean;
}

const defaultOptions: RequestLogOptions = {
  excludePaths: ['/api/health', '/_next', '/favicon.ico'],
  excludeStatusCodes: [200, 201, 204],
  logBody: false,
  logHeaders: false,
};

export function createRequestLogger(options: RequestLogOptions = {}) {
  const opts = { ...defaultOptions, ...options };

  return async (
    req: NextRequest,
    handler: () => Promise<NextResponse>
  ): Promise<NextResponse> => {
    const startTime = Date.now();
    const method = req.method;
    const path = new URL(req.url).pathname;
    
    // Skip logging for excluded paths
    if (opts.excludePaths?.some(excluded => path.startsWith(excluded))) {
      return handler();
    }

    // Get client IP
    const forwarded = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ip = forwarded?.split(',')[0] || realIp || 'unknown';

    // Prepare log data
    const logData: Record<string, any> = {
      userAgent: req.headers.get('user-agent'),
      contentType: req.headers.get('content-type'),
    };

    // Optionally log headers
    if (opts.logHeaders) {
      const headers: Record<string, string> = {};
      req.headers.forEach((value, key) => {
        headers[key] = value;
      });
      logData.headers = headers;
    }

    // Optionally log body (only for specific content types)
    if (opts.logBody && req.body) {
      try {
        const contentType = req.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const body = await req.clone().json();
          logData.body = body;
        } else if (contentType?.includes('application/x-www-form-urlencoded')) {
          const body = await req.clone().text();
          logData.body = body;
        }
      } catch (error) {
        // Don't let logging errors break the request
        logData.bodyError = 'Failed to parse body';
      }
    }

    try {
      const response = await handler();
      const duration = Date.now() - startTime;
      const statusCode = response.status;

      // Skip logging for excluded status codes
      if (opts.excludeStatusCodes?.includes(statusCode)) {
        return response;
      }

      // Log the request
      await logger.logRequest(
        method,
        path,
        ip,
        statusCode,
        duration,
        logData
      );

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log errors
      await logger.error('Request failed', {
        method,
        path,
        ip,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        ...logData,
      });

      throw error;
    }
  };
}

// Predefined request loggers for different use cases
export const withRequestLogging = createRequestLogger({
  excludeStatusCodes: [], // Log all status codes
  logBody: false, // Don't log bodies by default for privacy
});

export const withDetailedRequestLogging = createRequestLogger({
  excludeStatusCodes: [],
  logBody: true,
  logHeaders: true,
});

export const withApiRequestLogging = createRequestLogger({
  excludePaths: ['/api/health'],
  excludeStatusCodes: [200, 201],
  logBody: false,
});
