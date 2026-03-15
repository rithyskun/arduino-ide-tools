/**
 * JWT utilities — used by lib/auth/options.ts to issue internal
 * access tokens stored in the NextAuth JWT payload.
 *
 * API route protection now uses NextAuth's getToken() directly
 * (see lib/auth/middleware.ts) — no separate cookie is needed.
 */
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { addSecurityHeaders, addNoCacheHeaders } from './security';

const TOKEN_TTL_SHORT = 60 * 60 * 8; // 8 hours
const TOKEN_TTL_LONG = 60 * 60 * 24 * 30; // 30 days

// Read lazily — avoids undefined at module-load in edge runtime
function jwtSecret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET env variable is not set');
  return s;
}

// ── Payload ───────────────────────────────────────────────────────
export interface JWTPayload {
  sub: string;
  username: string;
  email: string;
  role: 'user' | 'admin';
  jti: string;
  iat?: number;
  exp?: number;
}

// ── Sign ─────────────────────────────────────────────────────────
export function signToken(
  payload: Omit<JWTPayload, 'jti' | 'iat' | 'exp'>,
  rememberMe: boolean = false
): { token: string; jti: string; expiresAt: Date } {
  const jti = crypto.randomUUID();
  const expiresIn = rememberMe ? TOKEN_TTL_LONG : TOKEN_TTL_SHORT;
  const token = jwt.sign({ ...payload, jti }, jwtSecret(), { expiresIn });
  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  return { token, jti, expiresAt };
}

// ── Verify ────────────────────────────────────────────────────────
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, jwtSecret()) as JWTPayload;
  } catch {
    return null;
  }
}

// ── Hash jti for DB session storage ──────────────────────────────
export function hashJti(jti: string): string {
  return crypto.createHash('sha256').update(jti).digest('hex');
}

// ── API response helpers ──────────────────────────────────────────
export function unauthorizedResponse(message = 'Unauthorized') {
  return addSecurityHeaders(
    addNoCacheHeaders(
      NextResponse.json({ success: false, error: message }, { status: 401 })
    )
  );
}
export function forbiddenResponse(message = 'Forbidden') {
  return addSecurityHeaders(
    addNoCacheHeaders(
      NextResponse.json({ success: false, error: message }, { status: 403 })
    )
  );
}
export function badRequestResponse(message: string, errors?: unknown) {
  return addSecurityHeaders(
    addNoCacheHeaders(
      NextResponse.json(
        { success: false, error: message, errors },
        { status: 400 }
      )
    )
  );
}
export function serverErrorResponse(message = 'Internal server error') {
  return addSecurityHeaders(
    addNoCacheHeaders(
      NextResponse.json({ success: false, error: message }, { status: 500 })
    )
  );
}
