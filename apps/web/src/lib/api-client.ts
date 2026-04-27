import { apiUrl } from './api-url';

export interface ApiRequestOptions extends Omit<RequestInit, 'body'> {
  /** Parsed/stringified automatically. */
  body?: unknown;
  /** Bearer token — injected as Authorization header if provided. */
  token?: string | null;
  /** Tenant slug/id — injected as X-Tenant-Slug header. */
  tenantSlug?: string | null;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly data: unknown;

  constructor(status: number, message: string, data: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Thin fetch wrapper. Server components should pass a fresh Clerk token
 * (via `await getToken()`); client components should use the React Query
 * hook helper which injects the token automatically.
 */
export async function apiFetch<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { body, token, tenantSlug, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(headers as Record<string, string> | undefined),
  };

  if (token) finalHeaders['Authorization'] = `Bearer ${token}`;
  if (tenantSlug) finalHeaders['X-Tenant-Slug'] = tenantSlug;

  const response = await fetch(apiUrl(path), {
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const payload: unknown = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      isJson && typeof payload === 'object' && payload !== null && 'message' in payload
        ? String((payload as { message: unknown }).message)
        : `Request failed with status ${response.status}`;

    // 402 Payment Required — plan limit. Global bir toast listener'a forward et.
    // Frontend `PlanLimitToaster` component'i bu event'i dinler ve kullanıcıya
    // "Planı yükselt" CTA gösterir.
    if (response.status === 402 && typeof window !== 'undefined') {
      const ev = new CustomEvent('upcore:plan-limit', {
        detail: {
          payload,
          path,
          status: response.status,
        },
      });
      window.dispatchEvent(ev);
    }
    throw new ApiError(response.status, message, payload);
  }

  return payload as T;
}
