import { describe, it, expect } from 'vitest';
import { BurnoutSignalSchema } from './burnout';
import { burnoutLevelFromScore } from '../enums/burnout-level';

const validSignal = {
  id: '11111111-1111-4111-8111-111111111111',
  tenantId: '22222222-2222-4222-8222-222222222222',
  employeeId: '33333333-3333-4333-8333-333333333333',
  departmentId: null,
  weekOf: '2026-04-06',
  score: 68,
  level: 'ORANGE' as const,
  dimensions: { exhaustion: 75, cynicism: 60, efficacy: 40 },
  jdr: { demands: 80, resources: 45, gap: 35 },
  drivers: [],
  modelVersion: '1.2.3',
  computedAt: '2026-04-06T12:00:00Z',
  metadata: {},
  createdAt: '2026-04-06T12:00:00Z',
  updatedAt: '2026-04-06T12:00:00Z',
  deletedAt: null,
};

describe('BurnoutSignalSchema', () => {
  it('accepts valid signal', () => {
    expect(() => BurnoutSignalSchema.parse(validSignal)).not.toThrow();
  });

  it('rejects level that does not match score', () => {
    const bad = { ...validSignal, level: 'GREEN' as const, score: 80 };
    expect(() => BurnoutSignalSchema.parse(bad)).toThrow();
  });

  it('rejects out-of-range score', () => {
    const bad = { ...validSignal, score: 120 };
    expect(() => BurnoutSignalSchema.parse(bad)).toThrow();
  });

  it('burnoutLevelFromScore mapping', () => {
    expect(burnoutLevelFromScore(0)).toBe('GREEN');
    expect(burnoutLevelFromScore(29)).toBe('GREEN');
    expect(burnoutLevelFromScore(30)).toBe('YELLOW');
    expect(burnoutLevelFromScore(54)).toBe('YELLOW');
    expect(burnoutLevelFromScore(55)).toBe('ORANGE');
    expect(burnoutLevelFromScore(74)).toBe('ORANGE');
    expect(burnoutLevelFromScore(75)).toBe('RED');
    expect(burnoutLevelFromScore(100)).toBe('RED');
  });
});
