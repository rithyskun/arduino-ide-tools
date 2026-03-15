import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongoose';
import { User } from '@/lib/models/User';
import { withAuth } from '@/lib/auth/middleware';
import {
  UpdateProfileSchema,
  ChangePasswordSchema,
} from '@/lib/validations/schemas';
import { badRequestResponse, serverErrorResponse } from '@/lib/auth/jwt';

// GET /api/user — current user profile
export const GET = withAuth(async (_req, ctx) => {
  try {
    await connectDB();
    const user = await User.findById(ctx.userId);
    if (!user)
      return Response.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    return Response.json({ success: true, user: user.toPublicJSON() });
  } catch {
    return serverErrorResponse();
  }
});

// PATCH /api/user — update profile
export const PATCH = withAuth(async (req: NextRequest, ctx) => {
  try {
    const body = await req.json();

    // Support both profile update and password change
    if (body.currentPassword !== undefined) {
      // Password change flow
      const parsed = ChangePasswordSchema.safeParse(body);
      if (!parsed.success)
        return badRequestResponse(
          'Validation failed',
          parsed.error.flatten().fieldErrors
        );

      await connectDB();
      const user = await User.findById(ctx.userId).select('+passwordHash');
      if (!user)
        return Response.json(
          { success: false, error: 'User not found' },
          { status: 404 }
        );

      const valid = await user.comparePassword(parsed.data.currentPassword);
      if (!valid) return badRequestResponse('Current password is incorrect');

      user.passwordHash = parsed.data.newPassword; // pre-save will hash it
      await user.save();

      return Response.json({ success: true, message: 'Password updated' });
    }

    // Profile update
    const parsed = UpdateProfileSchema.safeParse(body);
    if (!parsed.success)
      return badRequestResponse(
        'Validation failed',
        parsed.error.flatten().fieldErrors
      );

    await connectDB();
    const updates: Record<string, unknown> = {};
    if (parsed.data.displayName !== undefined)
      updates.displayName = parsed.data.displayName;
    if (parsed.data.bio !== undefined) updates.bio = parsed.data.bio;
    if (parsed.data.preferences) {
      Object.entries(parsed.data.preferences).forEach(([k, v]) => {
        updates[`preferences.${k}`] = v;
      });
    }

    const user = await User.findByIdAndUpdate(
      ctx.userId,
      { $set: updates },
      { new: true, runValidators: true }
    );
    if (!user)
      return Response.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );

    return Response.json({ success: true, user: user.toPublicJSON() });
  } catch {
    return serverErrorResponse();
  }
});
