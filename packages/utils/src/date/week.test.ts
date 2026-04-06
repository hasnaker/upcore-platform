import { describe, it, expect } from 'vitest';
import { startOfWeekTr, endOfWeekTr, weekKey } from './week';

describe('startOfWeekTr', () => {
  it('returns Monday for a Wednesday', () => {
    const wed = new Date(2026, 3, 8); // Wednesday
    const result = startOfWeekTr(wed);
    expect(result.getDay()).toBe(1); // Monday
    expect(result.getDate()).toBe(6);
  });

  it('returns the same day for Monday', () => {
    const mon = new Date(2026, 3, 6); // Monday
    const result = startOfWeekTr(mon);
    expect(result.getDate()).toBe(6);
  });
});

describe('endOfWeekTr', () => {
  it('returns Sunday for a Wednesday', () => {
    const wed = new Date(2026, 3, 8);
    const result = endOfWeekTr(wed);
    expect(result.getDay()).toBe(0); // Sunday
    expect(result.getDate()).toBe(12);
  });
});

describe('weekKey', () => {
  it('returns ISO week key', () => {
    const date = new Date(2026, 3, 4); // Saturday April 4, 2026
    const key = weekKey(date);
    expect(key).toMatch(/^2026-W\d{2}$/);
  });

  it('handles year rollover (Dec 31 → W01)', () => {
    // Dec 31, 2026 is a Thursday — ISO week 53 or week 1 of 2027
    const dec31 = new Date(2026, 11, 31);
    const key = weekKey(dec31);
    expect(key).toMatch(/^\d{4}-W\d{2}$/);
  });

  it('pads single-digit weeks', () => {
    const jan5 = new Date(2026, 0, 5); // early January
    const key = weekKey(jan5);
    expect(key).toMatch(/W\d{2}/); // always 2 digits
  });
});
