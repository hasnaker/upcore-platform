import { describe, it, expect } from 'vitest';
import { formatTRY, formatCompactTRY, parseTRY } from './format';

describe('formatTRY', () => {
  it('formats basic amount with symbol', () => {
    const result = formatTRY(12345.67);
    expect(result).toContain('12.345');
    expect(result).toContain('67');
    expect(result).toContain('₺');
  });

  it('formats zero', () => {
    const result = formatTRY(0);
    expect(result).toContain('0');
    expect(result).toContain('₺');
  });

  it('formats negative amounts', () => {
    const result = formatTRY(-5000);
    expect(result).toContain('-');
    expect(result).toContain('5.000');
    expect(result).toContain('₺');
  });

  it('respects decimals option', () => {
    const result = formatTRY(12345.67, { decimals: 0 });
    expect(result).not.toContain(',67');
  });

  it('respects showSymbol: false', () => {
    const result = formatTRY(12345.67, { showSymbol: false });
    expect(result).not.toContain('₺');
    expect(result).toContain('12.345');
  });

  it('formats large amounts correctly', () => {
    const result = formatTRY(1_000_000_000);
    expect(result).toContain('1.000.000.000');
  });
});

describe('formatCompactTRY', () => {
  it('formats millions as Mn ₺', () => {
    const result = formatCompactTRY(1_500_000);
    expect(result).toContain('Mn');
    expect(result).toContain('₺');
  });

  it('formats billions as Mr ₺', () => {
    const result = formatCompactTRY(2_300_000_000);
    expect(result).toContain('Mr');
    expect(result).toContain('₺');
  });

  it('formats thousands as B ₺', () => {
    const result = formatCompactTRY(15_000);
    expect(result).toContain('B');
    expect(result).toContain('₺');
  });

  it('handles small amounts normally', () => {
    const result = formatCompactTRY(500);
    expect(result).toContain('500');
    expect(result).toContain('₺');
  });
});

describe('parseTRY', () => {
  it('parses standard Turkish format', () => {
    expect(parseTRY('12.345,67')).toBe(12345.67);
  });

  it('parses with ₺ symbol', () => {
    expect(parseTRY('12.345,67 ₺')).toBe(12345.67);
  });

  it('parses negative amounts', () => {
    expect(parseTRY('-5.000,00')).toBe(-5000);
  });

  it('returns null for empty string', () => {
    expect(parseTRY('')).toBeNull();
  });

  it('returns null for non-numeric', () => {
    expect(parseTRY('abc')).toBeNull();
  });

  it('round-trips with formatTRY', () => {
    const original = 12345.67;
    const formatted = formatTRY(original, { showSymbol: true });
    const parsed = parseTRY(formatted);
    expect(parsed).toBeCloseTo(original, 2);
  });
});
