/**
 * VKN (Vergi Kimlik Numarası) validator — Turkish tax number for corporations.
 *
 * Rules: 10 digits, custom checksum algorithm defined by GIB (Gelir İdaresi
 * Başkanlığı).
 */
import { z } from 'zod';

const VKN_REGEX = /^\d{10}$/;

/** Validate a 10-digit VKN checksum per GIB algorithm. */
export function isValidVkn(value: string): boolean {
  if (!VKN_REGEX.test(value)) return false;

  const digits = value.split('').map((d) => Number(d));
  const v = (i: number): number => {
    const x = digits[i];
    if (x === undefined) throw new Error('vkn: digit out of range');
    return x;
  };

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    const digit = v(i);
    const tmp = (digit + (9 - i)) % 10;
    sum +=
      tmp === 0
        ? 0
        : (tmp * Math.pow(2, 9 - i)) % 9 === 0
          ? 9
          : (tmp * Math.pow(2, 9 - i)) % 9;
  }
  const check = (10 - (sum % 10)) % 10;
  return check === v(9);
}

export const VknSchema = z
  .string()
  .length(10, { message: 'VKN 10 haneli olmalıdır' })
  .regex(VKN_REGEX, { message: 'VKN yalnızca rakamlardan oluşmalıdır' })
  .refine(isValidVkn, { message: 'Geçersiz VKN (sağlama hatası)' });

export type Vkn = z.infer<typeof VknSchema>;
