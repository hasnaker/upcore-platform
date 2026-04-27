import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Clock, Calendar, Tag as TagIcon } from 'lucide-react';
import { getPost, getRelatedPosts, loadAllPosts } from '@/lib/blog/content';
import { renderMdx } from '@/lib/blog/mdx';
import { formatBlogDate } from '@/lib/blog/format';
import { tagSlug } from '@/lib/blog/content';
import { TableOfContents } from '@/components/blog/TableOfContents';
import { ShareButtons } from '@/components/blog/ShareButtons';
import { RelatedPosts } from '@/components/blog/RelatedPosts';
import { siteConfig } from '@/config/site';

export const revalidate = 3600;

export async function generateStaticParams() {
  const posts = await loadAllPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) {
    return { title: 'Makale bulunamadı · UpCore Blog' };
  }
  const url = `${siteConfig.url}/blog/${post.slug}`;
  const ogImage = `${siteConfig.url}/blog/og/${post.slug}`;
  return {
    title: `${post.frontmatter.title} · UpCore Blog`,
    description: post.frontmatter.description,
    keywords: post.frontmatter.tags,
    authors: [{ name: post.author.name }],
    alternates: { canonical: url },
    openGraph: {
      title: post.frontmatter.title,
      description: post.frontmatter.description,
      url,
      siteName: siteConfig.name,
      type: 'article',
      locale: 'tr_TR',
      publishedTime: post.frontmatter.publishedAt,
      modifiedTime: post.frontmatter.updatedAt,
      authors: [post.author.name],
      tags: post.frontmatter.tags,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: post.frontmatter.heroAlt ?? post.frontmatter.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.frontmatter.title,
      description: post.frontmatter.description,
      images: [ogImage],
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const related = await getRelatedPosts(post.slug, 3);
  const url = `${siteConfig.url}/blog/${post.slug}`;
  const ogImage = `${siteConfig.url}/blog/og/${post.slug}`;

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': `${url}#article`,
    headline: post.frontmatter.title,
    description: post.frontmatter.description,
    url,
    datePublished: post.frontmatter.publishedAt,
    dateModified: post.frontmatter.updatedAt ?? post.frontmatter.publishedAt,
    inLanguage: 'tr-TR',
    wordCount: post.wordCount,
    articleSection: post.category.name,
    keywords: post.frontmatter.tags.join(', '),
    image: {
      '@type': 'ImageObject',
      url: ogImage,
      width: 1200,
      height: 630,
    },
    author: {
      '@type': 'Person',
      '@id': `${siteConfig.url}/blog/yazar/${post.author.slug}#person`,
      name: post.author.name,
      jobTitle: post.author.title,
      description: post.author.bio,
      url: `${siteConfig.url}/blog/yazar/${post.author.slug}`,
      ...(post.author.linkedin ? { sameAs: [post.author.linkedin, post.author.twitter, post.author.website].filter(Boolean) } : {}),
    },
    publisher: {
      '@type': 'Organization',
      '@id': `${siteConfig.url}#organization`,
      name: siteConfig.name,
      url: siteConfig.url,
      logo: {
        '@type': 'ImageObject',
        url: `${siteConfig.url}/upcore-logo.svg`,
      },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Anasayfa',
        item: siteConfig.url,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Blog',
        item: `${siteConfig.url}/blog`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.category.name,
        item: `${siteConfig.url}/blog/kategori/${post.category.slug}`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: post.frontmatter.title,
        item: url,
      },
    ],
  };

  const content = renderMdx(post.content, {
    post,
    related,
    shareUrl: url,
  });

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-10">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <nav aria-label="Sayfa yolu" className="mb-6 text-xs text-[#6B7280]">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link href="/" className="hover:text-[#0F1419]">
              UpCore
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href="/blog" className="hover:text-[#0F1419]">
              Blog
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href={`/blog/kategori/${post.category.slug}`}
              className="hover:text-[#0F1419]"
            >
              {post.category.name}
            </Link>
          </li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[1fr_280px]">
        <article>
          <header className="mb-8 border-b border-[#E5E7EB] pb-6">
            <Link
              href="/blog"
              className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-[#6B7280] hover:text-[#FF5400]"
            >
              <ArrowLeft className="h-3 w-3" /> Tüm makaleler
            </Link>
            <Link
              href={`/blog/kategori/${post.category.slug}`}
              className="text-xs font-semibold uppercase tracking-wider text-[#FF5400] hover:underline"
            >
              {post.category.name}
            </Link>
            <h1 className="mt-3 text-4xl font-bold leading-tight tracking-tight text-[#0F1419] md:text-5xl">
              {post.frontmatter.title}
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-[#4B5563]">
              {post.frontmatter.description}
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-6 text-xs text-[#6B7280]">
              <Link
                href={`/blog/yazar/${post.author.slug}`}
                className="flex items-center gap-2 hover:text-[#0F1419]"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#FF5400] text-[11px] font-bold text-white">
                  {post.author.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)}
                </span>
                <span>
                  <span className="block font-semibold text-[#0F1419]">
                    {post.author.name}
                  </span>
                  <span>{post.author.title}</span>
                </span>
              </Link>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" aria-hidden="true" />
                <time dateTime={post.frontmatter.publishedAt}>
                  {formatBlogDate(post.frontmatter.publishedAt)}
                </time>
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {post.readingTimeMinutes} dakika okuma · {post.wordCount} kelime
              </span>
            </div>
          </header>

          <div className="blog-prose" data-testid="blog-post-content">
            {content}
          </div>

          <ShareButtons title={post.frontmatter.title} url={url} />

          {post.frontmatter.tags.length > 0 ? (
            <div className="my-8 flex flex-wrap items-center gap-2">
              <TagIcon className="h-4 w-4 text-[#6B7280]" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
                Etiketler
              </span>
              {post.frontmatter.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/blog/etiket/${tagSlug(tag)}`}
                  className="inline-flex h-7 items-center rounded-full border border-[#E5E7EB] bg-white px-3 text-xs font-medium text-[#374151] hover:border-[#FF5400] hover:text-[#FF5400]"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          ) : null}

          <RelatedPosts posts={related} />

          <div className="mt-12 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] p-6">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FF5400] text-sm font-bold text-white">
                {post.author.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)}
              </span>
              <div>
                <div className="text-sm font-semibold text-[#0F1419]">
                  {post.author.name}
                </div>
                <div className="text-xs text-[#6B7280]">{post.author.title}</div>
                <p className="mt-2 text-sm leading-relaxed text-[#374151]">
                  {post.author.bio}
                </p>
                <Link
                  href={`/blog/yazar/${post.author.slug}`}
                  className="mt-3 inline-flex text-xs font-semibold text-[#FF5400] hover:underline"
                >
                  Yazarın tüm makaleleri →
                </Link>
              </div>
            </div>
          </div>
        </article>

        <aside className="hidden lg:block">
          <TableOfContents headings={post.headings} />
        </aside>
      </div>
    </div>
  );
}
