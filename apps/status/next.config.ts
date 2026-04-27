import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

// Public status page:
//  - Kendi subdomain'i (status.upcore.io) — ana platform down olsa bile çalışmalı.
//  - Cloudflare Pages / Azure Static Web Apps'e deploy edilir.
//  - Revalidate 30s ile yarı-statik; form POST'ları dışında sunucu çağrısı yok.
const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  // Launch readiness: bozuk tip/lint prod'a kaçamaz.
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
  transpilePackages: ['@upcore/design-system'],
  experimental: {
    optimizePackageImports: ['lucide-react', '@upcore/design-system'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'no-referrer-when-downgrade' },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            // Status sayfası en az ayrıcalıklı CSP — Clerk yok (anonim
            // erişim), sadece Plausible analytics + Sentry crash report
            // origin'leri. frame-ancestors 'none' ile clickjacking kapatıldı.
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' https://plausible.io; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' https://status.upcore.io https://api.upcore.io https://plausible.io https://*.sentry.io; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

// Status sayfası için Sentry — bundle analyzer yok (statik export hedefi).
const sentryWebpackPluginOptions = {
  org: process.env['SENTRY_ORG'] ?? 'upcore',
  project: process.env['SENTRY_PROJECT_STATUS'] ?? 'upcore-status',
  silent: !process.env['CI'],
  disableLogger: true,
  hideSourceMaps: true,
  widenClientFileUpload: true,
};

export default withSentryConfig(nextConfig, sentryWebpackPluginOptions);
