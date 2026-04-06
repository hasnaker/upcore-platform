/**
 * Shared internal types for the API client layer.
 */
import type { KyInstance, Options as KyOptions } from 'ky';

/** Configuration required to create a fetcher instance. */
export interface FetcherConfig {
  /** Base URL for the API (e.g., "https://api.upcore.co/v1") */
  baseUrl: string;
  /** Returns the current access token, or null if not authenticated */
  getAccessToken: () => string | null;
  /** Returns the current tenant ID, or null */
  getTenantId: () => string | null;
  /** Called when a 401 response is received and refresh fails */
  onUnauthorized: () => void;
  /** Attempts to refresh the access token; returns new token */
  onTokenRefresh: () => Promise<string>;
}

/** Typed fetcher instance (ky-based). */
export type ApiFetcher = KyInstance;

/** Standard request options passed through to hooks. */
export interface RequestOptions {
  /** Additional query parameters */
  params?: Record<string, string | number | boolean | undefined>;
  /** Custom headers */
  headers?: Record<string, string>;
  /** AbortController signal */
  signal?: AbortSignal;
}

/** Options for mutation hooks. */
export interface MutationHookOptions<TData, TError, TVariables> {
  /** Called on successful mutation */
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
  /** Called on error */
  onError?: (error: TError, variables: TVariables) => void;
  /** Called regardless of success or failure */
  onSettled?: (data: TData | undefined, error: TError | null, variables: TVariables) => void;
}

/** Standard paginated response shape. */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  nextCursor?: string;
}

/** Standard list query parameters. */
export interface ListQueryParams {
  page?: number;
  pageSize?: number;
  cursor?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  search?: string;
}

/** HTTP methods used by the client. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
