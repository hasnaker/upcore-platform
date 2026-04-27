/**
 * Sentry Edge SDK initialization for apps/admin.
 */
import * as Sentry from '@sentry/nextjs';

const env = process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: env,
  release: process.env.SENTRY_RELEASE,
  tracesSampleRate: 1.0,
  sendDefaultPii: false,
});
