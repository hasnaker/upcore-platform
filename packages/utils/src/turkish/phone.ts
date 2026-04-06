/**
 * Turkish phone number normalization, validation, and formatting.
 *
 * Accepted input formats:
 *   0555 123 45 67, +905551234567, 05551234567, 5551234567, 90 555 123 4567
 *
 * Normalized output: +905XXXXXXXXX (E.164)
 */

/**
 * Normalizes a Turkish phone number to E.164 format (+905XXXXXXXXX).
 * Returns `null` if the input cannot be normalized to a valid Turkish mobile.
 */
export const normalizeTurkishPhone = (input: string): string | null => {
  // Strip all non-digit characters
  const digits = input.replace(/\D/g, '');

  let normalized: string;

  if (digits.startsWith('90') && digits.length === 12) {
    // +905551234567 (already includes country code)
    normalized = digits;
  } else if (digits.startsWith('0') && digits.length === 11) {
    // 05551234567
    normalized = '90' + digits.slice(1);
  } else if (digits.length === 10 && digits.startsWith('5')) {
    // 5551234567
    normalized = '90' + digits;
  } else {
    return null;
  }

  // Validate: must start with 905 and be 12 digits total
  if (!/^905\d{9}$/.test(normalized)) {
    return null;
  }

  return '+' + normalized;
};

/**
 * Formats a Turkish E.164 phone number for display.
 * Example: "+905551234567" → "+90 555 123 45 67"
 */
export const formatTurkishPhone = (e164: string): string => {
  const digits = e164.replace(/\D/g, '');

  if (digits.length !== 12 || !digits.startsWith('90')) {
    return e164; // return as-is if not valid Turkish
  }

  const cc = digits.slice(0, 2);
  const area = digits.slice(2, 5);
  const p1 = digits.slice(5, 8);
  const p2 = digits.slice(8, 10);
  const p3 = digits.slice(10, 12);

  return `+${cc} ${area} ${p1} ${p2} ${p3}`;
};

/**
 * Validates that a phone number is a valid Turkish mobile number.
 * Accepts any format (will normalize first).
 */
export const isValidTurkishMobile = (phone: string): boolean => {
  return normalizeTurkishPhone(phone) !== null;
};
