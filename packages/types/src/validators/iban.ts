/**
 * Turkish IBAN validator.
 *
 * Format: TR + 24 digits = 26 characters total.
 * Validation: ISO 13616 MOD-97-10 checksum.
 */
import { z } from 'zod';

const IBAN_TR_REGEX = /^TR\d{24}$/;

/** Run MOD-97 on an alphanumeric IBAN — result must be 1 to be valid. */
function mod97(ibanWithoutSpaces: string): number {
  // Move first 4 chars to end, then convert letters to numbers (A=10..Z=35).
  const rearranged = ibanWithoutSpaces.slice(4) + ibanWithoutSpaces.slice(0, 4);
  let numeric = '';
  for (const ch of rearranged) {
    const code = ch.charCodeAt(0);
    if (code >= 48 && code <= 57) {
      numeric += ch;
    } else if (code >= 65 && code <= 90) {
      numeric += String(code - 55);
    } else {
      return -1;
    }
  }
  // Compute modulo in chunks to avoid BigInt
  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 7) {
    const chunk = String(remainder) + numeric.slice(i, i + 7);
    remainder = Number(chunk) % 97;
  }
  return remainder;
}

export function isValidTurkishIban(value: string): boolean {
  const cleaned = value.replace(/\s+/g, '').toUpperCase();
  if (!IBAN_TR_REGEX.test(cleaned)) return false;
  return mod97(cleaned) === 1;
}

export const IbanTrSchema = z
  .string()
  .transform((v) => v.replace(/\s+/g, '').toUpperCase())
  .refine((v) => IBAN_TR_REGEX.test(v), {
    message: 'IBAN TR ile başlamalı ve 26 karakter olmalıdır',
  })
  .refine(isValidTurkishIban, { message: 'Geçersiz IBAN (MOD-97 hatası)' });

export type IbanTr = z.infer<typeof IbanTrSchema>;
