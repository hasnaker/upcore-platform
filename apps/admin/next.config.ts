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
  // Launch readiness: bozuk tip/lint prod'a kaçamaz.
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
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Admin panel internal — daha sıkı güvenlik başlıkları.
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            // HSTS 2 yıl + preload — admin.upcore.io subdomain'i de TLS
            // zorunlu. apex preload'u ile tutarlı.
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            // Admin CSP — Clerk + Plausible + Sentry. frame-ancestors none
            // çünkü admin paneli hiçbir iframe içine gömülmemeli (clickjacking
            // savunması). form-action 'self' Clerk redirectlerini kapsar.
            // worker-src + child-src 'self' blob: Clerk web worker için.
            // frame-src Clerk captcha + Cloudflare Turnstile iframe için.
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://clerk.upcore.io https://challenges.cloudflare.com https://plausible.io; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://img.clerk.com https://*.upcore.io https://ui-avatars.com; font-src 'self' data:; connect-src 'self' https://*.clerk.accounts.dev https://clerk.upcore.io https://*.upcore.io https://plausible.io https://*.sentry.io wss://*.upcore.io; worker-src 'self' blob:; child-src 'self' blob:; frame-src 'self' https://*.clerk.accounts.dev https://challenges.cloudflare.com https://clerk.upcore.io https://accounts.upcore.io; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ];
  },
};

// Sentry + Bundle Analyzer wrap (apps/web ile aynı pattern).
const sentryWebpackPluginOptions = {
  org: process.env['SENTRY_ORG'] ?? 'upcore',
  project: process.env['SENTRY_PROJECT_ADMIN'] ?? 'upcore-admin',
  silent: !process.env['CI'],
  disableLogger: true,
  tunnelRoute: '/monitoring',
  hideSourceMaps: true,
  widenClientFileUpload: true,
};

export default withBundleAnalyzer(withSentryConfig(nextConfig, sentryWebpackPluginOptions));
