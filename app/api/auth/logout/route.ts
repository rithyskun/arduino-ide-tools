/**
 * POST /api/auth/logout
 *
 * Thin wrapper — NextAuth's signOut() handles cookie clearing on the client.
 * This endpoint exists for server-side or programmatic logout calls.
 * We also optionally revoke DB sessions here for full invalidation.
 */
import { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { connectDB } from '@/lib/db/mongoose';
import { Session } from '@/lib/models/Session';

export async function POST(req: NextRequest) {
  try {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET!,
    });

    if (token?.sub) {
      await connectDB();
      // Revoke all active DB sessions for this user (best-effort)
      await Session.updateMany(
        { userId: token.sub, isRevoked: false },
        { isRevoked: true }
      );
    }
  } catch {
    // best-effort — always return success so the client can proceed
  }

  return Response.json({ success: true });
}
