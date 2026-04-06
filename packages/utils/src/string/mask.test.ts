import { describe, it, expect } from 'vitest';
import { maskEmail, maskPhone, maskIban } from './mask';

describe('maskEmail', () => {
  it('masks email keeping first 2 chars and domain', () => {
    expect(maskEmail('mehmet@example.com')).toBe('me****@example.com');
  });

  it('masks short local part', () => {
    const result = maskEmail('ab@example.com');
    expect(result).toBe('**@example.com');
  });

  it('returns as-is if no @ sign', () => {
    expect(maskEmail('invalid')).toBe('invalid');
  });
});

describe('maskPhone', () => {
  it('masks phone keeping last 4 digits', () => {
    expect(maskPhone('+905551234567')).toBe('+90******4567');
  });

  it('handles short phone', () => {
    expect(maskPhone('1234')).toBe('1234');
  });
});

describe('maskIban', () => {
  it('masks IBAN keeping first 4 and last 4', () => {
    expect(maskIban('TR330006100519786457841326')).toBe('TR33******************1326');
  });

  it('handles short input', () => {
    expect(maskIban('TR33')).toBe('TR33');
  });
});
