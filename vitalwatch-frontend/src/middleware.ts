/**
 * VitalWatch Next.js Middleware
 * Server-side route protection and authentication checks
 *
 * Checks for auth token in cookies to protect dashboard routes.
 * Primary auth state is managed client-side via zustand/localStorage,
 * but this middleware provides a server-side safety net to prevent
 * unauthenticated access to protected routes.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/auth',
  '/verify',
  '/invite',
  '/',
  '/about',
  '/blog',
  '/careers',
  '/case-studies',
  '/contact',
  '/demo',
  '/devices',
  '/docs',
  '/features',
  '/help',
  '/hipaa',
  '/integrations',
  '/privacy',
  '/terms',
  '/ai',
];

const PUBLIC_PATH_PREFIXES = [
  '/auth/',
  '/public/',
  '/blog/',
  '/docs/',
  '/help/',
];

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths without authentication
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Check for auth token in cookies (set by client after login)
  const authToken =
    request.cookies.get('vw_access_token')?.value ||
    request.cookies.get('vw_auth')?.value;

  // Also check Authorization header for API-style requests
  const authHeader = request.headers.get('authorization');
  const hasAuth = !!authToken || !!authHeader;

  if (!hasAuth) {
    // For protected dashboard routes, redirect to login
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Add security headers to all responses
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon\\.ico|favicon\\.svg|favicon\\.png|public|api|.*\\.svg$|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.gif$|.*\\.webp$|.*\\.ico$|.*\\.css$|.*\\.js$|.*\\.woff2?$|.*\\.ttf$|robots\\.txt|sitemap\\.xml).*)',
  ],
};
