import { describe, it, expect } from 'vitest';
import { truncate, truncateMiddle } from './truncate';

describe('truncate', () => {
  it('returns input if shorter than maxLen', () => {
    expect(truncate('Hello', 10)).toBe('Hello');
  });

  it('truncates and adds ellipsis', () => {
    expect(truncate('Hello World', 8)).toBe('Hello...');
  });

  it('handles maxLen shorter than ellipsis', () => {
    expect(truncate('Hello World', 2)).toBe('..');
  });

  it('handles empty string', () => {
    expect(truncate('', 5)).toBe('');
  });

  it('uses custom ellipsis', () => {
    expect(truncate('Hello World', 9, '…')).toBe('Hello Wo…');
  });

  it('does not split multi-byte characters', () => {
    // Turkish İ is a single character but multi-byte in UTF-8
    const result = truncate('İstanbul Şişli Beyoğlu', 15);
    expect(result.length).toBeLessThanOrEqual(15);
    expect(result).toContain('...');
  });
});

describe('truncateMiddle', () => {
  it('returns input if shorter than maxLen', () => {
    expect(truncateMiddle('Hello', 10)).toBe('Hello');
  });

  it('truncates in the middle', () => {
    const result = truncateMiddle('abcdefghijklmnop', 10);
    expect(result).toBe('abcd...nop');
    expect(result.length).toBe(10);
  });
});
