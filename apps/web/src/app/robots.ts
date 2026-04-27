import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

// Next.js App Router robots.txt route.
// Authenticated app segments (/panel, /calisanlar, /ayarlar, /anket token'lı,
// /degerlendirme token'lı) ve API crawled edilmez.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/hakkimizda',
          '/iletisim',
          '/fiyatlandirma',
          '/bilimsel-temel',
          '/blog',
          '/blog/',
        ],
        disallow: [
          '/api/',
          '/panel',
          '/panel/',
          '/calisanlar',
          '/departmanlar',
          '/izinler',
          '/belgeler',
          '/anketler',
          '/tukenmislik',
          '/aksiyonlar',
          '/ayarlar',
          '/ats',
          '/degerlendirmeler',
          '/anket/',
          '/degerlendirme/',
          '/onboarding',
          '/organizasyon',
          '/giris',
          '/kayit',
          '/sso-callback',
        ],
      },
      {
        userAgent: 'GPTBot',
        allow: ['/bilimsel-temel', '/hakkimizda', '/blog'],
        disallow: '/',
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
