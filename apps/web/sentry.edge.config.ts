/**
 * Sentry Edge SDK initialization (middleware + edge runtime routes).
 *
 * Edge runtime'da Node API'leri yok — sadece minimal Sentry SDK kullanılır.
 */
import * as Sentry from '@sentry/nextjs';

const env = process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: env,
  release: process.env.SENTRY_RELEASE,
  tracesSampleRate: env === 'production' ? 0.1 : 1.0,
  sendDefaultPii: false,
});
