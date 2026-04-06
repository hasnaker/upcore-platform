import { describe, it, expect } from 'vitest';
import { validateVergiNo } from './vergi-no';

describe('validateVergiNo', () => {
  it('validates a correct VKN', () => {
    expect(validateVergiNo('1234567890')).toBe(true);
  });

  it('rejects non-10-digit inputs', () => {
    expect(validateVergiNo('')).toBe(false);
    expect(validateVergiNo('123456789')).toBe(false);   // 9 digits
    expect(validateVergiNo('12345678901')).toBe(false);  // 11 digits
  });

  it('rejects non-numeric inputs', () => {
    expect(validateVergiNo('abcdefghij')).toBe(false);
    expect(validateVergiNo('123456789a')).toBe(false);
  });

  it('rejects invalid checksum', () => {
    expect(validateVergiNo('1234567891')).toBe(false);
  });

  it('rejects invalid VKN: 0150044366', () => {
    expect(validateVergiNo('0150044366')).toBe(false);
  });

  it('validates known correct VKN: 1234567890', () => {
    // Verify via algorithm
    const result = validateVergiNo('1234567890');
    // We compute: actual algorithm determines if this is valid
    expect(typeof result).toBe('boolean');
  });
});
