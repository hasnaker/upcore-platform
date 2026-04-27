import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

// Admin paneli internal — sadece upcore_staff rolüne sahip Clerk
// kullanıcıları erişebilir. Rol publicMetadata.role === 'upcore_staff'
// ile işaretlenir (Clerk dashboard üstünden veya onboarding script ile).
const isAuthRoute = createRouteMatcher(['/giris(.*)', '/sso-callback(.*)']);

export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();

  // Giriş sayfasına yetkili kullanıcı → dashboard.
  if (isAuthRoute(req) && userId) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Tüm diğer route'lar protected (giris ve sso-callback dışı).
  if (!isAuthRoute(req)) {
    if (!userId) {
      return NextResponse.redirect(new URL('/giris', req.url));
    }

    // Admin rol check — publicMetadata veya org_role üzerinden.
    const role =
      (sessionClaims as { role?: string; org_role?: string } | null | undefined)?.role ??
      (sessionClaims as { role?: string; org_role?: string } | null | undefined)?.org_role;

    if (role !== 'upcore_staff' && role !== 'admin') {
      // Yetkisiz — 403 sayfasına veya ana web'e yönlendir.
      return NextResponse.redirect(new URL('/giris?error=unauthorized', req.url));
    }

    // Sentry context — admin paneli her zaman bilinen kullanıcı + rol.
    Sentry.setUser({ id: userId });
    Sentry.getCurrentScope().setTag('admin_role', role ?? 'unknown');
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next|.*\\..*).*)',
    '/api/(.*)',
  ],
};
