import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { BlogPostSummary } from '@/lib/blog/types';
import { formatBlogDate } from '@/lib/blog/format';

interface RelatedPostsProps {
  posts: BlogPostSummary[];
}

export function RelatedPosts({ posts }: RelatedPostsProps) {
  if (!posts || posts.length === 0) return null;
  return (
    <section className="my-10 rounded-lg bg-[#F9FAFB] p-6" aria-labelledby="related-posts-heading">
      <h2
        id="related-posts-heading"
        className="mb-4 text-lg font-bold tracking-tight text-[#0F1419]"
      >
        İlgili Makaleler
      </h2>
      <ul className="grid gap-4 md:grid-cols-3">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              className="group block h-full rounded-md border border-[#E5E7EB] bg-white p-4 transition-shadow hover:shadow-md"
            >
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#FF5400]">
                {post.category.name}
              </div>
              <h3 className="mt-2 text-sm font-semibold leading-snug text-[#0F1419] group-hover:text-[#FF5400]">
                {post.title}
              </h3>
              <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-[#6B7280]">
                {post.description}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-[#9CA3AF]">
                <time dateTime={post.publishedAt}>
                  {formatBlogDate(post.publishedAt)}
                </time>
                <span className="inline-flex items-center gap-1 text-[#FF5400]">
                  Oku <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
