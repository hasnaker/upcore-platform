import { describe, it, expect } from 'vitest';
import { formatPercent, parsePercent } from './percent';

describe('formatPercent', () => {
  it('formats 0.156 as %15,6', () => {
    expect(formatPercent(0.156)).toBe('%15,6');
  });

  it('formats 1 as %100,0', () => {
    expect(formatPercent(1)).toBe('%100,0');
  });

  it('formats 0 as %0,0', () => {
    expect(formatPercent(0)).toBe('%0,0');
  });

  it('respects decimal places', () => {
    expect(formatPercent(0.156, 0)).toBe('%16');
    expect(formatPercent(0.156, 2)).toBe('%15,60');
  });
});

describe('parsePercent', () => {
  it('parses %15,6 to 0.156', () => {
    expect(parsePercent('%15,6')).toBeCloseTo(0.156, 4);
  });

  it('parses 15,6% to 0.156', () => {
    expect(parsePercent('15,6%')).toBeCloseTo(0.156, 4);
  });

  it('returns null for empty string', () => {
    expect(parsePercent('')).toBeNull();
  });

  it('returns null for non-numeric', () => {
    expect(parsePercent('abc')).toBeNull();
  });
});
