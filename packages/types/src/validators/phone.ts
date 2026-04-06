/**
 * Turkish phone validator.
 *
 * Accepted formats (all normalized to E.164 +905XXXXXXXXX):
 *  - +90 5XX XXX XX XX
 *  - 0 5XX XXX XX XX
 *  - 5XX XXX XX XX
 *
 * Mobile prefixes: 50X-55X. Landlines are not accepted by default.
 */
import { z } from 'zod';

const PHONE_E164_REGEX = /^\+905\d{9}$/;
const PHONE_LOOSE_REGEX = /^(?:\+?90|0)?\s?5\d{2}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/;

/** Normalize a loose Turkish phone input into E.164 (+905XXXXXXXXX). */
export function normalizeTurkishPhone(input: string): string | null {
  const stripped = input.replace(/[\s-]/g, '');
  if (!PHONE_LOOSE_REGEX.test(input)) return null;
  let digits = stripped;
  if (digits.startsWith('+90')) digits = digits.slice(3);
  else if (digits.startsWith('90')) digits = digits.slice(2);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length !== 10 || !digits.startsWith('5')) return null;
  return '+90' + digits;
}

export function isValidTurkishPhone(input: string): boolean {
  return normalizeTurkishPhone(input) !== null;
}

export const TurkishPhoneSchema = z
  .string()
  .transform((v, ctx) => {
    const normalized = normalizeTurkishPhone(v);
    if (!normalized) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Geçerli bir Türkiye cep telefonu girin (+90 5XX XXX XX XX formatında)',
      });
      return z.NEVER;
    }
    return normalized;
  })
  .pipe(z.string().regex(PHONE_E164_REGEX));

export type TurkishPhone = z.infer<typeof TurkishPhoneSchema>;

/** 5-digit Turkish postal code. */
export const TurkishPostcodeSchema = z
  .string()
  .regex(/^\d{5}$/, { message: 'Posta kodu 5 haneli olmalıdır' });
export type TurkishPostcode = z.infer<typeof TurkishPostcodeSchema>;
