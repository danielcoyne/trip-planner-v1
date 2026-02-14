import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { nextUrl, auth: session } = req;
  const isLoggedIn = !!session?.user;

  // Define public routes that don't require authentication
  const isPublicRoute =
    nextUrl.pathname.startsWith('/review/') ||
    nextUrl.pathname.startsWith('/api/review/') ||
    nextUrl.pathname.startsWith('/api/reactions') ||
    nextUrl.pathname.startsWith('/api/suggestions') ||
    nextUrl.pathname.startsWith('/api/places/') ||
    nextUrl.pathname.startsWith('/auth/') ||
    nextUrl.pathname.startsWith('/api/auth/');

  // Allow public routes
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to sign in
  if (!isLoggedIn) {
    const signInUrl = new URL('/auth/signin', nextUrl.origin);
    signInUrl.searchParams.set('callbackUrl', nextUrl.pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Match all paths except static files and images
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
};
