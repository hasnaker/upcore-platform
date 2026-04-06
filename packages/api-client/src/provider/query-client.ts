/**
 * Pre-configured QueryClient factory with Upcore defaults.
 *
 * Defaults:
 *   - staleTime: 30s (data considered fresh for 30 seconds)
 *   - gcTime: 5 minutes (garbage collect after 5 min of inactivity)
 *   - retry: 1 (one retry on failure)
 *   - refetchOnWindowFocus: false (no background refetch on tab focus)
 *   - refetchOnReconnect: true
 */
import { QueryClient, type DefaultOptions } from '@tanstack/react-query';

const DEFAULT_STALE_TIME = 30 * 1000; // 30 seconds
const DEFAULT_GC_TIME = 5 * 60 * 1000; // 5 minutes

export const defaultQueryOptions: DefaultOptions = {
  queries: {
    staleTime: DEFAULT_STALE_TIME,
    gcTime: DEFAULT_GC_TIME,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: true,
  },
  mutations: {
    retry: 0,
    gcTime: DEFAULT_GC_TIME,
  },
};

/**
 * Creates a QueryClient with Upcore's default configuration.
 *
 * @example
 * const queryClient = createQueryClient();
 * // Use in <QueryClientProvider client={queryClient}>
 */
export const createQueryClient = (): QueryClient => {
  return new QueryClient({
    defaultOptions: defaultQueryOptions,
  });
};
