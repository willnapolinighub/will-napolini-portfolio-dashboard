import { NextRequest, NextResponse } from 'next/server';

/**
 * Protect all /admin/* routes except the login page.
 * Reads the `admin_token` cookie set after a successful Supabase Auth login.
 *
 * This is a lightweight guard — it checks for token presence, not validity.
 * The client-side AdminLayout additionally calls supabase.auth.getSession()
 * to confirm the session is still live.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isLoginPage =
    pathname === '/admin/login' ||
    pathname === '/admin/login/';

  if (pathname.startsWith('/admin') && !isLoginPage) {
    const token = request.cookies.get('admin_token')?.value;

    if (!token) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
