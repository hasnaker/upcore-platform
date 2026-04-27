import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'UpCore Admin',
    template: '%s · UpCore Admin',
  },
  description: 'UpCore iç yönetim paneli — tenant, billing, feature flag, monitoring.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#0a0a0a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-bg-2 font-sans text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
