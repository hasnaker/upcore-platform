import { describe, it, expect } from 'vitest';
import { calculateAnnualLeaveDays, calculateAnnualLeaveBalance } from './yillik-izin';

describe('calculateAnnualLeaveDays', () => {
  it('returns 0 for less than 1 year tenure', () => {
    const hireDate = new Date(2026, 0, 1);
    const asOf = new Date(2026, 6, 1); // 6 months
    expect(calculateAnnualLeaveDays(hireDate, asOf, 30)).toBe(0);
  });

  it('returns 14 days for 1-5 years tenure', () => {
    const hireDate = new Date(2023, 0, 1);
    const asOf = new Date(2026, 0, 1); // 3 years
    expect(calculateAnnualLeaveDays(hireDate, asOf, 30)).toBe(14);
  });

  it('returns 14 days at exactly 5 years (inclusive)', () => {
    const hireDate = new Date(2021, 0, 1);
    const asOf = new Date(2026, 0, 1); // exactly 5 years
    expect(calculateAnnualLeaveDays(hireDate, asOf, 30)).toBe(14);
  });

  it('returns 20 days for 6-15 years tenure', () => {
    const hireDate = new Date(2016, 0, 1);
    const asOf = new Date(2026, 0, 1); // 10 years
    expect(calculateAnnualLeaveDays(hireDate, asOf, 35)).toBe(20);
  });

  it('returns 26 days for 15+ years tenure', () => {
    const hireDate = new Date(2010, 0, 1);
    const asOf = new Date(2026, 0, 1); // 16 years
    expect(calculateAnnualLeaveDays(hireDate, asOf, 40)).toBe(26);
  });

  it('returns minimum 20 days for employees under 18', () => {
    const hireDate = new Date(2024, 0, 1);
    const asOf = new Date(2026, 0, 1); // 2 years
    expect(calculateAnnualLeaveDays(hireDate, asOf, 17)).toBe(20); // would be 14, but min 20
  });

  it('returns minimum 20 days for employees 50 or older', () => {
    const hireDate = new Date(2024, 0, 1);
    const asOf = new Date(2026, 0, 1); // 2 years
    expect(calculateAnnualLeaveDays(hireDate, asOf, 50)).toBe(20); // would be 14, but min 20
  });

  it('does not lower days for 50+ with high tenure', () => {
    const hireDate = new Date(2010, 0, 1);
    const asOf = new Date(2026, 0, 1); // 16 years
    expect(calculateAnnualLeaveDays(hireDate, asOf, 55)).toBe(26); // 26 > 20
  });
});

describe('calculateAnnualLeaveBalance', () => {
  it('calculates remaining days correctly', () => {
    const hireDate = new Date(2023, 0, 1);
    const asOf = new Date(2026, 0, 1);
    const result = calculateAnnualLeaveBalance(hireDate, asOf, 30, 5);
    expect(result).toEqual({
      entitled: 14,
      used: 5,
      remaining: 9,
    });
  });

  it('returns negative remaining when over-used', () => {
    const hireDate = new Date(2023, 0, 1);
    const asOf = new Date(2026, 0, 1);
    const result = calculateAnnualLeaveBalance(hireDate, asOf, 30, 20);
    expect(result.remaining).toBe(-6);
  });

  it('returns 0 entitled for new employees', () => {
    const hireDate = new Date(2026, 0, 1);
    const asOf = new Date(2026, 6, 1);
    const result = calculateAnnualLeaveBalance(hireDate, asOf, 25, 0);
    expect(result.entitled).toBe(0);
    expect(result.remaining).toBe(0);
  });
});
