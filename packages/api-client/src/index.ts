/**
 * @upcore/api-client
 *
 * Typed fetch client + React Query hooks for the Upcore platform.
 * Provides auth interceptor, tenant header injection, optimistic updates,
 * and standardized error handling.
 */

// Client
export { createFetcher, buildSearchParams } from './client';
export type { ApiFetcher, FetcherConfig, RequestOptions, MutationHookOptions, PaginatedResponse, ListQueryParams } from './client';
export { UpcoreApiError, isUpcoreApiError, toApiError, toApiErrorSync } from './client';

// Provider
export { ApiProvider, useApiClient, createQueryClient, defaultQueryOptions } from './provider';
export type { ApiProviderProps } from './provider';

// Query Keys
export { queryKeys } from './keys';

// Hooks — re-export everything
export * from './hooks';
