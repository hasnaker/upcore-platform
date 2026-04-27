import Link from 'next/link';
import { Clock, ArrowRight } from 'lucide-react';
import type { BlogPostSummary } from '@/lib/blog/types';
import { formatBlogDate } from '@/lib/blog/format';

interface PostCardProps {
  post: BlogPostSummary;
  variant?: 'default' | 'featured';
}

export function PostCard({ post, variant = 'default' }: PostCardProps) {
  const isFeatured = variant === 'featured';
  return (
    <article
      className={`group flex h-full flex-col overflow-hidden rounded-lg border border-[#E5E7EB] bg-white transition-shadow hover:shadow-lg ${
        isFeatured ? 'md:col-span-2 md:flex-row' : ''
      }`}
    >
      <Link
        href={`/blog/${post.slug}`}
        className={`block shrink-0 bg-gradient-to-br from-[#FFF7F2] to-[#FFE5D4] ${
          isFeatured ? 'md:w-1/2' : 'aspect-[16/9]'
        }`}
        aria-label={post.title}
      >
        <div
          className={`flex ${
            isFeatured ? 'h-full min-h-[260px]' : 'h-full'
          } items-center justify-center p-6`}
        >
          <div className="text-center">
            <div className="mb-2 inline-flex rounded-full bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#FF5400]">
              {post.category.name}
            </div>
            <div className="mx-auto max-w-[300px] text-xs font-medium leading-snug text-[#0F1419]/70">
              {post.heroAlt ?? post.title}
            </div>
          </div>
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-2 flex items-center gap-3 text-[11px] text-[#6B7280]">
          <Link
            href={`/blog/kategori/${post.category.slug}`}
            className="font-semibold uppercase tracking-wider text-[#FF5400] hover:underline"
          >
            {post.category.name}
          </Link>
          <span aria-hidden="true">·</span>
          <time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt)}</time>
        </div>
        <h3
          className={`font-bold tracking-tight text-[#0F1419] group-hover:text-[#FF5400] ${
            isFeatured ? 'text-2xl leading-tight' : 'text-lg leading-snug'
          }`}
        >
          <Link href={`/blog/${post.slug}`}>{post.title}</Link>
        </h3>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-[#4B5563]">
          {post.description}
        </p>
        <div className="mt-4 flex items-center justify-between border-t border-[#F3F4F6] pt-3 text-xs">
          <Link
            href={`/blog/yazar/${post.author.slug}`}
            className="flex items-center gap-2 text-[#4B5563] hover:text-[#0F1419]"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FF5400] text-[10px] font-bold text-white">
              {post.author.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </span>
            <span className="font-medium">{post.author.name}</span>
          </Link>
          <span className="inline-flex items-center gap-1 text-[#9CA3AF]">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {post.readingTimeMinutes} dk
          </span>
        </div>
        <Link
          href={`/blog/${post.slug}`}
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#FF5400] opacity-0 transition-opacity group-hover:opacity-100"
        >
          Makaleye git <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </article>
  );
}
