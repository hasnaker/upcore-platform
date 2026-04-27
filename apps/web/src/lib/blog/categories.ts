import type { BlogCategory, BlogCategorySlug } from './types';

// Kategori taksonomisi sabit — skill spec'i 5 grup tanımlıyor.
export const BLOG_CATEGORIES: Record<BlogCategorySlug, BlogCategory> = {
  egitim: {
    slug: 'egitim',
    name: 'Eğitim',
    description:
      'JD-R modeli, BAT-TR, psikometrik ölçek ve İK bilimine giriş seviyesi içerikler.',
  },
  sektorel: {
    slug: 'sektorel',
    name: 'Sektörel Analiz',
    description:
      'Belediye, holding, start-up/scale-up gibi segment-özelinde İK teknolojisi değerlendirmeleri.',
  },
  vaka: {
    slug: 'vaka',
    name: 'Vaka Çalışması',
    description:
      'Gerçek kurumlarda uygulanmış UpCore pilotları, etki ölçümleri ve ders çıkarımları.',
  },
  'uzman-gorusu': {
    slug: 'uzman-gorusu',
    name: 'Uzman Görüşü',
    description:
      'Akademisyen ve hukuk uzmanlarıyla röportajlar; yasal ve bilimsel gündemin analizi.',
  },
  urun: {
    slug: 'urun',
    name: 'Ürün',
    description:
      'UpCore ürün yol haritası, mühendislik kararları ve açık bilim yaklaşımımız.',
  },
};

export const ALL_CATEGORIES: BlogCategory[] = Object.values(BLOG_CATEGORIES);

export function getCategory(slug: string): BlogCategory | undefined {
  return BLOG_CATEGORIES[slug as BlogCategorySlug];
}
