/**
 * Vergi Kimlik No (VKN) — 10-digit corporate tax ID validation.
 *
 * Algorithm (Gelir İdaresi Başkanlığı):
 *   For each of the first 9 digits d[i] (i=0..8):
 *     tmp[i] = (d[i] + (9 - i)) mod 10
 *     if tmp[i] ≠ 0: tmp2[i] = (tmp[i] * 2^(9-i)) mod 9
 *                     if (tmp[i] * 2^(9-i)) mod 9 == 0 AND tmp[i] != 0: tmp2[i] = 9
 *     else: tmp2[i] = 0
 *   sum = Σ tmp2[i]
 *   lastDigitCandidate = sum mod 10
 *   d[9] == (10 - lastDigitCandidate) mod 10
 */

/**
 * Validates a 10-digit Turkish Vergi Kimlik No (VKN / Tax ID).
 */
export const validateVergiNo = (vkn: string): boolean => {
  // Must be exactly 10 digits
  if (!/^\d{10}$/.test(vkn)) {
    return false;
  }

  const digits = vkn.split('').map(Number);
  let sum = 0;

  for (let i = 0; i < 9; i++) {
    const d = digits[i] as number;
    const tmp = (d + (9 - i)) % 10;

    if (tmp !== 0) {
      const power = Math.pow(2, 9 - i);
      const product = tmp * power;
      let tmp2 = product % 9;
      if (tmp2 === 0 && tmp !== 0) {
        tmp2 = 9;
      }
      sum += tmp2;
    }
    // If tmp === 0, add 0
  }

  const lastDigitCandidate = sum % 10;
  const expectedLast = (10 - lastDigitCandidate) % 10;

  return expectedLast === digits[9];
};
