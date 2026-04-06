import { describe, it, expect } from 'vitest';
import { formatNumberTr, parseNumberTr, formatCompactTr } from './number';

describe('formatNumberTr', () => {
  it('formats with Turkish conventions', () => {
    expect(formatNumberTr(12345.67)).toBe('12.345,67');
  });

  it('formats without decimals', () => {
    expect(formatNumberTr(12345, 0)).toBe('12.345');
  });

  it('formats negative numbers', () => {
    expect(formatNumberTr(-1500, 0)).toBe('-1.500');
  });
});

describe('parseNumberTr', () => {
  it('parses Turkish-formatted number', () => {
    expect(parseNumberTr('12.345,67')).toBe(12345.67);
  });

  it('parses negative number', () => {
    expect(parseNumberTr('-1.500')).toBe(-1500);
  });

  it('returns null for empty string', () => {
    expect(parseNumberTr('')).toBeNull();
  });

  it('returns null for non-numeric', () => {
    expect(parseNumberTr('abc')).toBeNull();
  });
});

describe('formatCompactTr', () => {
  it('formats thousands as B', () => {
    expect(formatCompactTr(1500)).toContain('B');
  });

  it('formats millions as Mn', () => {
    expect(formatCompactTr(2500000)).toContain('Mn');
  });

  it('formats billions as Mr', () => {
    expect(formatCompactTr(1200000000)).toContain('Mr');
  });

  it('formats small numbers normally', () => {
    const result = formatCompactTr(42);
    expect(result).toBe('42');
  });
});
