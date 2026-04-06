import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

/**
 * Server-side helpers for Clerk authentication. Use from Server Components,
 * Server Actions, and Route Handlers.
 */

export async function getSession() {
  const { userId, sessionId, getToken } = await auth();
  return { userId, sessionId, getToken };
}

/** Throws redirect to /giris when unauthenticated. */
export async function requireAuth() {
  const { userId } = await auth();
  if (!userId) {
    redirect('/giris');
  }
  return userId;
}

export async function getAuthedUser() {
  const user = await currentUser();
  return user;
}

export async function getAuthToken(): Promise<string | null> {
  const { getToken } = await auth();
  return getToken();
}
