import { describe, it, expect } from 'vitest';
import { UserRole, UserRoleSchema, USER_ROLE_RANK } from './user-role';

describe('UserRole enum', () => {
  it('contains all 7 roles', () => {
    expect(Object.keys(UserRole)).toHaveLength(7);
  });

  it('schema rejects invalid role strings', () => {
    expect(() => UserRoleSchema.parse('ROOT')).toThrow();
    expect(() => UserRoleSchema.parse('admin')).toThrow();
  });

  it('schema accepts every enum value', () => {
    for (const v of Object.values(UserRole)) {
      expect(UserRoleSchema.parse(v)).toBe(v);
    }
  });

  it('rank ordering: SUPER_ADMIN > TENANT_ADMIN > EMPLOYEE > CANDIDATE', () => {
    expect(USER_ROLE_RANK.SUPER_ADMIN).toBeGreaterThan(
      USER_ROLE_RANK.TENANT_ADMIN,
    );
    expect(USER_ROLE_RANK.TENANT_ADMIN).toBeGreaterThan(
      USER_ROLE_RANK.EMPLOYEE,
    );
    expect(USER_ROLE_RANK.EMPLOYEE).toBeGreaterThan(USER_ROLE_RANK.CANDIDATE);
  });
});
