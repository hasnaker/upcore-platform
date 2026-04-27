'use client';

import { useEffect, useState } from 'react';

/**
 * Girilen değerin "durulmuş" halini döndürür. Arama input'u gibi yerlerde
 * kullanıcı yazarken her keystroke'ta API vurmamak için 300ms tipik gecikme.
 */
export function useDebouncedValue<T>(value: T, delayMs: number = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}
