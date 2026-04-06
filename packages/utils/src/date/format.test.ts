import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatDateTr, formatRelativeTr, formatDateRangeTr } from './format';

describe('formatDateTr', () => {
  it('formats short preset (dd.MM.yyyy)', () => {
    const date = new Date(2026, 3, 4); // April 4, 2026
    expect(formatDateTr(date, 'short')).toBe('04.04.2026');
  });

  it('formats long preset with day name', () => {
    const date = new Date(2026, 3, 4); // Saturday
    const result = formatDateTr(date, 'long');
    expect(result).toContain('Nisan');
    expect(result).toContain('2026');
    expect(result).toContain('Cumartesi');
  });

  it('formats dayMonth preset', () => {
    const date = new Date(2026, 3, 4);
    expect(formatDateTr(date, 'dayMonth')).toBe('4 Nisan');
  });

  it('formats time preset', () => {
    const date = new Date(2026, 3, 4, 14, 30);
    expect(formatDateTr(date, 'time')).toBe('14:30');
  });

  it('defaults to short preset', () => {
    const date = new Date(2026, 0, 15);
    expect(formatDateTr(date)).toBe('15.01.2026');
  });

  it('accepts ISO string input', () => {
    expect(formatDateTr('2026-04-04T00:00:00', 'short')).toContain('04.04.2026');
  });

  it('handles midnight edge case', () => {
    const midnight = new Date(2026, 3, 4, 0, 0, 0);
    expect(formatDateTr(midnight, 'time')).toBe('00:00');
  });
});

describe('formatRelativeTr', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "dün" for yesterday', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 5, 12, 0));
    const yesterday = new Date(2026, 3, 4, 12, 0);
    expect(formatRelativeTr(yesterday)).toBe('dün');
    vi.useRealTimers();
  });
});

describe('formatDateRangeTr', () => {
  it('formats same-month range', () => {
    const start = new Date(2026, 3, 4);
    const end = new Date(2026, 3, 10);
    const result = formatDateRangeTr(start, end);
    expect(result).toContain('4');
    expect(result).toContain('10');
    expect(result).toContain('Nisan');
    expect(result).toContain('2026');
    // Should contain en-dash
    expect(result).toContain('\u2013');
  });

  it('formats cross-month same-year range', () => {
    const start = new Date(2026, 3, 25);
    const end = new Date(2026, 4, 5);
    const result = formatDateRangeTr(start, end);
    expect(result).toContain('Nisan');
    expect(result).toContain('Mayıs');
  });

  it('formats cross-year range', () => {
    const start = new Date(2025, 11, 28);
    const end = new Date(2026, 0, 5);
    const result = formatDateRangeTr(start, end);
    expect(result).toContain('2025');
    expect(result).toContain('2026');
  });
});
