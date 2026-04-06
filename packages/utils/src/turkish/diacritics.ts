/**
 * Turkish-aware diacritic handling for search indexing and slug generation.
 *
 * Handles the 6 special Turkish characters:
 *   ç/Ç, ğ/Ğ, ı/I, İ/i, ö/Ö, ş/Ş, ü/Ü
 *
 * JavaScript's `.toLowerCase()` does NOT handle Turkish dotless-ı correctly.
 * This module uses `.toLocaleLowerCase('tr-TR')` for correctness.
 */

const TURKISH_DIACRITICS_MAP: Record<string, string> = {
  ç: 'c',
  Ç: 'C',
  ğ: 'g',
  Ğ: 'G',
  ı: 'i',
  I: 'I',
  İ: 'I',
  i: 'i',
  ö: 'o',
  Ö: 'O',
  ş: 's',
  Ş: 'S',
  ü: 'u',
  Ü: 'U',
};

const DIACRITICS_REGEX = /[çÇğĞıİöÖşŞüÜ]/g;

/**
 * Removes Turkish-specific diacritics, mapping to ASCII equivalents.
 * Example: "İstanbul Şişli" → "Istanbul Sisli"
 */
export const removeTurkishDiacritics = (s: string): string => {
  return s.replace(DIACRITICS_REGEX, (char) => TURKISH_DIACRITICS_MAP[char] ?? char);
};

/**
 * Turkish-locale-aware lowercase.
 * Correctly handles: İ → i, I → ı (in Turkish locale)
 *
 * For ASCII-safe lowercase (for slugs/search), use `removeTurkishDiacritics` first.
 */
export const turkishSafeLowerCase = (s: string): string => {
  return s.toLocaleLowerCase('tr-TR');
};

/**
 * Turkish-locale-aware uppercase.
 * Correctly handles: i → İ, ı → I (in Turkish locale)
 */
export const turkishSafeUpperCase = (s: string): string => {
  return s.toLocaleUpperCase('tr-TR');
};
