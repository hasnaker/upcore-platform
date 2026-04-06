import { describe, it, expect } from 'vitest';
import { validateTckn, isTcknFormat, maskTckn } from './tckn';

describe('isTcknFormat', () => {
  it('accepts 11-digit strings starting with non-zero', () => {
    expect(isTcknFormat('10000000146')).toBe(true);
    expect(isTcknFormat('12345678901')).toBe(true);
  });

  it('rejects strings starting with 0', () => {
    expect(isTcknFormat('01234567890')).toBe(false);
  });

  it('rejects strings that are not 11 digits', () => {
    expect(isTcknFormat('1234567890')).toBe(false); // 10 digits
    expect(isTcknFormat('123456789012')).toBe(false); // 12 digits
    expect(isTcknFormat('')).toBe(false);
    expect(isTcknFormat('abc')).toBe(false);
  });

  it('rejects non-numeric strings', () => {
    expect(isTcknFormat('1234567890a')).toBe(false);
    expect(isTcknFormat('12345 78901')).toBe(false);
  });
});

describe('validateTckn', () => {
  // Golden valid TCKN samples (algorithm-verified)
  const validTckns = [
    '10000000146',
    '76558242278',
    '17291716060',
    '29260807600',
    '50000000050',
    '12345678950',
    '21345678938',
    '10000000078',
  ];

  const invalidTckns = [
    '12345678901', // invalid checksum
    '00000000000', // starts with 0
    '99999999999', // invalid checksum
    '',
    '1234',
    'abcdefghijk',
    '10000000147', // off-by-one in d10
    '10000000156', // off-by-one in d11
    '10000000000', // invalid checksum
    '98765432100', // invalid checksum
  ];

  it.each(validTckns)('validates %s as valid', (tckn) => {
    expect(validateTckn(tckn)).toBe(true);
  });

  it.each(invalidTckns)('rejects %s as invalid', (tckn) => {
    expect(validateTckn(tckn)).toBe(false);
  });

  it('rejects all-same-digit TCKNs that fail checksum', () => {
    // 33333333330 → verify check
    // Most all-same-digit combinations fail
    expect(validateTckn('33333333330')).toBe(true); // algorithm says this is valid
    expect(validateTckn('33333333331')).toBe(false);
  });
});

describe('maskTckn', () => {
  it('masks the middle 6 digits', () => {
    expect(maskTckn('10000000146')).toBe('100******46');
    expect(maskTckn('76558242278')).toBe('765******78');
  });

  it('returns input as-is if format is invalid', () => {
    expect(maskTckn('1234')).toBe('1234');
    expect(maskTckn('')).toBe('');
  });
});
