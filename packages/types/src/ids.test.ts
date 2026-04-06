import { describe, it, expect } from 'vitest';
import { EmployeeIdSchema, TenantIdSchema, UserIdSchema } from './ids';

describe('branded ids', () => {
  const uuid = '11111111-1111-4111-8111-111111111111';

  it('accepts UUID v4', () => {
    expect(() => EmployeeIdSchema.parse(uuid)).not.toThrow();
    expect(() => TenantIdSchema.parse(uuid)).not.toThrow();
    expect(() => UserIdSchema.parse(uuid)).not.toThrow();
  });

  it('rejects non-UUID strings', () => {
    expect(() => EmployeeIdSchema.parse('not-a-uuid')).toThrow();
    expect(() => EmployeeIdSchema.parse('')).toThrow();
  });

  it('preserves brand at the type level', () => {
    // This is a runtime-identity check; brand only exists in TS.
    const eid = EmployeeIdSchema.parse(uuid);
    const tid = TenantIdSchema.parse(uuid);
    expect(eid).toBe(uuid);
    expect(tid).toBe(uuid);
    // Both are strings at runtime:
    expect(typeof eid).toBe('string');
  });
});
