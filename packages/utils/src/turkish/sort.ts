/**
 * Locale-aware string sorting for the Turkish alphabet.
 *
 * Turkish alphabet order:
 *   A B C Ç D E F G Ğ H I İ J K L M N O Ö P R S Ş T U Ü V Y Z
 *
 * Uses Intl.Collator('tr-TR') for correct ordering.
 */

/**
 * Pre-configured Turkish collator for locale-aware comparisons.
 */
export const TR_COLLATOR = new Intl.Collator('tr-TR', {
  sensitivity: 'base',
  numeric: true,
});

/**
 * Compares two strings using Turkish locale rules.
 * Returns negative if a < b, 0 if equal, positive if a > b.
 */
export const turkishCompare = (a: string, b: string): number => {
  return TR_COLLATOR.compare(a, b);
};

/**
 * Sorts an array by an accessor function using Turkish locale rules.
 * Returns a new sorted array (does not mutate the original).
 */
export const sortTurkish = <T>(arr: readonly T[], accessor: (t: T) => string): T[] => {
  return [...arr].sort((a, b) => turkishCompare(accessor(a), accessor(b)));
};
