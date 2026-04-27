/**
 * Sentry browser SDK initialization for apps/web (customer panel).
 *
 * Tüm yakalanan hatalara tenant_id + user_id (Clerk) tag'i bağlanır
 * (RootProvider içinde Sentry.setUser/setTag çağrılır). Burada sadece
 * SDK'nın temel yapılandırması yapılır.
 *
 * - tracesSampleRate: prod'da %10 — UpCore SLA bütçesi içinde performans
 *   trace topluyoruz; staging/dev'de %100.
 * - replaysSessionSampleRate: prod %1 — KVKK gereği DOM kayıtları minimal,
 *   `maskAllText: true` zorunlu.
 * - replaysOnErrorSampleRate: %100 — hata anında oturumun kayıtlanması
 *   debugging için kritik.
 */
import * as Sentry from '@sentry/nextjs';

const env = process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: env,
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

  // Performans örnekleme
  tracesSampleRate: env === 'production' ? 0.1 : 1.0,

  // Session Replay (KVKK uyumlu — tüm metin maskelenir)
  replaysSessionSampleRate: env === 'production' ? 0.01 : 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  ],

  // PII varsayılan olarak gönderilmez; özel olarak setUser ile kullanıcı
  // ID'si (Clerk userId) eklenir, e-posta gönderilmez.
  sendDefaultPii: false,

  // 4xx hataları gürültü; 5xx ve runtime exception'ları yakalanır.
  ignoreErrors: [
    // Browser eklentilerinden gelen alakasız hatalar
    'Non-Error promise rejection captured',
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    // Network — kullanıcı internet kestiğinde Sentry'e gönderme
    'NetworkError',
    'Failed to fetch',
  ],

  // Sentry'in kendi requests'ini trace etme (sonsuz döngü önleme)
  tracePropagationTargets: ['localhost', /^https:\/\/(api|app|admin)\.upcore\.io/],
});
