/**
 * PII masking utilities for display purposes.
 */

/**
 * Masks an email address, showing first 2 chars and domain.
 *
 * @example
 * maskEmail("mehmet@example.com") // "me****@example.com"
 */
export const maskEmail = (email: string): string => {
  const atIndex = email.indexOf('@');
  if (atIndex < 0) return email;

  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex);

  if (local.length <= 2) {
    return `${'*'.repeat(local.length)}${domain}`;
  }

  return `${local.slice(0, 2)}${'*'.repeat(Math.min(local.length - 2, 4))}${domain}`;
};

/**
 * Masks a phone number, showing last 4 digits.
 *
 * @example
 * maskPhone("+905551234567") // "+90*****4567"
 */
export const maskPhone = (phone: string): string => {
  if (phone.length <= 4) return phone;

  const visible = phone.slice(-4);
  const prefix = phone.startsWith('+') ? '+' : '';
  const digitsTillEnd = phone.replace(/^\+/, '');

  if (digitsTillEnd.length <= 4) return phone;

  const countryCode = phone.startsWith('+90') ? '+90' : prefix;
  const maskedLen = phone.length - countryCode.length - 4;

  return `${countryCode}${'*'.repeat(Math.max(maskedLen, 1))}${visible}`;
};

/**
 * Masks an IBAN, showing first 4 and last 4 characters.
 *
 * @example
 * maskIban("TR330006100519786457841326") // "TR33****************1326"
 */
export const maskIban = (iban: string): string => {
  const clean = iban.replace(/\s/g, '');
  if (clean.length <= 8) return clean;

  return `${clean.slice(0, 4)}${'*'.repeat(clean.length - 8)}${clean.slice(-4)}`;
};
