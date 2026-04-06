/**
 * ApiProvider — React context that provides the configured API client
 * and React Query's QueryClientProvider.
 *
 * Wrap your app root with this provider to make all hooks functional.
 *
 * @example
 * <ApiProvider
 *   baseUrl="https://api.upcore.co/v1"
 *   getAccessToken={() => clerk.session?.getToken() ?? null}
 *   getTenantId={() => activeTenant?.id ?? null}
 *   onUnauthorized={() => clerk.signOut()}
 *   onTokenRefresh={() => clerk.session?.getToken({ forceRefresh: true }) ?? Promise.reject()}
 * >
 *   <App />
 * </ApiProvider>
 */
'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { createFetcher, type ApiFetcher } from '../client/fetcher';
import type { FetcherConfig } from '../client/types';
import { createQueryClient } from './query-client';

export interface ApiProviderProps extends FetcherConfig {
  children: ReactNode;
  /** Optional pre-built QueryClient (for testing or SSR) */
  queryClient?: QueryClient;
}

const ApiClientContext = createContext<ApiFetcher | null>(null);

export const ApiProvider = ({
  children,
  queryClient: externalQueryClient,
  baseUrl,
  getAccessToken,
  getTenantId,
  onUnauthorized,
  onTokenRefresh,
}: ApiProviderProps) => {
  const fetcher = useMemo(
    () =>
      createFetcher({
        baseUrl,
        getAccessToken,
        getTenantId,
        onUnauthorized,
        onTokenRefresh,
      }),
    [baseUrl, getAccessToken, getTenantId, onUnauthorized, onTokenRefresh],
  );

  const queryClient = useMemo(
    () => externalQueryClient ?? createQueryClient(),
    [externalQueryClient],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ApiClientContext.Provider value={fetcher}>
        {children}
      </ApiClientContext.Provider>
    </QueryClientProvider>
  );
};

/**
 * Hook to access the configured API fetcher (ky instance).
 *
 * Must be used within an <ApiProvider>.
 *
 * @throws Error if used outside of ApiProvider
 */
export const useApiClient = (): ApiFetcher => {
  const client = useContext(ApiClientContext);

  if (!client) {
    throw new Error(
      'useApiClient must be used within an <ApiProvider>. ' +
        'Wrap your app root with <ApiProvider baseUrl="..." ...>.',
    );
  }

  return client;
};
