import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongoose';
import { Project } from '@/lib/models/Project';
import { User } from '@/lib/models/User';
import { withAuth, type AuthContext } from '@/lib/auth/middleware';
import { UpdateProjectSchema } from '@/lib/validations/schemas';
import { badRequestResponse, serverErrorResponse } from '@/lib/auth/jwt';

type Params = { id: string };

// ── Ownership guard ──────────────────────────────────────────────
async function getOwnedProject(id: string, ctx: AuthContext) {
  const project = await Project.findById(id);
  if (!project)
    return {
      error: Response.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      ),
    };
  if (project.owner.toString() !== ctx.userId && ctx.role !== 'admin') {
    return {
      error: Response.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      ),
    };
  }
  return { project };
}

// GET /api/projects/[id] — full project with files
export const GET = withAuth(
  async (
    _req: NextRequest,
    ctx: AuthContext,
    params?: Record<string, string>
  ) => {
    try {
      await connectDB();
      const result = await getOwnedProject(params?.id ?? '', ctx);
      if ('error' in result) return result.error;

      // Touch lastOpenedAt
      Project.updateOne(
        { _id: result.project._id },
        { lastOpenedAt: new Date() }
      ).exec();

      return Response.json({ success: true, project: result.project });
    } catch {
      return serverErrorResponse();
    }
  }
);

// PATCH /api/projects/[id] — save project (files, metadata)
export const PATCH = withAuth(
  async (
    req: NextRequest,
    ctx: AuthContext,
    params?: Record<string, string>
  ) => {
    try {
      const body = await req.json();
      const parsed = UpdateProjectSchema.safeParse(body);
      if (!parsed.success)
        return badRequestResponse(
          'Validation failed',
          parsed.error.flatten().fieldErrors
        );

      await connectDB();
      const result = await getOwnedProject(params?.id ?? '', ctx);
      if ('error' in result) return result.error;

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      const data = parsed.data;

      if (data.name !== undefined) updates.name = data.name;
      if (data.description !== undefined)
        updates.description = data.description;
      if (data.boardId !== undefined) updates.boardId = data.boardId;
      if (data.isPublic !== undefined) updates.isPublic = data.isPublic;
      if (data.tags !== undefined) updates.tags = data.tags;
      if (data.files !== undefined) updates.files = data.files;
      if (data.devices !== undefined) updates.devices = data.devices;

      const updated = await Project.findByIdAndUpdate(
        params?.id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      return Response.json({ success: true, project: updated });
    } catch {
      return serverErrorResponse();
    }
  }
);

// DELETE /api/projects/[id]
export const DELETE = withAuth(
  async (
    _req: NextRequest,
    ctx: AuthContext,
    params?: Record<string, string>
  ) => {
    try {
      await connectDB();
      const result = await getOwnedProject(params?.id ?? '', ctx);
      if ('error' in result) return result.error;

      await Project.findByIdAndDelete(params?.id);
      User.updateOne(
        { _id: ctx.userId },
        { $inc: { 'stats.projectCount': -1 } }
      ).exec();

      return Response.json({ success: true, message: 'Project deleted' });
    } catch {
      return serverErrorResponse();
    }
  }
);
