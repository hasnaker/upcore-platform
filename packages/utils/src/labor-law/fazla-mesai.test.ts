import { describe, it, expect } from 'vitest';
import { calculateOvertime } from './fazla-mesai';

describe('calculateOvertime', () => {
  it('returns zero overtime for 45 hours', () => {
    const result = calculateOvertime(45, 100);
    expect(result.overtimeHours).toBe(0);
    expect(result.overtimePay).toBe(0);
    expect(result.regularPay).toBe(4500);
  });

  it('calculates overtime at 1.5× rate', () => {
    const result = calculateOvertime(50, 100);
    expect(result.overtimeHours).toBe(5);
    expect(result.overtimePay).toBe(750); // 5h × 100 × 1.5
    expect(result.regularPay).toBe(4500);
  });

  it('returns zero overtime for less than 45 hours', () => {
    const result = calculateOvertime(40, 100);
    expect(result.overtimeHours).toBe(0);
    expect(result.regularPay).toBe(4000);
  });

  it('caps overtime at annual 270-hour limit', () => {
    // 260 hours already used this year, working 50 this week (5 OT hours)
    const result = calculateOvertime(50, 100, 260);
    expect(result.overtimeHours).toBe(5); // 50-45=5 OT this week (within remaining 10)
    // 5 hours OT, 10 remaining — not capped
  });

  it('warns when hours are capped', () => {
    // 268 hours already used, 50 hour week (5 OT)
    const result = calculateOvertime(50, 100, 268);
    expect(result.overtimeHours).toBe(2); // only 2 remaining
    expect(result.cappedOverHours).toBe(3); // 5 - 2 = 3 capped
  });

  it('handles zero remaining allowance', () => {
    const result = calculateOvertime(50, 100, 270);
    expect(result.overtimeHours).toBe(0);
    expect(result.overtimePay).toBe(0);
    expect(result.cappedOverHours).toBe(5);
  });
});
