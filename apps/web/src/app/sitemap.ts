import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';
import { getPostSummaries, getAllAuthors, getAllTags } from '@/lib/blog/content';
import { ALL_CATEGORIES } from '@/lib/blog/categories';

// Public / marketing sayfaları sitemap'e girer.
// Authenticated uygulama rotaları (panel, calisanlar, vb.) girmez.
// Blog route'ları dinamik olarak disk'teki MDX kayıtlarından üretilir.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url;
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    '/',
    '/hakkimizda',
    '/iletisim',
    '/fiyatlandirma',
    '/bilimsel-temel',
    '/demo',
    '/musteriler',
    '/entegrasyonlar',
    '/moduller/kazanim',
    '/moduller/surdurme',
    '/moduller/gelistirme',
    '/moduller/yerlestirme',
    '/moduller/koruma',
    '/cozumler/belediye',
    '/cozumler/holding',
    '/cozumler/ats',
    '/kvkk',
    '/kullanim-sartlari',
    '/giris',
    '/kayit',
    '/blog',
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: path === '/' ? 1.0 : path === '/blog' ? 0.8 : 0.7,
  }));

  // Blog post'ları — her biri için priority 0.7, lastmod updatedAt veya publishedAt.
  const posts = await getPostSummaries().catch(() => []);
  const postRoutes: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${base}/blog/${p.slug}`,
    lastModified: new Date(p.updatedAt ?? p.publishedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }));

  // Kategori sayfaları.
  const categoryRoutes: MetadataRoute.Sitemap = ALL_CATEGORIES.map((c) => ({
    url: `${base}/blog/kategori/${c.slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.5,
  }));

  // Yazar sayfaları.
  const authors = await getAllAuthors().catch(() => []);
  const authorRoutes: MetadataRoute.Sitemap = authors.map((a) => ({
    url: `${base}/blog/yazar/${a.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.4,
  }));

  // Etiket sayfaları.
  const tags = await getAllTags().catch(() => []);
  const tagRoutes: MetadataRoute.Sitemap = tags.map((t) => ({
    url: `${base}/blog/etiket/${t.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.3,
  }));

  return [
    ...staticRoutes,
    ...postRoutes,
    ...categoryRoutes,
    ...authorRoutes,
    ...tagRoutes,
  ];
}
