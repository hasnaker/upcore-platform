'use client';

import { useEffect } from 'react';

/**
 * Registers the service worker on mount. Intentionally minimal — any reload
 * replaces the old SW as soon as activate completes.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env['NODE_ENV'] !== 'production') return;

    const register = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      } catch {
        // silent — SW is progressive enhancement
      }
    };
    void register();
  }, []);

  return null;
}
