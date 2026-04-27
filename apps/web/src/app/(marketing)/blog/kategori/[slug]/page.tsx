import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ALL_CATEGORIES, getCategory } from '@/lib/blog/categories';
import { getPostsByCategory } from '@/lib/blog/content';
import { PostCard } from '@/components/blog/PostCard';
import { siteConfig } from '@/config/site';

export const revalidate = 3600;

export async function generateStaticParams() {
  return ALL_CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) return { title: 'Kategori bulunamadı · UpCore Blog' };
  const url = `${siteConfig.url}/blog/kategori/${category.slug}`;
  return {
    title: `${category.name} · UpCore Blog`,
    description: category.description,
    alternates: { canonical: url },
    openGraph: {
      title: `${category.name} · UpCore Blog`,
      description: category.description,
      url,
      type: 'website',
      locale: 'tr_TR',
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();
  const posts = await getPostsByCategory(category.slug);

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12">
      <Link
        href="/blog"
        className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-[#6B7280] hover:text-[#FF5400]"
      >
        <ArrowLeft className="h-3 w-3" /> Tüm makaleler
      </Link>
      <header className="mb-10 border-b border-[#E5E7EB] pb-6">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#FF5400]">
          Kategori
        </div>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#0F1419]">
          {category.name}
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#4B5563]">
          {category.description}
        </p>
        <div className="mt-4 text-xs text-[#6B7280]">{posts.length} makale</div>
      </header>
      {posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#D1D5DB] bg-[#F9FAFB] p-12 text-center text-sm text-[#6B7280]">
          Bu kategoride henüz yayınlanmış makale yok.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((p) => (
            <PostCard key={p.slug} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}
