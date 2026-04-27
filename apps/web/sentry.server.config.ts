/**
 * Sentry Node SDK initialization for apps/web server runtime.
 *
 * Server tarafında her request için tenant_id ve user_id Sentry scope'a
 * middleware (apps/web/src/middleware.ts) içinden eklenir. Burada sadece
 * temel yapılandırma var.
 */
import * as Sentry from '@sentry/nextjs';

const env = process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: env,
  release: process.env.SENTRY_RELEASE,

  // Server tarafı tracing — production'da %10, dev/staging %100
  tracesSampleRate: env === 'production' ? 0.1 : 1.0,

  // PII gönderme — KVKK uyumu için tenant/user ID dışında bilgi yok
  sendDefaultPii: false,

  // Health probe gürültüsünü kapat
  ignoreTransactions: ['/healthz', '/readyz', '/api/health'],
});
