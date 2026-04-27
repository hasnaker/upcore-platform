import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'UpCore Status',
    template: '%s · UpCore Status',
  },
  description:
    'UpCore platform durumu — gerçek zamanlı uptime, incident timeline, planlı bakım ve SLA metrikleri.',
  openGraph: {
    title: 'UpCore Status',
    description: 'UpCore platform durumu, incident timeline ve SLA metrikleri.',
    url: 'https://status.upcore.io',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-bg font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
