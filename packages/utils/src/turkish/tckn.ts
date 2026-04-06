/**
 * TC Kimlik No validation per official Nüfus Müdürlüğü algorithm.
 *
 * Algorithm:
 *   1. 11 digits, first digit ≠ 0
 *   2. d10 = ((d1+d3+d5+d7+d9) × 7 − (d2+d4+d6+d8)) mod 10
 *   3. d11 = (d1+d2+d3+d4+d5+d6+d7+d8+d9+d10) mod 10
 */

/**
 * Checks whether the given string is 11 digits and starts with a non-zero digit.
 */
export const isTcknFormat = (s: string): boolean => {
  return /^[1-9]\d{10}$/.test(s);
};

/**
 * Validates a TCKN using the official mod-10/mod-11 algorithm.
 * Returns `true` only if the format is valid AND both check digits match.
 */
export const validateTckn = (tckn: string): boolean => {
  if (!isTcknFormat(tckn)) {
    return false;
  }

  const digits = tckn.split('').map(Number);

  // d10 check: ((d1+d3+d5+d7+d9)*7 - (d2+d4+d6+d8)) mod 10 == d10
  const oddSum =
    (digits[0] as number) +
    (digits[2] as number) +
    (digits[4] as number) +
    (digits[6] as number) +
    (digits[8] as number);
  const evenSum =
    (digits[1] as number) +
    (digits[3] as number) +
    (digits[5] as number) +
    (digits[7] as number);

  const d10 = (oddSum * 7 - evenSum) % 10;
  // Handle negative modulo (JS % can return negative)
  const d10Normalized = ((d10 % 10) + 10) % 10;

  if (d10Normalized !== digits[9]) {
    return false;
  }

  // d11 check: (d1+d2+...+d10) mod 10 == d11
  let sumFirst10 = 0;
  for (let i = 0; i < 10; i++) {
    sumFirst10 += digits[i] as number;
  }
  const d11 = sumFirst10 % 10;

  return d11 === digits[10];
};

/**
 * Masks a TCKN for display, showing first 3 and last 2 digits.
 * Example: "10000000146" → "100******46"
 */
export const maskTckn = (tckn: string): string => {
  if (!isTcknFormat(tckn)) {
    return tckn;
  }
  return `${tckn.slice(0, 3)}${'*'.repeat(6)}${tckn.slice(-2)}`;
};
