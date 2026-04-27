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
  // Gateway expects tenant_id claim — available only in `upcore` template.
  return getToken({ template: 'upcore' });
}

/** Shape returned by GET /api/v1/auth/me (snake_case from Go auth service). */
export interface AuthMe {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  locale: string;
  status: string;
  tenant_id: string;
  roles: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}
