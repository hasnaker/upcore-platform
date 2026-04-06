'use client';

import { UserButton } from '@clerk/nextjs';

export function UserMenu() {
  return (
    <UserButton
      afterSignOutUrl="/"
      appearance={{
        elements: {
          avatarBox: 'h-8 w-8',
        },
      }}
    />
  );
}
