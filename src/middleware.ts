import { NextRequest, NextResponse } from 'next/server';

const allowedPaths = ['/login', '/signup'];

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const APP_URL = req.nextUrl.origin;


  if (allowedPaths.includes(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get('__session')?.value;

  const res = await fetch(`${APP_URL}/api/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token }),
  });
  const { data } = await res.json();

  if (!data) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}


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
};
