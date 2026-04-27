/**
 * TRY currency formatting with Turkish conventions.
 *
 * Turkish number format: dot for thousands, comma for decimal.
 *   12345.67 → "12.345,67 ₺"
 */

interface FormatTRYOptions {
  /** Number of decimal places (default: 2) */
  decimals?: number;
  /** Whether to show the ₺ symbol (default: true) */
  showSymbol?: boolean;
}

const _tryCurrencyFormatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Formats a number as Turkish Lira.
 *
 * @example
 * formatTRY(12345.67)                    // "12.345,67 ₺"
 * formatTRY(12345.67, { decimals: 0 })   // "12.346 ₺"
 * formatTRY(12345, { showSymbol: false }) // "12.345,00"
 */
export const formatTRY = (amount: number, opts: FormatTRYOptions = {}): string => {
  const { decimals = 2, showSymbol = true } = opts;

  if (showSymbol) {
    const formatter = new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    // Intl.NumberFormat returns "₺12.345,67" — we normalize to "12.345,67 ₺"
    const parts = formatter.formatToParts(amount);
    const withoutCurrency = parts
      .filter((p) => p.type !== 'currency' && p.type !== 'literal')
      .map((p) => p.value)
      .join('');
    const sign = amount < 0 ? '-' : '';
    const absValue = withoutCurrency.replace(/^-/, '');
    return `${sign}${absValue} \u20BA`;
  }

  const formatter = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return formatter.format(amount);
};

/**
 * Formats a large TRY amount in compact form.
 *
 * @example
 * formatCompactTRY(1_500_000) // "1,5 Mn ₺"
 * formatCompactTRY(2_300_000_000) // "2,3 Mr ₺"
 */
export const formatCompactTRY = (amount: number): string => {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';

  if (abs >= 1_000_000_000) {
    const value = abs / 1_000_000_000;
    const formatted = new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(value);
    return `${sign}${formatted} Mr \u20BA`;
  }

  if (abs >= 1_000_000) {
    const value = abs / 1_000_000;
    const formatted = new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(value);
    return `${sign}${formatted} Mn \u20BA`;
  }

  if (abs >= 1_000) {
    const value = abs / 1_000;
    const formatted = new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(value);
    return `${sign}${formatted} B \u20BA`;
  }

  return formatTRY(amount);
};

/**
 * Parses a Turkish-formatted TRY string to a number.
 * Returns `null` if the string cannot be parsed.
 *
 * @example
 * parseTRY("12.345,67 ₺") // 12345.67
 * parseTRY("12.345,67")    // 12345.67
 */
export const parseTRY = (s: string): number | null => {
  // Remove currency symbol, whitespace
  let clean = s.replace(/[₺\s]/g, '').trim();

  if (clean === '') return null;

  // Handle negative
  const negative = clean.startsWith('-');
  if (negative) {
    clean = clean.slice(1);
  }

  // Turkish format: dot = thousands sep, comma = decimal sep
  // Remove dots (thousands), replace comma with period
  clean = clean.replace(/\./g, '').replace(',', '.');

  const num = parseFloat(clean);
  if (isNaN(num)) return null;

  return negative ? -num : num;
};
