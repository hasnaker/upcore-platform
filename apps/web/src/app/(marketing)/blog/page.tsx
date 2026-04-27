import type { Metadata } from 'next';
import Link from 'next/link';
import { Rss } from 'lucide-react';
import {
  getAllTags,
  getPostSummaries,
} from '@/lib/blog/content';
import { ALL_CATEGORIES } from '@/lib/blog/categories';
import { BlogSearch } from '@/components/blog/BlogSearch';
import { PostCard } from '@/components/blog/PostCard';
import { siteConfig } from '@/config/site';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Blog · UpCore — Bilim Temelli İK İçerikleri',
  description:
    "UpCore pazarlama blogu: JD-R, BAT-TR, tükenmişlik ve bağlılık üzerine Türkçe bilimsel makaleler, vaka çalışmaları ve uzman görüşleri.",
  alternates: {
    canonical: `${siteConfig.url}/blog`,
    types: {
      'application/rss+xml': `${siteConfig.url}/blog/rss.xml`,
      'application/atom+xml': `${siteConfig.url}/blog/atom.xml`,
    },
  },
  openGraph: {
    title: 'UpCore Blog · Bilim Temelli İK',
    description:
      'JD-R, BAT-TR, tükenmişlik ve bağlılık üzerine peer-reviewed temelli makaleler.',
    url: `${siteConfig.url}/blog`,
    siteName: siteConfig.name,
    type: 'website',
    locale: 'tr_TR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UpCore Blog',
    description: 'Bilim temelli Türkçe İK içerikleri.',
  },
};

export default async function BlogIndexPage() {
  const posts = await getPostSummaries();
  const featured = posts[0];
  const rest = posts.slice(1);
  const tags = await getAllTags();

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    '@id': `${siteConfig.url}/blog#blog`,
    url: `${siteConfig.url}/blog`,
    name: 'UpCore Blog',
    description:
      "Türkiye'nin ilk bilim-temelli İK SaaS platformu UpCore'un düşünce liderliği içerikleri.",
    inLanguage: 'tr-TR',
    publisher: {
      '@type': 'Organization',
      name: siteConfig.name,
      url: siteConfig.url,
      logo: {
        '@type': 'ImageObject',
        url: `${siteConfig.url}/upcore-logo.svg`,
      },
    },
    blogPost: posts.map((p) => ({
      '@type': 'BlogPosting',
      '@id': `${siteConfig.url}/blog/${p.slug}`,
      headline: p.title,
      url: `${siteConfig.url}/blog/${p.slug}`,
      datePublished: p.publishedAt,
      dateModified: p.updatedAt ?? p.publishedAt,
      author: { '@type': 'Person', name: p.author.name },
    })),
  };

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />

      <header className="mb-10 flex flex-col gap-4 border-b border-[#E5E7EB] pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[#FF5400]">
            UpCore Blog
          </div>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#0F1419] md:text-5xl">
            Bilim temelli İK içerikleri
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#4B5563]">
            JD-R modeli, BAT-TR tükenmişlik ölçeği, 9-kutu kalibrasyonu ve Türkiye
            mevzuatı üzerine peer-reviewed temelli makaleler. Her yazı DOI veya
            resmi kaynaklıdır; jargon minimuma indirilmiştir.
          </p>
        </div>
        <Link
          href="/blog/rss.xml"
          className="inline-flex h-10 items-center gap-2 self-start rounded-md border border-[#E5E7EB] bg-white px-4 text-sm font-medium text-[#374151] hover:border-[#FF5400] hover:text-[#FF5400]"
        >
          <Rss className="h-4 w-4" /> RSS Aboneliği
        </Link>
      </header>

      {featured ? (
        <section className="mb-10" aria-labelledby="featured-post">
          <h2 id="featured-post" className="sr-only">
            Öne çıkan makale
          </h2>
          <div className="grid gap-6 md:grid-cols-1">
            <PostCard post={featured} variant="featured" />
          </div>
        </section>
      ) : null}

      <BlogSearch posts={rest} />

      <section className="mt-16 border-t border-[#E5E7EB] pt-10" aria-labelledby="categories-heading">
        <h2 id="categories-heading" className="text-lg font-bold text-[#0F1419]">
          Kategoriye göre gözat
        </h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {ALL_CATEGORIES.map((cat) => (
            <li key={cat.slug}>
              <Link
                href={`/blog/kategori/${cat.slug}`}
                className="block rounded-md border border-[#E5E7EB] bg-white p-4 transition-colors hover:border-[#FF5400]"
              >
                <div className="text-sm font-semibold text-[#0F1419]">{cat.name}</div>
                <div className="mt-1 text-xs text-[#6B7280]">{cat.description}</div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {tags.length > 0 ? (
        <section className="mt-12" aria-labelledby="tags-heading">
          <h2 id="tags-heading" className="text-lg font-bold text-[#0F1419]">
            Etiketler
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {tags.map((t) => (
              <li key={t.slug}>
                <Link
                  href={`/blog/etiket/${t.slug}`}
                  className="inline-flex h-8 items-center rounded-full border border-[#E5E7EB] bg-white px-3 text-xs font-medium text-[#374151] hover:border-[#FF5400] hover:text-[#FF5400]"
                >
                  #{t.tag} <span className="ml-1.5 text-[#9CA3AF]">{t.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
