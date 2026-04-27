'use client';

import { useState, type ReactNode } from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { trTR } from '@clerk/localizations';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { CookieConsent } from '@/components/CookieConsent';
import { PlanLimitToaster } from '@/components/PlanLimitToaster';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <ClerkProvider
      localization={trTR}
      signInUrl="/giris"
      signUpUrl="/kayit"
      signInFallbackRedirectUrl="/panel"
      signUpFallbackRedirectUrl="/onboarding"
      appearance={{
        variables: {
          colorPrimary: '#5e5ce6',
          borderRadius: '8px',
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        {children}
        <CookieConsent />
        <PlanLimitToaster />
        <Toaster position="top-right" richColors closeButton />
      </QueryClientProvider>
    </ClerkProvider>
  );
}
