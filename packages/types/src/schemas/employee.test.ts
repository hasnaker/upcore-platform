import { describe, it, expect } from 'vitest';
import {
  EmployeeSchema,
  CreateEmployeeSchema,
  EmployeeListItemSchema,
} from './employee';

const validEmployee = {
  id: '11111111-1111-4111-8111-111111111111',
  tenantId: '22222222-2222-4222-8222-222222222222',
  userId: null,
  sicilNo: 'EMP-001',
  tckn: null,
  firstName: 'Ayşe',
  lastName: 'Yılmaz',
  preferredName: null,
  email: 'ayse@example.com',
  phone: null,
  birthDate: '1990-05-15',
  gender: 'FEMALE' as const,
  nationality: 'TR',
  maritalStatus: 'SINGLE' as const,
  departmentId: null,
  positionId: null,
  managerId: null,
  employmentStatus: 'ACTIVE' as const,
  contractType: 'BELIRSIZ_SURELI' as const,
  hireDate: '2024-01-15',
  terminationDate: null,
  probationEndDate: null,
  avatarUrl: null,
  kvkkConsentAt: null,
  iban: null,
  address: null,
  metadata: {},
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  deletedAt: null,
};

describe('EmployeeSchema', () => {
  it('accepts a valid employee', () => {
    expect(() => EmployeeSchema.parse(validEmployee)).not.toThrow();
  });

  it('rejects missing required fields', () => {
    const copy: Record<string, unknown> = { ...validEmployee };
    delete copy['firstName'];
    expect(() => EmployeeSchema.parse(copy)).toThrow();
  });

  it('CreateEmployeeSchema rejects termination before hire', () => {
    const { id, createdAt, updatedAt, deletedAt, ...rest } = validEmployee;
    // discard variables
    [id, createdAt, updatedAt, deletedAt];
    expect(() =>
      CreateEmployeeSchema.parse({
        ...rest,
        hireDate: '2024-06-01',
        terminationDate: '2024-05-01',
      }),
    ).toThrow();
  });

  it('EmployeeListItemSchema omits sensitive fields', () => {
    const item = EmployeeListItemSchema.parse(validEmployee);
    expect(item).not.toHaveProperty('tckn');
    expect(item).not.toHaveProperty('iban');
    expect(item).not.toHaveProperty('kvkkConsentAt');
    expect(item.firstName).toBe('Ayşe');
  });
});
