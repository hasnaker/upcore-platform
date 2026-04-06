import { describe, it, expect } from 'vitest';
import { normalizeTurkishPhone, formatTurkishPhone, isValidTurkishMobile } from './phone';

describe('normalizeTurkishPhone', () => {
  it('normalizes +905551234567', () => {
    expect(normalizeTurkishPhone('+905551234567')).toBe('+905551234567');
  });

  it('normalizes 05551234567', () => {
    expect(normalizeTurkishPhone('05551234567')).toBe('+905551234567');
  });

  it('normalizes 5551234567', () => {
    expect(normalizeTurkishPhone('5551234567')).toBe('+905551234567');
  });

  it('normalizes with spaces: 0555 123 45 67', () => {
    expect(normalizeTurkishPhone('0555 123 45 67')).toBe('+905551234567');
  });

  it('normalizes with dashes: 0555-123-45-67', () => {
    expect(normalizeTurkishPhone('0555-123-45-67')).toBe('+905551234567');
  });

  it('normalizes +90 555 123 45 67', () => {
    expect(normalizeTurkishPhone('+90 555 123 45 67')).toBe('+905551234567');
  });

  it('normalizes (0555) 123 45 67', () => {
    expect(normalizeTurkishPhone('(0555) 123 45 67')).toBe('+905551234567');
  });

  it('normalizes 90 555 123 45 67', () => {
    expect(normalizeTurkishPhone('90 555 123 45 67')).toBe('+905551234567');
  });

  it('returns null for landline (starting with 2)', () => {
    expect(normalizeTurkishPhone('02121234567')).toBeNull();
  });

  it('returns null for too short', () => {
    expect(normalizeTurkishPhone('555123')).toBeNull();
  });

  it('returns null for too long', () => {
    expect(normalizeTurkishPhone('+9055512345678')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(normalizeTurkishPhone('')).toBeNull();
  });

  it('returns null for non-Turkish country code', () => {
    expect(normalizeTurkishPhone('+15551234567')).toBeNull();
  });

  it('accepts various GSM prefixes (532, 535, 542, 505)', () => {
    expect(normalizeTurkishPhone('05321234567')).toBe('+905321234567');
    expect(normalizeTurkishPhone('05351234567')).toBe('+905351234567');
    expect(normalizeTurkishPhone('05421234567')).toBe('+905421234567');
    expect(normalizeTurkishPhone('05051234567')).toBe('+905051234567');
  });
});

describe('formatTurkishPhone', () => {
  it('formats E.164 to display format', () => {
    expect(formatTurkishPhone('+905551234567')).toBe('+90 555 123 45 67');
  });

  it('returns as-is if not valid Turkish', () => {
    expect(formatTurkishPhone('+1555')).toBe('+1555');
  });
});

describe('isValidTurkishMobile', () => {
  it('returns true for valid mobile numbers', () => {
    expect(isValidTurkishMobile('+905551234567')).toBe(true);
    expect(isValidTurkishMobile('05551234567')).toBe(true);
  });

  it('returns false for invalid numbers', () => {
    expect(isValidTurkishMobile('02121234567')).toBe(false);
    expect(isValidTurkishMobile('')).toBe(false);
  });
});
