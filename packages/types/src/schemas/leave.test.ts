import { describe, it, expect } from 'vitest';
import { CreateLeaveRequestSchema } from './leave';

describe('CreateLeaveRequestSchema', () => {
  const base = {
    leaveTypeId: '11111111-1111-4111-8111-111111111111',
    type: 'YILLIK' as const,
    startDate: '2026-05-01',
    endDate: '2026-05-05',
    reason: '',
    documentUrl: null,
  };

  it('accepts valid request', () => {
    expect(() => CreateLeaveRequestSchema.parse(base)).not.toThrow();
  });

  it('accepts same day leave', () => {
    expect(() =>
      CreateLeaveRequestSchema.parse({
        ...base,
        startDate: '2026-05-01',
        endDate: '2026-05-01',
      }),
    ).not.toThrow();
  });

  it('rejects end before start', () => {
    expect(() =>
      CreateLeaveRequestSchema.parse({
        ...base,
        startDate: '2026-05-05',
        endDate: '2026-05-01',
      }),
    ).toThrow();
  });
});
