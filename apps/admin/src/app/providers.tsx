'use client';

import { useState, type ReactNode } from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { trTR } from '@clerk/localizations';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <ClerkProvider
      localization={trTR}
      signInUrl="/giris"
      signInFallbackRedirectUrl="/"
      appearance={{
        variables: { colorPrimary: '#5e5ce6', borderRadius: '8px' },
      }}
    >
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </QueryClientProvider>
    </ClerkProvider>
  );
}
