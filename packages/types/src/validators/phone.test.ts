import { describe, it, expect } from 'vitest';
import { TurkishPhoneSchema, normalizeTurkishPhone } from './phone';

describe('Turkish phone validator', () => {
  const valid = [
    ['+905321234567', '+905321234567'],
    ['+90 532 123 45 67', '+905321234567'],
    ['0532 123 45 67', '+905321234567'],
    ['05321234567', '+905321234567'],
    ['532 123 45 67', '+905321234567'],
    ['+905551234567', '+905551234567'],
  ] as const;

  const invalid = [
    '1234567890',
    '+12125551234',
    '0432 123 45 67', // landline
    '+90 432 123 45 67',
    '0532 123 45', // too short
    'abcdefghijk',
    '',
  ];

  it.each(valid)('accepts %s -> %s', (input, expected) => {
    expect(normalizeTurkishPhone(input)).toBe(expected);
    expect(TurkishPhoneSchema.parse(input)).toBe(expected);
  });

  it.each(invalid)('rejects invalid phone %s', (input) => {
    expect(() => TurkishPhoneSchema.parse(input)).toThrow();
  });
});
