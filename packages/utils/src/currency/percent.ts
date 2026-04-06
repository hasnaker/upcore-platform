/**
 * Percentage formatting with Turkish locale conventions.
 */

/**
 * Formats a decimal value as a percentage with Turkish conventions.
 *
 * @param value - Decimal value (0.156 represents 15.6%)
 * @param decimals - Number of decimal places (default: 1)
 *
 * @example
 * formatPercent(0.156)    // "%15,6"
 * formatPercent(0.156, 0) // "%16"
 * formatPercent(1)        // "%100"
 */
export const formatPercent = (value: number, decimals: number = 1): string => {
  const percentage = value * 100;
  const formatted = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(percentage);
  return `%${formatted}`;
};

/**
 * Parses a Turkish-formatted percentage string to a decimal.
 * Returns `null` if the string cannot be parsed.
 *
 * @example
 * parsePercent("%15,6") // 0.156
 * parsePercent("15,6%") // 0.156
 */
export const parsePercent = (s: string): number | null => {
  let clean = s.replace(/[%\s]/g, '').trim();
  if (clean === '') return null;

  // Turkish format: comma is decimal separator
  clean = clean.replace(',', '.');

  const num = parseFloat(clean);
  if (isNaN(num)) return null;

  return num / 100;
};
