import { headers } from 'next/headers';

/**
 * Resolves the current tenant slug from the middleware-injected
 * `x-tenant-slug` header. Returns null on the public marketing domain.
 */
export async function getTenantSlug(): Promise<string | null> {
  const hdrs = await headers();
  const slug = hdrs.get('x-tenant-slug');
  return slug && slug.length > 0 ? slug : null;
}

export async function requireTenantSlug(): Promise<string> {
  const slug = await getTenantSlug();
  if (!slug) {
    throw new Error('Tenant bağlamı bulunamadı.');
  }
  return slug;
}
