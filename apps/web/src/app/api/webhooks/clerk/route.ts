import { NextResponse, type NextRequest } from 'next/server';
import { authServiceUrl } from '@/lib/api-url';

export const runtime = 'nodejs';

/**
 * Clerk webhook forwarder. Passes verified webhook events to the auth
 * service for user/tenant synchronization. Signature verification is
 * expected to occur downstream using CLERK_WEBHOOK_SECRET.
 */
export async function POST(request: NextRequest) {
  const svixId = request.headers.get('svix-id');
  const svixTimestamp = request.headers.get('svix-timestamp');
  const svixSignature = request.headers.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: 'Missing svix signature headers.' },
      { status: 400 },
    );
  }

  const body = await request.text();

  try {
    const response = await fetch(authServiceUrl('/webhooks/clerk'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      },
      body,
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Downstream webhook handler failed.' },
        { status: 502 },
      );
    }
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Unknown error forwarding webhook.',
      },
      { status: 502 },
    );
  }

  return NextResponse.json({ received: true });
}
