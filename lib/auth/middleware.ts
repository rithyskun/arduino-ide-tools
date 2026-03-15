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
import { getToken } from 'next-auth/jwt';
import { connectDB } from '@/lib/db/mongoose';
import { User, type IUser } from '@/lib/models/User';

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
): Promise<{ ctx: AuthContext } | { error: Response }> {
  // getToken() reads next-auth.session-token (or __Secure- in prod)
  // and verifies it with NEXTAUTH_SECRET — no separate cookie needed
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET!,
  });

  if (!token || !token.sub) {
    return {
      error: Response.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
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
        error: Response.json(
          { success: false, error: 'User not found or disabled' },
          { status: 401 }
        ),
      };
    }
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
  params?: Record<string, string>
) => Promise<Response>;

export function withAuth(handler: RouteHandler) {
  return async (
    req: NextRequest,
    { params }: { params?: Record<string, string> } = {}
  ) => {
    const result = await authenticate(req);
    if ('error' in result) return result.error;
    return handler(req, result.ctx, params);
  };
}

export function withAuthAndUser(handler: RouteHandler) {
  return async (
    req: NextRequest,
    { params }: { params?: Record<string, string> } = {}
  ) => {
    const result = await authenticate(req, { loadUser: true });
    if ('error' in result) return result.error;
    return handler(req, result.ctx, params);
  };
}
