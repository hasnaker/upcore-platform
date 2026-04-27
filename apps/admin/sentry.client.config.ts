/**
 * Sentry browser SDK initialization for apps/admin (internal admin panel).
 *
 * Admin panel kullanıcı sayısı az (UpCore çalışanları), bu yüzden
 * sampling rate daha yüksek (debugging için tüm hatalar yakalanır).
 */
import * as Sentry from '@sentry/nextjs';

const env = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: env,
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

  // Admin trafiği düşük — full sampling problem değil
  tracesSampleRate: 1.0,

  // Replay — admin panel KVKK PII içerebileceğinden tüm metin maskelenir
  replaysSessionSampleRate: env === 'production' ? 0.05 : 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  ],

  sendDefaultPii: false,

  ignoreErrors: [
    'Non-Error promise rejection captured',
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'NetworkError',
    'Failed to fetch',
  ],

  tracePropagationTargets: ['localhost', /^https:\/\/(api|admin)\.upcore\.io/],
});
