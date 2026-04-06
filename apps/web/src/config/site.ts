export const siteConfig = {
  name: 'Upcore',
  tagline: "Türkiye'nin ilk bilim-temelli İK platformu",
  description:
    "JD-R, Job Crafting, BAT-TR bazlı — peer-reviewed scientific foundation ile çalışan deneyimi, tükenmişlik yönetimi ve performans.",
  url: process.env['NEXT_PUBLIC_APP_URL'] ?? 'https://upcore.app',
  ogImage: '/og-image.png',
  locale: 'tr-TR',
  keywords: [
    'İK SaaS',
    'çalışan deneyimi',
    'tükenmişlik',
    'JD-R modeli',
    'job crafting',
    'BAT-TR',
    'Türkiye İK yazılımı',
  ],
  links: {
    hakkimizda: '/hakkimizda',
    fiyatlandirma: '/fiyatlandirma',
    bilimselTemel: '/bilimsel-temel',
    iletisim: '/iletisim',
  },
} as const;

export type SiteConfig = typeof siteConfig;
