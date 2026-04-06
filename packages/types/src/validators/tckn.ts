/**
 * TCKN (T.C. Kimlik Numarası) validator.
 *
 * Rules:
 *  - 11 digits
 *  - First digit != 0
 *  - d10 = ((d1+d3+d5+d7+d9) * 7 - (d2+d4+d6+d8)) mod 10
 *  - d11 = (d1+d2+...+d10) mod 10
 *
 * Reference: NVI (Nüfus ve Vatandaşlık İşleri Genel Müdürlüğü)
 */
import { z } from 'zod';

const TCKN_REGEX = /^[1-9][0-9]{10}$/;

/**
 * Validate a TCKN's checksum according to the official algorithm.
 * Assumes the input is already an 11-digit numeric string starting with 1-9.
 */
export function isValidTckn(value: string): boolean {
  if (!TCKN_REGEX.test(value)) {
    return false;
  }
  // Reject known impossible TCKNs (all same digit) — these pass checksum
  // mathematically but are used as placeholders in test data.
  if (/^(\d)\1{10}$/.test(value)) {
    return false;
  }

  const digits = value.split('').map((d) => Number(d));
  // Narrow guards for noUncheckedIndexedAccess
  const d = (idx: number): number => {
    const v = digits[idx];
    if (v === undefined) throw new Error('tckn: digit out of range');
    return v;
  };

  const oddSum = d(0) + d(2) + d(4) + d(6) + d(8);
  const evenSum = d(1) + d(3) + d(5) + d(7);

  const tenth = (oddSum * 7 - evenSum) % 10;
  // JS modulo can be negative
  const tenthNormalized = (tenth + 10) % 10;
  if (tenthNormalized !== d(9)) {
    return false;
  }

  const totalFirstTen =
    d(0) + d(1) + d(2) + d(3) + d(4) + d(5) + d(6) + d(7) + d(8) + d(9);
  const eleventh = totalFirstTen % 10;
  if (eleventh !== d(10)) {
    return false;
  }

  return true;
}

/** Zod schema for a Turkish ID number (TCKN). */
export const TcknSchema = z
  .string()
  .length(11, { message: 'TCKN 11 haneli olmalıdır' })
  .regex(TCKN_REGEX, { message: 'TCKN yalnızca rakam içermelidir ve 0 ile başlayamaz' })
  .refine(isValidTckn, { message: 'Geçersiz TCKN (sağlama hatası)' });

export type Tckn = z.infer<typeof TcknSchema>;
