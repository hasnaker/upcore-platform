'use client';

import { useUser as useClerkUser } from '@clerk/nextjs';

/**
 * Client-side hook returning the authenticated Clerk user. Thin wrapper
 * around `@clerk/nextjs` for future extension (tenant context, roles).
 */
export function useUser() {
  const { user, isLoaded, isSignedIn } = useClerkUser();
  return { user, isLoaded, isSignedIn };
}
