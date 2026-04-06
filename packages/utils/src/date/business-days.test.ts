import { describe, it, expect } from 'vitest';
import {
  isTurkishHoliday,
  isBusinessDay,
  businessDaysBetween,
  addBusinessDaysTr,
  TURKISH_HOLIDAYS_2026,
} from './business-days';

describe('isTurkishHoliday', () => {
  it('recognizes Yılbaşı (Jan 1)', () => {
    expect(isTurkishHoliday(new Date(2026, 0, 1))).toBe(true);
  });

  it('recognizes 23 Nisan', () => {
    expect(isTurkishHoliday(new Date(2026, 3, 23))).toBe(true);
  });

  it('recognizes 1 Mayıs', () => {
    expect(isTurkishHoliday(new Date(2026, 4, 1))).toBe(true);
  });

  it('recognizes 19 Mayıs', () => {
    expect(isTurkishHoliday(new Date(2026, 4, 19))).toBe(true);
  });

  it('recognizes 15 Temmuz', () => {
    expect(isTurkishHoliday(new Date(2026, 6, 15))).toBe(true);
  });

  it('recognizes 30 Ağustos', () => {
    expect(isTurkishHoliday(new Date(2026, 7, 30))).toBe(true);
  });

  it('recognizes 29 Ekim', () => {
    expect(isTurkishHoliday(new Date(2026, 9, 29))).toBe(true);
  });

  it('recognizes Ramazan Bayramı 2026', () => {
    expect(isTurkishHoliday(new Date(2026, 2, 20))).toBe(true);
    expect(isTurkishHoliday(new Date(2026, 2, 21))).toBe(true);
    expect(isTurkishHoliday(new Date(2026, 2, 22))).toBe(true);
  });

  it('recognizes Kurban Bayramı 2026', () => {
    expect(isTurkishHoliday(new Date(2026, 4, 27))).toBe(true);
    expect(isTurkishHoliday(new Date(2026, 4, 28))).toBe(true);
    expect(isTurkishHoliday(new Date(2026, 4, 29))).toBe(true);
    expect(isTurkishHoliday(new Date(2026, 4, 30))).toBe(true);
  });

  it('returns false for normal days', () => {
    expect(isTurkishHoliday(new Date(2026, 3, 6))).toBe(false); // random Monday
  });

  it('has all required 2026 holidays', () => {
    expect(TURKISH_HOLIDAYS_2026.length).toBeGreaterThanOrEqual(14);
  });
});

describe('isBusinessDay', () => {
  it('returns true for a normal weekday', () => {
    expect(isBusinessDay(new Date(2026, 3, 6))).toBe(true); // Monday
  });

  it('returns false for Saturday', () => {
    expect(isBusinessDay(new Date(2026, 3, 4))).toBe(false); // Saturday
  });

  it('returns false for Sunday', () => {
    expect(isBusinessDay(new Date(2026, 3, 5))).toBe(false); // Sunday
  });

  it('returns false for holidays', () => {
    expect(isBusinessDay(new Date(2026, 3, 23))).toBe(false); // 23 Nisan, Thursday
  });
});

describe('businessDaysBetween', () => {
  it('counts weekdays excluding holidays', () => {
    // April 6 (Mon) to April 10 (Fri) = 5 business days (no holidays this week)
    const start = new Date(2026, 3, 6);
    const end = new Date(2026, 3, 11); // Saturday (exclusive)
    expect(businessDaysBetween(start, end)).toBe(5);
  });

  it('returns 0 for same day', () => {
    const d = new Date(2026, 3, 6);
    expect(businessDaysBetween(d, d)).toBe(0);
  });

  it('returns 0 for end before start', () => {
    const start = new Date(2026, 3, 10);
    const end = new Date(2026, 3, 6);
    expect(businessDaysBetween(start, end)).toBe(0);
  });

  it('excludes holidays from count', () => {
    // Week containing 23 Nisan (Thursday): Mon 20 to Fri 25 should be 4 business days
    const start = new Date(2026, 3, 20);
    const end = new Date(2026, 3, 25); // Saturday
    expect(businessDaysBetween(start, end)).toBe(4);
  });
});

describe('addBusinessDaysTr', () => {
  it('adds business days skipping weekends', () => {
    const friday = new Date(2026, 3, 3); // Friday
    const result = addBusinessDaysTr(friday, 1);
    // Next business day should be Monday April 6
    expect(result.getDate()).toBe(6);
    expect(result.getMonth()).toBe(3);
  });

  it('skips holidays', () => {
    const wed = new Date(2026, 3, 22); // Wednesday before 23 Nisan
    const result = addBusinessDaysTr(wed, 1);
    // 23 Nisan is Thursday holiday, so next business day is Friday April 24
    expect(result.getDate()).toBe(24);
  });
});
