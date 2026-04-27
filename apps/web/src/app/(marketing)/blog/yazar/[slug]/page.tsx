import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Linkedin, Mail, Twitter, Globe } from 'lucide-react';
import {
  getAllAuthors,
  getAuthor,
  getPostsByAuthor,
} from '@/lib/blog/content';
import { PostCard } from '@/components/blog/PostCard';
import { siteConfig } from '@/config/site';

export const revalidate = 3600;

export async function generateStaticParams() {
  const authors = await getAllAuthors();
  return authors.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const author = await getAuthor(slug);
  if (!author) return { title: 'Yazar bulunamadı · UpCore Blog' };
  const url = `${siteConfig.url}/blog/yazar/${author.slug}`;
  return {
    title: `${author.name} · UpCore Blog Yazarı`,
    description: `${author.title}. ${author.bio}`.slice(0, 200),
    alternates: { canonical: url },
    openGraph: {
      title: `${author.name} · UpCore Blog`,
      description: author.bio,
      url,
      type: 'profile',
      locale: 'tr_TR',
    },
  };
}

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const author = await getAuthor(slug);
  if (!author) notFound();
  const posts = await getPostsByAuthor(author.slug);
  const url = `${siteConfig.url}/blog/yazar/${author.slug}`;

  const personSchema = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${url}#person`,
    name: author.name,
    jobTitle: author.title,
    description: author.bio,
    url,
    sameAs: [author.linkedin, author.twitter, author.website].filter(Boolean),
    ...(author.email ? { email: author.email } : {}),
    ...(author.orcid
      ? {
          identifier: {
            '@type': 'PropertyValue',
            propertyID: 'ORCID',
            value: author.orcid,
          },
        }
      : {}),
  };

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-12">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
      />
      <Link
        href="/blog"
        className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-[#6B7280] hover:text-[#FF5400]"
      >
        <ArrowLeft className="h-3 w-3" /> Tüm makaleler
      </Link>
      <header className="mb-10 flex flex-col gap-6 border-b border-[#E5E7EB] pb-8 md:flex-row md:items-start">
        <span className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FF5400] to-[#FF7A2E] text-2xl font-bold text-white">
          {author.name
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)}
        </span>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[#FF5400]">
            {author.isGuest ? 'Misafir Yazar' : 'Yazar'}
          </div>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#0F1419] md:text-4xl">
            {author.name}
          </h1>
          <div className="mt-1 text-sm font-medium text-[#6B7280]">
            {author.title}
          </div>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-[#374151]">
            {author.bio}
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            {author.linkedin ? (
              <a
                href={author.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-3 font-medium text-[#374151] hover:border-[#FF5400] hover:text-[#FF5400]"
              >
                <Linkedin className="h-3.5 w-3.5" /> LinkedIn
              </a>
            ) : null}
            {author.twitter ? (
              <a
                href={author.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-3 font-medium text-[#374151] hover:border-[#FF5400] hover:text-[#FF5400]"
              >
                <Twitter className="h-3.5 w-3.5" /> Twitter
              </a>
            ) : null}
            {author.website ? (
              <a
                href={author.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-3 font-medium text-[#374151] hover:border-[#FF5400] hover:text-[#FF5400]"
              >
                <Globe className="h-3.5 w-3.5" /> Web sitesi
              </a>
            ) : null}
            {author.email ? (
              <a
                href={`mailto:${author.email}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-md border border-[#E5E7EB] bg-white px-3 font-medium text-[#374151] hover:border-[#FF5400] hover:text-[#FF5400]"
              >
                <Mail className="h-3.5 w-3.5" /> E-posta
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mb-6 text-xs text-[#6B7280]">
        {posts.length} makale yayınlandı
      </div>

      {posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#D1D5DB] bg-[#F9FAFB] p-12 text-center text-sm text-[#6B7280]">
          Bu yazarın henüz yayınlanmış makalesi yok.
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
