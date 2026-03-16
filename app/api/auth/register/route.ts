import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongoose';
import { User } from '@/lib/models/User';
import { RegisterSchema } from '@/lib/validations/schemas';
import { badRequestResponse, serverErrorResponse } from '@/lib/auth/jwt';
import { DEMO_PROJECT_FILES } from '@/lib/defaultFiles';
import { Project } from '@/lib/models/Project';
import { withRegistrationRateLimit } from '@/lib/auth/rate-limit-middleware';

export async function POST(req: NextRequest) {
  return withRegistrationRateLimit(req, async () => {
    try {
      const body = await req.json();
      const parsed = RegisterSchema.safeParse(body);
      if (!parsed.success) {
        return badRequestResponse(
          'Validation failed',
          parsed.error.flatten().fieldErrors
        );
      }

      const { email, username, password, displayName } = parsed.data;

      await connectDB();

      // ── Uniqueness check ─────────────────────────────────────────
      const existing = await User.findOne({ $or: [{ email }, { username }] });
      if (existing) {
        const field = existing.email === email ? 'email' : 'username';
        return badRequestResponse(`This ${field} is already registered`);
      }

      // ── Create user (pre-save hook bcrypts passwordHash) ─────────
      const user = await User.create({
        email,
        username,
        passwordHash: password,
        displayName: displayName ?? username,
      });

      // ── Create starter project ────────────────────────────────────
      await Project.create({
        owner: user._id,
        name: 'My First Project',
        description: 'Starter project — edit main.ino or import your own files.',
        boardId: 'arduino-mega',
        files: DEMO_PROJECT_FILES,
        tags: ['starter'],
      });

      await User.updateOne({ _id: user._id }, { $set: { 'stats.projectCount': 1 } });

      // ── Respond — client will call signIn() separately ────────────
      // Do NOT set any cookie here; NextAuth manages its own session cookie.
      return NextResponse.json(
        {
          success: true,
          message: 'Account created successfully',
          user: user.toPublicJSON(),
        },
        { status: 201 }
      );
    } catch (err) {
      console.error('[register]', err);
      return serverErrorResponse();
    }
  });
}
