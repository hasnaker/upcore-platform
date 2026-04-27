import { NextResponse } from 'next/server';
import { abandonDraft } from '@/app/onboarding/actions';

/**
 * Test-only helper: the E2E suite calls `POST /api/onboarding/reset` at the
 * top of each scenario to abandon any in-progress draft so the wizard
 * starts fresh. In production this route is a noop — abandonDraft itself
 * is idempotent and gated by Clerk auth.
 */
export async function POST(): Promise<NextResponse> {
  const res = await abandonDraft();
  return NextResponse.json(res);
}
