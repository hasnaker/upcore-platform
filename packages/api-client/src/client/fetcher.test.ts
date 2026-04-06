import { describe, it, expect } from 'vitest';
import { buildSearchParams } from './fetcher';

describe('buildSearchParams', () => {
  it('builds query string from params', () => {
    const result = buildSearchParams({ page: 1, pageSize: 20, search: 'test' });
    expect(result).toContain('page=1');
    expect(result).toContain('pageSize=20');
    expect(result).toContain('search=test');
    expect(result.startsWith('?')).toBe(true);
  });

  it('filters out undefined values', () => {
    const result = buildSearchParams({ page: 1, search: undefined });
    expect(result).toContain('page=1');
    expect(result).not.toContain('search');
  });

  it('filters out null values', () => {
    const result = buildSearchParams({ page: 1, search: null });
    expect(result).toContain('page=1');
    expect(result).not.toContain('search');
  });

  it('returns empty string for empty params', () => {
    expect(buildSearchParams({})).toBe('');
  });

  it('converts boolean values', () => {
    const result = buildSearchParams({ isActive: true });
    expect(result).toContain('isActive=true');
  });
});
