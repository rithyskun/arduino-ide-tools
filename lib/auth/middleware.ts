/**
 * API route auth middleware — reads the NextAuth session token
 * (next-auth.session-token cookie, signed with NEXTAUTH_SECRET).
 */
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { connectDB } from '@/lib/db/mongoose';
import { User, type IUser } from '@/lib/models/User';
import { addSecurityHeaders, addNoCacheHeaders } from './security';
import {
  createRateLimitMiddleware,
} from './rate-limit-middleware';
import { globalRateLimiter } from './rate-limit';

export interface AuthContext {
  userId: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  user?: IUser;
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  return forwarded?.split(',')[0]?.trim() || realIp || 'unknown';
}

const globalRateLimit = createRateLimitMiddleware({
  limiter: globalRateLimiter,
  keyGenerator: (req) => `api:${getClientIp(req)}`,
});

// ── Core auth check ───────────────────────────────────────────────
export async function authenticate(
  req: NextRequest,
  options: { loadUser?: boolean } = {}
): Promise<{ ctx: AuthContext } | { error: NextResponse }> {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET!,
  });

  if (!token?.sub) {
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
    ctx.user = user;
    // Touch last-active — fire and forget
    User.updateOne(
      { _id: user._id },
      { 'stats.lastActiveAt': new Date() }
    ).exec();
  }

  return { ctx };
}

// ── Route handler type ────────────────────────────────────────────
type RouteHandler = (
  req: NextRequest,
  ctx: AuthContext,
  params?: Promise<Record<string, string>>
) => Promise<NextResponse>;

// ── withAuth wrapper ──────────────────────────────────────────────
export function withAuth(handler: RouteHandler) {
  return async (
    req: NextRequest,
    context: { params: Promise<Record<string, string>> } = { params: Promise.resolve({}) }
  ) => {
    return globalRateLimit(req, async () => {
      const result = await authenticate(req);
      if ('error' in result) return result.error;

      return handler(req, result.ctx, context.params);
    });
  };
}

// ── withAuthAndUser wrapper (also loads the User document) ────────
export function withAuthAndUser(handler: RouteHandler) {
  return async (
    req: NextRequest,
    context: { params: Promise<Record<string, string>> } = { params: Promise.resolve({}) }
  ) => {
    return globalRateLimit(req, async () => {
      const result = await authenticate(req, { loadUser: true });
      if ('error' in result) return result.error;

      return handler(req, result.ctx, context.params);
    });
  };
}