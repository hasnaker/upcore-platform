import { describe, it, expect } from 'vitest';
import { estimateSeverance } from './kidem-tazminat';

describe('estimateSeverance', () => {
  it('calculates for 3 full years', () => {
    const hireDate = new Date(2023, 0, 1);
    const terminationDate = new Date(2026, 0, 1);
    const result = estimateSeverance(hireDate, terminationDate, 20000);

    expect(result.years).toBe(3);
    expect(result.months).toBe(0);
    expect(result.amount).toBeGreaterThan(0);
  });

  it('calculates partial year proration', () => {
    const hireDate = new Date(2024, 0, 1);
    const terminationDate = new Date(2026, 6, 1); // 2.5 years
    const result = estimateSeverance(hireDate, terminationDate, 20000);

    expect(result.years).toBe(2);
    expect(result.months).toBeGreaterThan(0);
    expect(result.amount).toBeGreaterThan(0);
  });

  it('caps at severance ceiling', () => {
    const hireDate = new Date(2024, 0, 1);
    const terminationDate = new Date(2026, 0, 1);
    const veryHighSalary = 100000;
    const result = estimateSeverance(hireDate, terminationDate, veryHighSalary);

    expect(result.cappedAt).toBeGreaterThan(0);
    // Amount should be based on capped salary, not the full 100k
    const uncappedEstimate = estimateSeverance(hireDate, terminationDate, result.cappedAt);
    expect(result.amount).toBeCloseTo(uncappedEstimate.amount, 0);
  });

  it('returns zero for negative tenure', () => {
    const hireDate = new Date(2026, 6, 1);
    const terminationDate = new Date(2026, 0, 1); // before hire
    const result = estimateSeverance(hireDate, terminationDate, 20000);

    expect(result.amount).toBe(0);
    expect(result.years).toBe(0);
    expect(result.months).toBe(0);
  });
});
