import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getLoginSession } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const session = await getLoginSession();
  const { pathname } = request.nextUrl;

  // If there's no session and they're not on the login page, redirect to login
  if (!session && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If there is a session and they're on the login page, redirect to home
  if (session && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
