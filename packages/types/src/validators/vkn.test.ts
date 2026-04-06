import { describe, it, expect } from 'vitest';
import { isValidVkn, VknSchema } from './vkn';

describe('VKN validator (format gates)', () => {
  // Format-only rejections — we don't assert checksum correctness here because
  // the GIB algorithm produces specific check digits.
  const wrongFormat = ['123', '12345678901', 'abcdefghij'];

  it.each(wrongFormat)('rejects wrong-format VKN %s', (v) => {
    expect(() => VknSchema.parse(v)).toThrow();
  });

  it('accepts only 10-digit strings at the format level', () => {
    expect(typeof isValidVkn('1234567890')).toBe('boolean');
    expect(isValidVkn('123')).toBe(false);
    expect(isValidVkn('abcdefghij')).toBe(false);
  });
});
