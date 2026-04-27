import type { NextConfig } from 'next';
import bundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env['ANALYZE'] === 'true',
});

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  // Launch readiness: ESLint + TypeScript hatalarını build'de enforce ediyoruz.
  // Eskisi gibi "ignoreDuringBuilds: true" prod'a bozuk kod kaçmasına sebep
  // oluyordu. P0-5 (2026-04-24) ile kapatıldı.
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
  transpilePackages: [
    '@upcore/design-system',
    '@upcore/types',
    '@upcore/utils',
    '@upcore/api-client',
  ],
  experimental: {
    optimizePackageImports: ['lucide-react', '@upcore/design-system'],
  },
  // Blog içerik dosyaları build-time'da okunur; standalone output
  // imajına dahil edilmesi için outputFileTracingIncludes kullanılır.
  outputFileTracingIncludes: {
    '/blog': ['./content/blog/**'],
    '/blog/[slug]': ['./content/blog/**'],
    '/blog/og/[slug]': ['./content/blog/**'],
    '/blog/kategori/[slug]': ['./content/blog/**'],
    '/blog/yazar/[slug]': ['./content/blog/**'],
    '/blog/etiket/[slug]': ['./content/blog/**'],
    '/blog/rss.xml': ['./content/blog/**'],
    '/blog/atom.xml': ['./content/blog/**'],
    '/sitemap.xml': ['./content/blog/**'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.clerk.dev' },
      { protocol: 'https', hostname: 'img.clerk.com' },
      { protocol: 'https', hostname: '*.upcore.app' },
      { protocol: 'https', hostname: '*.upcore.io' },
      { protocol: 'https', hostname: 'cdn.simpleicons.org' },
      { protocol: 'https', hostname: 'api.iconify.design' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            // 2 yıllık HSTS + preload — Chrome HSTS preload list başvurusu
            // için minimum şart (max-age >= 31536000, includeSubDomains,
            // preload). 63072000 = 2 yıl.
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            // CSP — Clerk auth (JS/connect/img), Plausible analytics ve Sentry
            // error reporting whitelistlendi. 'unsafe-inline' + 'unsafe-eval'
            // Next.js 15 hidrasyonu ve Clerk SDK için zorunlu (sıkılaştırma
            // için nonce+strict-dynamic ileride P3'te ele alınacak).
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://clerk.upcore.io https://plausible.io; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://img.clerk.com https://*.upcore.io https://ui-avatars.com; font-src 'self' data:; connect-src 'self' https://*.clerk.accounts.dev https://clerk.upcore.io https://*.upcore.io https://plausible.io https://*.sentry.io wss://*.upcore.io; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ];
  },
};

// ---------------------------------------------------------------------------
// Sentry + Bundle Analyzer wrap.
//
// withSentryConfig: source-map upload, tunneling, instrumentation injection.
// withBundleAnalyzer: ANALYZE=true ile çalıştırıldığında HTML rapor üretir.
//
// Sıralama önemli: önce Sentry sarmalar (sourcemap upload pipeline'ı için),
// sonra BundleAnalyzer dış kabuk olur.
// ---------------------------------------------------------------------------
const sentryWebpackPluginOptions = {
  // Org/project Sentry'de UpCore tenant altında oluşturulur. Token CI'da
  // SENTRY_AUTH_TOKEN env var ile gelir; lokalde upload sessiz devre dışı.
  org: process.env['SENTRY_ORG'] ?? 'upcore',
  project: process.env['SENTRY_PROJECT_WEB'] ?? 'upcore-web',
  silent: !process.env['CI'],
  // Source map upload sadece release tag varsa
  disableLogger: true,
  // Tunneling — Sentry isteklerini kendi domain'imiz üzerinden geçir,
  // ad-blocker tarafından engellenmesini önler.
  tunnelRoute: '/monitoring',
  // Tree-shake hata mesajları paketleme aşamasında.
  hideSourceMaps: true,
  widenClientFileUpload: true,
};

export default withBundleAnalyzer(withSentryConfig(nextConfig, sentryWebpackPluginOptions));
