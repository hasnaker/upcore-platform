import { describe, it, expect } from 'vitest';
import { isValidTckn, TcknSchema } from './tckn';

/**
 * Computed valid TCKNs per the NVI algorithm. These are synthetic —
 * they pass the checksum but are not real citizen IDs.
 *
 * Derivation (for 12345678950):
 *   d1..d9 = 1,2,3,4,5,6,7,8,9
 *   oddSum  = d1+d3+d5+d7+d9 = 1+3+5+7+9 = 25
 *   evenSum = d2+d4+d6+d8    = 2+4+6+8   = 20
 *   d10 = (25*7 - 20) mod 10 = 155 mod 10 = 5
 *   d11 = (1+2+3+4+5+6+7+8+9+5) mod 10 = 50 mod 10 = 0
 */
describe('TCKN validator', () => {
  const validTckns = [
    '12345678950',
    '21345678938',
    '50000000050',
    '10000000078',
  ];

  const invalidTckns = [
    '11111111110', // passes checksum but is placeholder (all-same digits)
    '00000000000', // starts with 0
    '01234567890', // starts with 0
    '123', // too short
    '123456789012', // too long
    '1234567890a', // non-digit
    '12345678951', // wrong d11
    '12345678960', // wrong d10
    '',
  ];

  it.each(validTckns)('accepts valid TCKN %s', (tckn) => {
    expect(isValidTckn(tckn)).toBe(true);
    expect(() => TcknSchema.parse(tckn)).not.toThrow();
  });

  it.each(invalidTckns)('rejects invalid TCKN %s', (tckn) => {
    expect(isValidTckn(tckn)).toBe(false);
    expect(() => TcknSchema.parse(tckn)).toThrow();
  });
});
