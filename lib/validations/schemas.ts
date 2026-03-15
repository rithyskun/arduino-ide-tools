import { z } from 'zod';

// ── Auth ──────────────────────────────────────────────────────────
export const RegisterSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .min(5)
    .max(100)
    .toLowerCase(),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(24, 'Username must be at most 24 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, _ and -'
    ),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  displayName: z.string().min(1).max(50).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email('Invalid email').toLowerCase(),
  password: z.string().min(1, 'Password is required'),
  // NextAuth passes all credentials as strings — coerce "true"/"false"
  rememberMe: z
    .union([z.boolean(), z.string()])
    .transform((v) => v === true || v === 'true')
    .default(false),
});

export const UpdateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(300).optional(),
  preferences: z
    .object({
      defaultBoard: z.string().optional(),
      editorFontSize: z.number().min(10).max(24).optional(),
      editorTheme: z.string().optional(),
      autoSave: z.boolean().optional(),
    })
    .optional(),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(100)
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
});

// ── Projects ──────────────────────────────────────────────────────
export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(80),
  description: z.string().max(500).optional(),
  boardId: z.string().default('arduino-mega'),
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).max(10).optional().default([]),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(500).optional(),
  boardId: z.string().optional(),
  isPublic: z.boolean().optional(),
  tags: z.array(z.string()).max(10).optional(),
  files: z
    .array(
      z.object({
        name: z.string(),
        content: z.string(),
        language: z.enum(['cpp', 'json', 'plaintext']),
        readonly: z.boolean().default(false),
      })
    )
    .optional(),
  devices: z
    .array(
      z.object({
        instanceId: z.string(),
        deviceType: z.string(),
        label: z.string(),
        config: z.record(z.unknown()).default({}),
        pinMapping: z.record(z.number()).default({}),
        values: z.record(z.number()).default({}),
      })
    )
    .optional(),
});

// ── Types ─────────────────────────────────────────────────────────
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;
