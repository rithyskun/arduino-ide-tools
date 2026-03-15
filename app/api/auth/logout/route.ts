/**
 * POST /api/auth/logout
 *
 * Revokes all active DB sessions for the current user and signals
 * the client to clear NextAuth cookies via signOut().
 */
import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { connectDB } from '@/lib/db/mongoose';
import { Session } from '@/lib/models/Session';
import { addNoCacheHeaders, addSecurityHeaders } from '@/lib/auth/security';

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET!,
    });

    if (token?.sub) {
      await connectDB();
      // Revoke all active DB sessions for this user
      const result = await Session.updateMany(
        { userId: token.sub, isRevoked: false },
        { $set: { isRevoked: true, lastUsedAt: new Date() } }
      );
      console.info(
        `[logout] Revoked ${result.modifiedCount} session(s) for user ${token.sub}`
      );
    }
  } catch (err) {
    // Best-effort — always return success so the client can proceed with
    // clearing cookies even if DB revocation fails
    console.error('[logout] Session revocation error:', err);
  }

  // Instruct the browser to clear cookies immediately
  const response = NextResponse.json({ success: true });
  addSecurityHeaders(addNoCacheHeaders(response));

  // Expire NextAuth session cookie
  const cookieName =
    process.env.NODE_ENV === 'production'
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token';

  response.cookies.set(cookieName, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0, // delete immediately
  });

  return response;
}
