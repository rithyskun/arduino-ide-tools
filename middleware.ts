import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Fully public — no auth check
const PUBLIC_PATHS = ['/', '/demo'];

// Require authentication
const AUTH_REQUIRED = ['/dashboard', '/ide'];

// Authenticated users are sent away from these
const GUEST_ONLY = ['/login', '/register'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Public paths bypass all auth logic
  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isAuthenticated = !!token;

  // Protect /dashboard and /ide
  const needsAuth = AUTH_REQUIRED.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  );
  if (needsAuth && !isAuthenticated) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('callbackUrl', pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from login/register
  if (GUEST_ONLY.includes(pathname) && isAuthenticated) {
    const callbackUrl =
      req.nextUrl.searchParams.get('callbackUrl') ?? '/dashboard';
    const url = req.nextUrl.clone();
    url.pathname = callbackUrl.startsWith('/') ? callbackUrl : '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)).*)',
  ],
};
