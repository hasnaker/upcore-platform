import { describe, it, expect } from 'vitest';
import { createQueryClient, defaultQueryOptions } from './query-client';

describe('createQueryClient', () => {
  it('creates a QueryClient instance', () => {
    const client = createQueryClient();
    expect(client).toBeDefined();
    expect(typeof client.getQueryCache).toBe('function');
  });
});

describe('defaultQueryOptions', () => {
  it('has staleTime set to 30 seconds', () => {
    expect(defaultQueryOptions.queries?.staleTime).toBe(30_000);
  });

  it('has gcTime set to 5 minutes', () => {
    expect(defaultQueryOptions.queries?.gcTime).toBe(300_000);
  });

  it('has retry set to 1', () => {
    expect(defaultQueryOptions.queries?.retry).toBe(1);
  });

  it('has refetchOnWindowFocus disabled', () => {
    expect(defaultQueryOptions.queries?.refetchOnWindowFocus).toBe(false);
  });

  it('has mutation retry set to 0', () => {
    expect(defaultQueryOptions.mutations?.retry).toBe(0);
  });
});
