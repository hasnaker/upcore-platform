// UpCore i18n baseline. tr = default, en = available for international tenants.
// We don't ship next-intl here because the app is Turkish-first; a lightweight
// key-based t() helper is enough. Wire next-intl when >5% non-TR traffic.

import trMessages from './messages/tr.json';
import enMessages from './messages/en.json';

export type Locale = 'tr' | 'en';
export const DEFAULT_LOCALE: Locale = 'tr';
export const SUPPORTED_LOCALES: Locale[] = ['tr', 'en'];

export const messages: Record<Locale, Record<string, unknown>> = {
  tr: trMessages as Record<string, unknown>,
  en: enMessages as Record<string, unknown>,
};

/**
 * t("nav.employees") → "Calisanlar" (tr default).
 * Supports {name} interpolation.
 */
export function t(key: string, locale: Locale = DEFAULT_LOCALE, vars?: Record<string, string>): string {
  const parts = key.split('.');
  let cur: unknown = messages[locale] ?? messages[DEFAULT_LOCALE];
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return key;
    }
  }
  if (typeof cur !== 'string') return key;
  if (!vars) return cur;
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, v),
    cur,
  );
}
