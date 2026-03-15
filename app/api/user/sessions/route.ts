import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongoose';
import { Session } from '@/lib/models/Session';
import { withAuth, type AuthContext } from '@/lib/auth/middleware';
import { serverErrorResponse } from '@/lib/auth/jwt';

// GET /api/user/sessions — list active sessions
export const GET = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  try {
    await connectDB();
    const sessions = await Session.find({
      userId: ctx.userId,
      isRevoked: false,
      expiresAt: { $gt: new Date() },
    })
      .select('-token')
      .sort({ lastUsedAt: -1 })
      .lean();

    return NextResponse.json({ success: true, sessions });
  } catch {
    return serverErrorResponse();
  }
});

// DELETE /api/user/sessions — revoke all sessions (force logout everywhere)
export const DELETE = withAuth(async (_req: NextRequest, ctx: AuthContext) => {
  try {
    await connectDB();
    await Session.updateMany(
      { userId: ctx.userId, isRevoked: false },
      { isRevoked: true }
    );
    return NextResponse.json({ success: true, message: 'All sessions revoked' });
  } catch {
    return serverErrorResponse();
  }
});
