/**
 * Turkish number formatting utilities.
 */

/**
 * Formats a number using Turkish locale conventions (dot for thousands, comma for decimals).
 *
 * @example
 * formatNumberTr(12345.67)    // "12.345,67"
 * formatNumberTr(12345, 0)    // "12.345"
 */
export const formatNumberTr = (n: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
};

/**
 * Parses a Turkish-formatted number string to a number.
 * Returns `null` if the string cannot be parsed.
 *
 * @example
 * parseNumberTr("12.345,67") // 12345.67
 */
export const parseNumberTr = (s: string): number | null => {
  let clean = s.trim();
  if (clean === '') return null;

  const negative = clean.startsWith('-');
  if (negative) {
    clean = clean.slice(1);
  }

  // Remove dots (thousands separator), replace comma (decimal) with period
  clean = clean.replace(/\./g, '').replace(',', '.');

  const num = parseFloat(clean);
  if (isNaN(num)) return null;

  return negative ? -num : num;
};

/**
 * Formats a number in compact Turkish notation.
 *
 * @example
 * formatCompactTr(1500)       // "1,5 B"
 * formatCompactTr(2500000)    // "2,5 Mn"
 * formatCompactTr(1200000000) // "1,2 Mr"
 */
export const formatCompactTr = (n: number): string => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    return `${sign}${formatNumberTr(abs / 1_000_000_000, 1)} Mr`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${formatNumberTr(abs / 1_000_000, 1)} Mn`;
  }
  if (abs >= 1_000) {
    return `${sign}${formatNumberTr(abs / 1_000, 1)} B`;
  }
  return formatNumberTr(n, 0);
};
