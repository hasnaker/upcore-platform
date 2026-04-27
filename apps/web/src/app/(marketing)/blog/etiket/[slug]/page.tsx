import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getAllTags, getPostsByTag } from '@/lib/blog/content';
import { PostCard } from '@/components/blog/PostCard';
import { siteConfig } from '@/config/site';

export const revalidate = 3600;

export async function generateStaticParams() {
  const tags = await getAllTags();
  return tags.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tags = await getAllTags();
  const tag = tags.find((t) => t.slug === slug);
  if (!tag) return { title: 'Etiket bulunamadı · UpCore Blog' };
  const url = `${siteConfig.url}/blog/etiket/${tag.slug}`;
  return {
    title: `#${tag.tag} · UpCore Blog`,
    description: `UpCore blogunda "${tag.tag}" etiketli tüm makaleler (${tag.count} yazı).`,
    alternates: { canonical: url },
    openGraph: {
      title: `#${tag.tag} · UpCore Blog`,
      description: `UpCore blog etiketi: ${tag.tag}`,
      url,
      type: 'website',
      locale: 'tr_TR',
    },
  };
}

export default async function TagPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tags = await getAllTags();
  const tag = tags.find((t) => t.slug === slug);
  if (!tag) notFound();
  const posts = await getPostsByTag(slug);

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
          Etiket
        </div>
        <h1 className="mt-2 text-4xl font-bold tracking-tight text-[#0F1419]">
          #{tag.tag}
        </h1>
        <p className="mt-3 text-sm text-[#4B5563]">
          Bu etiketle ilgili {tag.count} makale.
        </p>
      </header>

      {posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#D1D5DB] bg-[#F9FAFB] p-12 text-center text-sm text-[#6B7280]">
          Bu etiketle eşleşen makale bulunamadı.
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
