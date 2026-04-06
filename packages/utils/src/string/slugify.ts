/**
 * Turkish-aware slug generator.
 *
 * Converts Turkish text to URL-safe slugs by:
 *   1. Converting to lowercase (Turkish-aware)
 *   2. Removing Turkish diacritics (ş→s, ç→c, ğ→g, ı→i, ö→o, ü→u, İ→i)
 *   3. Replacing non-alphanumeric chars with hyphens
 *   4. Collapsing multiple hyphens and trimming
 */
import { removeTurkishDiacritics, turkishSafeLowerCase } from '../turkish/diacritics';

/**
 * Generates a URL-safe slug from Turkish text.
 *
 * @example
 * slugifyTr("Şirketimiz İstanbul")   // "sirketimiz-istanbul"
 * slugifyTr("Çalışan Memnuniyeti")   // "calisan-memnuniyeti"
 * slugifyTr("İK & Yönetim")          // "ik-yonetim"
 */
export const slugifyTr = (s: string): string => {
  return removeTurkishDiacritics(turkishSafeLowerCase(s))
    .toLowerCase() // final pass for any remaining uppercase
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
};
