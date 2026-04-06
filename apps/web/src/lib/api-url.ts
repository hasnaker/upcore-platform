/**
 * API URL helper. Returns the base URL for the Upcore API gateway,
 * honoring NEXT_PUBLIC_API_URL (client + server) with a sensible default.
 */
export function apiUrl(path = ''): string {
  const base = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:8080';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return path ? `${base}${normalizedPath}` : base;
}

export function tenantServiceUrl(path = ''): string {
  const base = process.env['TENANT_SERVICE_URL'] ?? 'http://localhost:8081';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return path ? `${base}${normalizedPath}` : base;
}

export function authServiceUrl(path = ''): string {
  const base = process.env['AUTH_SERVICE_URL'] ?? 'http://localhost:8082';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return path ? `${base}${normalizedPath}` : base;
}
