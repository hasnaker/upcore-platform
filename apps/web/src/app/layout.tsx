import type { Metadata, Viewport } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { siteConfig } from '@/config/site';
import { Providers } from './providers';
import { ServiceWorkerRegistration } from '@/components/pwa/ServiceWorkerRegistration';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-sans',
  display: 'swap',
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-display',
  display: 'swap',
  weight: ['500', '600', '700', '800'],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s · ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  applicationName: siteConfig.name,
  category: 'business',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'UpCore',
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: siteConfig.locale,
    url: siteConfig.url,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    siteName: siteConfig.name,
    images: [{ url: siteConfig.ogImage, width: 1200, height: 630, alt: siteConfig.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    images: [siteConfig.ogImage],
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: siteConfig.url,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

// JSON-LD: Organization + WebSite + SoftwareApplication — Google Rich Results
// + AI Overviews (ChatGPT, Perplexity, Claude) citation için.
const structuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${siteConfig.url}#organization`,
      name: siteConfig.name,
      url: siteConfig.url,
      logo: `${siteConfig.url}/og-image.png`,
      foundingDate: '2025',
      description: siteConfig.description,
      sameAs: [
        'https://linkedin.com/company/upcore-hr',
        'https://twitter.com/upcore_app',
      ],
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'TR',
        addressRegion: 'İstanbul',
      },
      contactPoint: [
        {
          '@type': 'ContactPoint',
          contactType: 'sales',
          email: 'satis@upcore.app',
          areaServed: 'TR',
          availableLanguage: ['Turkish', 'English'],
        },
        {
          '@type': 'ContactPoint',
          contactType: 'KVKK / Data Protection',
          email: 'kvkk@upcore.app',
          areaServed: 'TR',
        },
      ],
    },
    {
      '@type': 'WebSite',
      '@id': `${siteConfig.url}#website`,
      url: siteConfig.url,
      name: siteConfig.name,
      description: siteConfig.tagline,
      inLanguage: 'tr-TR',
      publisher: { '@id': `${siteConfig.url}#organization` },
    },
    {
      '@type': 'SoftwareApplication',
      '@id': `${siteConfig.url}#software`,
      name: 'UpCore — İK SaaS Platformu',
      applicationCategory: 'BusinessApplication',
      applicationSubCategory: 'HumanResources',
      operatingSystem: 'Web',
      offers: {
        '@type': 'AggregateOffer',
        priceCurrency: 'TRY',
        lowPrice: '3000',
        highPrice: '200000',
        offerCount: '3',
      },
      featureList: [
        'BAT-12-TR Tükenmişlik Pulse Anketi',
        'JD-R Modeli Dashboard',
        'ATS + Psikometrik Değerlendirme',
        'Evidence-Based Müdahale Kataloğu',
        'İç Mobilite + Succession Planlama',
      ],
      softwareVersion: '1.0',
      inLanguage: 'tr-TR',
      author: { '@id': `${siteConfig.url}#organization` },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className={`${inter.variable} ${jakarta.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-bg font-sans text-ink antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <Providers>{children}</Providers>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
