import { NextResponse, type NextRequest } from 'next/server'
 
export async function middleware(request: NextRequest) {
  const userCookie = request.cookies.get('user');
  const { pathname } = request.nextUrl

  // If there's no user cookie and the user is not on the login page, redirect to login
  if (!userCookie && pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // If there's a user cookie and the user is on the login page, redirect to home
  if (userCookie && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }
 
  return NextResponse.next()
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
