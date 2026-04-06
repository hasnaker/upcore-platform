import { describe, it, expect } from 'vitest';
import { TenantSchema, CreateTenantSchema } from './tenant';

const base = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Acme Türkiye A.Ş.',
  slug: 'acme-tr',
  planTier: 'GROWTH' as const,
  seatCount: 50,
  locale: 'tr-TR' as const,
  timezone: 'Europe/Istanbul',
  enabledModules: ['CORE_HRIS' as const, 'BURNOUT' as const],
  logoUrl: null,
  primaryDomain: null,
  contactEmail: null,
  metadata: {},
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  deletedAt: null,
};

describe('TenantSchema', () => {
  it('accepts valid tenant', () => {
    expect(() => TenantSchema.parse(base)).not.toThrow();
  });

  it('rejects invalid slug', () => {
    expect(() => TenantSchema.parse({ ...base, slug: 'ACME TR' })).toThrow();
    expect(() => TenantSchema.parse({ ...base, slug: '-acme' })).toThrow();
  });

  it('rejects seat count < 1', () => {
    expect(() => TenantSchema.parse({ ...base, seatCount: 0 })).toThrow();
  });

  it('CreateTenantSchema strips id and timestamps', () => {
    const { id, createdAt, updatedAt, deletedAt, ...rest } = base;
    [id, createdAt, updatedAt, deletedAt];
    expect(() => CreateTenantSchema.parse(rest)).not.toThrow();
  });

  it('defaults locale to tr-TR', () => {
    const { id, createdAt, updatedAt, deletedAt, locale, ...rest } = base;
    [id, createdAt, updatedAt, deletedAt, locale];
    const parsed = CreateTenantSchema.parse(rest);
    expect(parsed.locale).toBe('tr-TR');
  });
});
