import { describe, it, expect } from 'vitest';
import { validateTrIban, formatIban } from './iban';

describe('validateTrIban', () => {
  // Real-format valid Turkish IBANs (mod-97 verified)
  it('validates a correct TR IBAN', () => {
    expect(validateTrIban('TR330006100519786457841326')).toBe(true);
  });

  it('validates with spaces', () => {
    expect(validateTrIban('TR33 0006 1005 1978 6457 8413 26')).toBe(true);
  });

  it('validates lowercase input', () => {
    expect(validateTrIban('tr330006100519786457841326')).toBe(true);
  });

  it('rejects wrong check digits', () => {
    expect(validateTrIban('TR000006100519786457841326')).toBe(false);
  });

  it('rejects non-TR country code', () => {
    expect(validateTrIban('DE330006100519786457841326')).toBe(false);
  });

  it('rejects wrong length (25 chars)', () => {
    expect(validateTrIban('TR33000610051978645784132')).toBe(false);
  });

  it('rejects wrong length (27 chars)', () => {
    expect(validateTrIban('TR3300061005197864578413261')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validateTrIban('')).toBe(false);
  });

  it('rejects strings with letters in account number', () => {
    expect(validateTrIban('TR33000610051978ABCD841326')).toBe(false);
  });
});

describe('formatIban', () => {
  it('groups into 4-char blocks', () => {
    expect(formatIban('TR330006100519786457841326')).toBe('TR33 0006 1005 1978 6457 8413 26');
  });

  it('handles already formatted input', () => {
    expect(formatIban('TR33 0006 1005 1978 6457 8413 26')).toBe('TR33 0006 1005 1978 6457 8413 26');
  });
});
