import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { addSecurityHeaders, addNoCacheHeaders } from '@/lib/auth/security';
import { logger } from '@/lib/logger';

// Fully public — no auth check
const PUBLIC_PATHS = ['/', '/demo'];

// Require authentication
const AUTH_REQUIRED = ['/dashboard', '/ide'];

// Authenticated users are sent away from these
const GUEST_ONLY = ['/login', '/register'];

export async function proxy(req: NextRequest) {
  const startTime = Date.now();
  const { pathname } = req.nextUrl;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
            req.headers.get('x-real-ip') || 
            'unknown';

  // Log middleware start
  await logger.debug('Proxy middleware processing', {
    pathname,
    ip,
    userAgent: req.headers.get('user-agent'),
  });

  // Public paths bypass all auth logic
  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  ) {
    await logger.info('Public path accessed', {
      pathname,
      ip,
      duration: Date.now() - startTime,
    });
    
    return addSecurityHeaders(NextResponse.next());
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isAuthenticated = !!token;

  // Protect /dashboard and /ide
  const needsAuth = AUTH_REQUIRED.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
  if (needsAuth && !isAuthenticated) {
    await logger.warn('Protected path accessed without authentication', {
      pathname,
      ip,
      duration: Date.now() - startTime,
    });

    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('callbackUrl', pathname + req.nextUrl.search);
    return addSecurityHeaders(NextResponse.redirect(url));
  }

  // Redirect logged-in users away from login/register
  if (GUEST_ONLY.includes(pathname) && isAuthenticated) {
    await logger.info('Authenticated user redirected from guest-only path', {
      pathname,
      ip,
      userId: token?.sub,
      duration: Date.now() - startTime,
    });

    const callbackUrl =
      req.nextUrl.searchParams.get('callbackUrl') ?? '/dashboard';
    const url = req.nextUrl.clone();
    url.pathname = callbackUrl.startsWith('/') ? callbackUrl : '/dashboard';
    url.search = '';
    return addSecurityHeaders(NextResponse.redirect(url));
  }

  await logger.info('Request passed all middleware checks', {
    pathname,
    ip,
    userId: token?.sub,
    isAuthenticated,
    duration: Date.now() - startTime,
  });

  return addSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)',
  ],
};
