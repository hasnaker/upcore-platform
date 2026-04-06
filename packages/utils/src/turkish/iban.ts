/**
 * Turkish IBAN (TR) validation using the ISO 13616 mod-97 algorithm.
 *
 * TR IBAN format: TR + 2 check digits + 5 bank code + 1 reserve + 16 account = 26 chars
 * Example: TR33 0006 1005 1978 6457 8413 26
 */

/**
 * Validates a Turkish IBAN using mod-97 algorithm.
 * Accepts IBANs with or without spaces.
 */
export const validateTrIban = (iban: string): boolean => {
  // Remove spaces and convert to uppercase
  const clean = iban.replace(/\s/g, '').toUpperCase();

  // Must start with TR and be 26 characters
  if (!/^TR\d{24}$/.test(clean)) {
    return false;
  }

  // Move first 4 chars to end
  const rearranged = clean.slice(4) + clean.slice(0, 4);

  // Convert letters to numbers (A=10, B=11, ..., Z=35)
  let numericStr = '';
  for (const char of rearranged) {
    const code = char.charCodeAt(0);
    if (code >= 65 && code <= 90) {
      numericStr += (code - 55).toString();
    } else {
      numericStr += char;
    }
  }

  // Mod 97 check using chunks (BigInt not available everywhere, so use modular arithmetic)
  let remainder = 0;
  for (const char of numericStr) {
    remainder = (remainder * 10 + parseInt(char, 10)) % 97;
  }

  return remainder === 1;
};

/**
 * Formats an IBAN into groups of 4 characters for display.
 * Example: "TR330006100519786457841326" → "TR33 0006 1005 1978 6457 8413 26"
 */
export const formatIban = (iban: string): string => {
  const clean = iban.replace(/\s/g, '').toUpperCase();
  return clean.replace(/(.{4})/g, '$1 ').trim();
};
