/**
 * ky request/response interceptors.
 *
 * Handles:
 *   - Authorization: Bearer token injection
 *   - X-Tenant-Id header injection
 *   - X-Request-Id (unique per request) for tracing
 *   - Accept-Language: tr-TR
 *   - 401 → token refresh → retry once → onUnauthorized
 *   - Error body mapping to UpcoreApiError
 */
import type { BeforeRequestHook, AfterResponseHook, BeforeRetryHook } from 'ky';
import type { FetcherConfig } from './types';
import { toApiError, UpcoreApiError } from './error';

let refreshPromise: Promise<string> | null = null;

/**
 * Builds the beforeRequest hook that adds auth and tenant headers.
 */
export const buildRequestInterceptor = (cfg: FetcherConfig): BeforeRequestHook => {
  return (request: Request) => {
    // Authorization
    const token = cfg.getAccessToken();
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }

    // Tenant ID
    const tenantId = cfg.getTenantId();
    if (tenantId) {
      request.headers.set('X-Tenant-Id', tenantId);
    }

    // Request ID for tracing
    const requestId = generateRequestId();
    request.headers.set('X-Request-Id', requestId);

    // Accept-Language
    request.headers.set('Accept-Language', 'tr-TR');

    // Content-Type default
    if (!request.headers.has('Content-Type') && request.method !== 'GET') {
      request.headers.set('Content-Type', 'application/json');
    }
  };
};

/**
 * Builds the afterResponse hook that handles 401 token refresh.
 */
export const buildResponseInterceptor = (cfg: FetcherConfig): AfterResponseHook => {
  return async (request: Request, _options: object, response: Response) => {
    if (response.status === 401) {
      // Avoid multiple simultaneous refresh attempts
      if (!refreshPromise) {
        refreshPromise = cfg.onTokenRefresh().finally(() => {
          refreshPromise = null;
        });
      }

      try {
        const newToken = await refreshPromise;
        // Retry the original request with the new token
        const retryRequest = new Request(request, {
          headers: new Headers(request.headers),
        });
        retryRequest.headers.set('Authorization', `Bearer ${newToken}`);

        const retryResponse = await fetch(retryRequest);
        if (retryResponse.status === 401) {
          // Refresh succeeded but still unauthorized — session truly invalid
          cfg.onUnauthorized();
        }
        return retryResponse;
      } catch {
        // Refresh failed — session invalid
        cfg.onUnauthorized();
        throw new UpcoreApiError({
          code: 'AUTH_TOKEN_REFRESH_FAILED',
          message: 'Token refresh failed',
          status: 401,
          traceId: request.headers.get('X-Request-Id') ?? 'unknown',
          messageTr: 'Oturum süresi doldu. Lütfen tekrar giriş yapın.',
        });
      }
    }

    // Non-401 errors: parse body and throw structured error
    if (!response.ok) {
      const error = await toApiError({ response } as unknown);
      throw error;
    }
  };
};

/**
 * Builds the beforeRetry hook for 5xx retries.
 */
export const buildRetryInterceptor = (): BeforeRetryHook => {
  return ({ retryCount }) => {
    // Exponential backoff info logged for debugging
    if (typeof globalThis !== 'undefined' && 'console' in globalThis) {
      console.debug(`[upcore/api-client] Retry attempt ${retryCount}`);
    }
  };
};

const generateRequestId = (): string => {
  // Use crypto.randomUUID if available, otherwise fallback
  if (typeof globalThis !== 'undefined' && 'crypto' in globalThis && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};
