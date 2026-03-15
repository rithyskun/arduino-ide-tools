import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongoose';
import { Project } from '@/lib/models/Project';
import { User } from '@/lib/models/User';
import { withAuth } from '@/lib/auth/middleware';
import { CreateProjectSchema } from '@/lib/validations/schemas';
import { DEMO_PROJECT_FILES } from '@/lib/defaultFiles';
import { badRequestResponse, serverErrorResponse } from '@/lib/auth/jwt';

// GET /api/projects — list user's projects
export const GET = withAuth(async (req: NextRequest, ctx) => {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get('limit') ?? '20'))
    );
    const sort = searchParams.get('sort') ?? 'updatedAt';
    const q = searchParams.get('q') ?? '';

    const filter: Record<string, unknown> = { owner: ctx.userId };
    if (q) filter.name = { $regex: q, $options: 'i' };

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      updatedAt: { updatedAt: -1 },
      createdAt: { createdAt: -1 },
      name: { name: 1 },
      lastOpenedAt: { lastOpenedAt: -1 },
    };

    const [projects, total] = await Promise.all([
      Project.find(filter)
        .select('-files -devices') // exclude heavy fields for list
        .sort(sortMap[sort] ?? { updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Project.countDocuments(filter),
    ]);

    return Response.json({
      success: true,
      projects,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch {
    return serverErrorResponse();
  }
});

// POST /api/projects — create project
export const POST = withAuth(async (req: NextRequest, ctx) => {
  try {
    const body = await req.json();
    const parsed = CreateProjectSchema.safeParse(body);
    if (!parsed.success)
      return badRequestResponse(
        'Validation failed',
        parsed.error.flatten().fieldErrors
      );

    await connectDB();

    // Enforce project name uniqueness per user
    const duplicate = await Project.findOne({
      owner: ctx.userId,
      name: parsed.data.name,
    });
    if (duplicate)
      return badRequestResponse(
        `You already have a project named "${parsed.data.name}"`
      );

    const project = await Project.create({
      owner: ctx.userId,
      ...parsed.data,
      files: DEMO_PROJECT_FILES,
    });

    // Increment user's project count
    User.updateOne(
      { _id: ctx.userId },
      { $inc: { 'stats.projectCount': 1 } }
    ).exec();

    return Response.json({ success: true, project }, { status: 201 });
  } catch {
    return serverErrorResponse();
  }
});
