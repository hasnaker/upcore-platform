import { describe, it, expect } from 'vitest';
import { isValidTurkishIban, IbanTrSchema } from './iban';

describe('Turkish IBAN validator', () => {
  // Known MOD-97 valid IBAN from public ISO 13616 test vectors.
  const validIbans = ['TR330006100519786457841326'];

  const invalidIbans = [
    'TR010006100519786457841326', // tampered check digits
    'TR990006100519786457841326', // tampered check digits
    'US330006100519786457841326', // wrong country
    'TR12345', // too short
    'TR3300061005197864578413XX', // non-digit payload
    '',
  ];

  it.each(validIbans)('accepts valid IBAN %s', (iban) => {
    expect(isValidTurkishIban(iban)).toBe(true);
    expect(() => IbanTrSchema.parse(iban)).not.toThrow();
  });

  it.each(invalidIbans)('rejects invalid IBAN %s', (iban) => {
    expect(() => IbanTrSchema.parse(iban)).toThrow();
  });

  it('normalizes whitespace and case', () => {
    const parsed = IbanTrSchema.parse('tr33 0006 1005 1978 6457 8413 26');
    expect(parsed).toBe('TR330006100519786457841326');
  });
});
