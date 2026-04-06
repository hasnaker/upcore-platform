/**
 * ky-based HTTP client factory.
 *
 * Creates a pre-configured ky instance with:
 *   - Base URL
 *   - Auth + tenant header injection
 *   - 5xx retry (max 2 attempts)
 *   - 401 → refresh → retry flow
 *   - JSON parsing
 *   - Timeout (30s default)
 */
import ky from 'ky';
import type { KyInstance } from 'ky';
import type { FetcherConfig } from './types';
import { buildRequestInterceptor, buildResponseInterceptor, buildRetryInterceptor } from './interceptors';

export type { FetcherConfig } from './types';
export type ApiFetcher = KyInstance;

/**
 * Creates a configured ky instance for API communication.
 *
 * @param config - Fetcher configuration (base URL, auth hooks, etc.)
 * @returns A ky instance ready for use
 *
 * @example
 * const api = createFetcher({
 *   baseUrl: 'https://api.upcore.co/v1',
 *   getAccessToken: () => clerk.session?.getToken() ?? null,
 *   getTenantId: () => currentTenant?.id ?? null,
 *   onUnauthorized: () => clerk.signOut(),
 *   onTokenRefresh: () => clerk.session?.getToken({ forceRefresh: true }) ?? Promise.reject(),
 * });
 */
export const createFetcher = (config: FetcherConfig): KyInstance => {
  return ky.create({
    prefixUrl: config.baseUrl,
    timeout: 30_000,
    retry: {
      limit: 2,
      methods: ['get', 'put', 'delete'],
      statusCodes: [408, 500, 502, 503, 504],
      backoffLimit: 3000,
    },
    hooks: {
      beforeRequest: [buildRequestInterceptor(config)],
      afterResponse: [buildResponseInterceptor(config)],
      beforeRetry: [buildRetryInterceptor()],
    },
    headers: {
      Accept: 'application/json',
    },
  });
};

/**
 * Helper to build query string from params object, filtering out undefined values.
 */
export const buildSearchParams = (
  params: Record<string, string | number | boolean | undefined | null>,
): string => {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  }

  const str = searchParams.toString();
  return str ? `?${str}` : '';
};
