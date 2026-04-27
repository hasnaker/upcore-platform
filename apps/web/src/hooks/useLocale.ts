'use client';

import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_LOCALE, type Locale, SUPPORTED_LOCALES, t } from '@/i18n/config';

const COOKIE = 'upcore_locale';

function readCookie(): Locale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]+)`));
  const val = match?.[1] as Locale | undefined;
  return val && SUPPORTED_LOCALES.includes(val) ? val : DEFAULT_LOCALE;
}

function writeCookie(loc: Locale) {
  if (typeof document === 'undefined') return;
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${COOKIE}=${loc}; Path=/; Max-Age=${oneYear}; SameSite=Lax`;
}

export function useLocale(): {
  locale: Locale;
  setLocale: (next: Locale) => void;
} {
  const [locale, setState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    setState(readCookie());
  }, []);

  const setLocale = useCallback((next: Locale) => {
    writeCookie(next);
    setState(next);
  }, []);

  return { locale, setLocale };
}

export function useT(): (key: string, vars?: Record<string, string>) => string {
  const { locale } = useLocale();
  return useCallback(
    (key: string, vars?: Record<string, string>) => t(key, locale, vars),
    [locale],
  );
}
