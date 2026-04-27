import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';

/**
 * Routes requiring authentication. If an unauthenticated user hits these,
 * Clerk redirects them to NEXT_PUBLIC_CLERK_SIGN_IN_URL (/giris).
 */
const isProtectedRoute = createRouteMatcher([
  '/panel(.*)',
  '/onboarding(.*)',
  '/calisanlar(.*)',
  '/departmanlar(.*)',
  '/izinler(.*)',
  '/belgeler(.*)',
  '/degerlendirmeler(.*)',
  '/anketler(.*)',
  '/tukenmislik(.*)',
  '/aksiyonlar(.*)',
  '/ayarlar(.*)',
]);

/** Marketing + auth routes remain public. */
const isAuthRoute = createRouteMatcher(['/giris(.*)', '/kayit(.*)', '/sso-callback(.*)']);

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();

  // Authenticated users hitting auth routes should be sent to the app.
  if (isAuthRoute(req) && userId) {
    return NextResponse.redirect(new URL('/panel', req.url));
  }

  if (isProtectedRoute(req) && !userId) {
    return NextResponse.redirect(new URL('/giris', req.url));
  }

  // Tenant resolution: prefer subdomain, fall back to cookie.
  // Injected as x-tenant-slug for downstream API calls/server components.
  const res = NextResponse.next();
  const host = req.headers.get('host') ?? '';
  const subdomain = extractSubdomain(host);
  const cookieTenant = req.cookies.get('upcore_tenant')?.value;
  const tenantSlug = subdomain ?? cookieTenant ?? null;

  if (tenantSlug) {
    res.headers.set('x-tenant-slug', tenantSlug);
  }

  // Sentry context — her request için tenant_slug + user_id scope'a yazılır.
  // Edge runtime'da scope per-request izole, leak yok.
  Sentry.getCurrentScope().setTag('tenant_slug', tenantSlug ?? 'unknown');
  if (userId) {
    Sentry.setUser({ id: userId });
  }

  return res;
});

function extractSubdomain(host: string): string | null {
  const hostname = host.split(':')[0] ?? '';
  const parts = hostname.split('.');
  // Expect tenant.upcore.app (3+ parts) — skip localhost, vercel previews, bare domain.
  if (parts.length < 3) return null;
  const sub = parts[0];
  if (!sub) return null;
  if (sub === 'www' || sub === 'app' || sub === 'api') return null;
  return sub;
}

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|.*\\..*).*)',
    '/api/(.*)',
  ],
};
