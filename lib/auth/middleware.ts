/**
 * API route auth middleware — reads the NextAuth session token
 * (next-auth.session-token cookie, signed with NEXTAUTH_SECRET).
 *
 * This replaces the old approach that looked for a separate
 * arduino_ide_token cookie signed with JWT_SECRET — those two
 * tokens were never in sync, causing "Session expired or revoked"
 * on every request after login.
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { connectDB } from '@/lib/db/mongoose';
import { User, type IUser } from '@/lib/models/User';
import { addSecurityHeaders, addNoCacheHeaders } from './security';
import { createRateLimitMiddleware, withAuthRateLimit } from './rate-limit-middleware';
import { globalRateLimiter } from './rate-limit';
import { logger } from '@/lib/logger';

export interface AuthContext {
  userId: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  user?: IUser;
}

// ── Core ─────────────────────────────────────────────────────────
export async function authenticate(
  req: NextRequest,
  options: { loadUser?: boolean } = {}
): Promise<{ ctx: AuthContext } | { error: NextResponse }> {
  // getToken() reads next-auth.session-token (or __Secure- in prod)
  // and verifies it with NEXTAUTH_SECRET — no separate cookie needed
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET!,
  });

  if (!token || !token.sub) {
    await logger.warn('Authentication failed - no token', {
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      userAgent: req.headers.get('user-agent'),
    });
    
    return {
      error: addSecurityHeaders(
        addNoCacheHeaders(
          NextResponse.json(
            { success: false, error: 'Unauthorized' },
            { status: 401 }
          )
        )
      ),
    };
  }

  const ctx: AuthContext = {
    userId: token.sub,
    username: (token.username as string) ?? '',
    email: (token.email as string) ?? '',
    role: (token.role as 'user' | 'admin') ?? 'user',
  };

  if (options.loadUser) {
    await connectDB();
    const user = await User.findById(ctx.userId);
    if (!user || !user.isActive) {
      await logger.warn('Authentication failed - user not found or disabled', {
        userId: ctx.userId,
        ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
        userAgent: req.headers.get('user-agent'),
      });
      
      return {
        error: addSecurityHeaders(
          addNoCacheHeaders(
            NextResponse.json(
              { success: false, error: 'User not found or disabled' },
              { status: 401 }
            )
          )
        ),
      };
    }

    await logger.info('Authentication successful', {
      userId: ctx.userId,
      username: ctx.username,
      role: ctx.role,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
    });

    ctx.user = user;
    // Touch last-active non-blocking
    User.updateOne(
      { _id: user._id },
      { 'stats.lastActiveAt': new Date() }
    ).exec();
  }

  return { ctx };
}

// ── Convenience wrappers ──────────────────────────────────────────
type RouteHandler = (
  req: NextRequest,
  ctx: AuthContext,
  params?: Record<string, string> | Promise<any>
) => Promise<NextResponse>;

export function withAuth(handler: RouteHandler) {
  return async (
    req: NextRequest,
    context?: { params?: Record<string, string> | Promise<any> }
  ) => {
    // Apply rate limiting first
    const rateLimitMiddleware = createRateLimitMiddleware({
      limiter: globalRateLimiter,
      keyGenerator: (req) => {
        const forwarded = req.headers.get('x-forwarded-for');
        const realIp = req.headers.get('x-real-ip');
        const ip = forwarded?.split(',')[0] || realIp || 'unknown';
        return `api:${ip}`;
      }
    });

    return rateLimitMiddleware(req, async () => {
      const result = await authenticate(req);
      if ('error' in result) return result.error;
      
      // Handle both old format and new Next.js 16 format
      const params = context?.params;
      return handler(req, result.ctx, params);
    });
  };
}

export function withAuthAndUser(handler: RouteHandler) {
  return async (
    req: NextRequest,
    context?: { params?: Record<string, string> | Promise<any> }
  ) => {
    // Apply rate limiting first
    const rateLimitMiddleware = createRateLimitMiddleware({
      limiter: globalRateLimiter,
      keyGenerator: (req) => {
        const forwarded = req.headers.get('x-forwarded-for');
        const realIp = req.headers.get('x-real-ip');
        const ip = forwarded?.split(',')[0] || realIp || 'unknown';
        return `api:${ip}`;
      }
    });

    return rateLimitMiddleware(req, async () => {
      const result = await authenticate(req, { loadUser: true });
      if ('error' in result) return result.error;
      
      // Handle both old format and new Next.js 16 format
      const params = context?.params;
      return handler(req, result.ctx, params);
    });
  };
}
