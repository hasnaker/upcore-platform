/**
 * Sentry browser SDK initialization for apps/status (public status page).
 *
 * Status sayfası anonim erişim — user/tenant scope yok. Sadece JS error
 * yakalama ve performance trace. Replay devre dışı (anonim trafik için
 * gereksiz).
 */
import * as Sentry from '@sentry/nextjs';

const env = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: env,
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

  // Status sayfası az trafik — %50 sampling
  tracesSampleRate: env === 'production' ? 0.5 : 1.0,
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,

  sendDefaultPii: false,

  ignoreErrors: [
    'Non-Error promise rejection captured',
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'NetworkError',
    'Failed to fetch',
  ],

  tracePropagationTargets: ['localhost', /^https:\/\/(api|status)\.upcore\.io/],
});
