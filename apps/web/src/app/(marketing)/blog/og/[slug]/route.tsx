import { ImageResponse } from 'next/og';
import { getPost, loadAllPosts } from '@/lib/blog/content';
import { BLOG_CATEGORIES } from '@/lib/blog/categories';

export const runtime = 'nodejs';
export const dynamic = 'force-static';
export const revalidate = 86400;

export async function generateStaticParams() {
  const posts = await loadAllPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

// 1200x630 OG kartı — blog post metadata'sından otomatik üretilir.
// Harici font servisi çağrılmaz; Next.js default fontu (system-ui)
// tarayıcı ve paylaşım servisleri tarafından desteklenir.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) {
    return new Response('Not found', { status: 404 });
  }
  const category = BLOG_CATEGORIES[post.frontmatter.category];

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          background: 'linear-gradient(135deg, #0F1419 0%, #1F2937 100%)',
          color: 'white',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: -0.5,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                background: '#FF5400',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
              }}
            >
              U
            </div>
            UpCore
          </div>
          <div
            style={{
              display: 'flex',
              padding: '8px 16px',
              borderRadius: 999,
              background: 'rgba(255, 84, 0, 0.15)',
              color: '#FF7A2E',
              fontSize: 16,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            {category.name}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          <div
            style={{
              fontSize: 60,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: -1.5,
              maxWidth: 1000,
            }}
          >
            {post.frontmatter.title}
          </div>
          <div
            style={{
              fontSize: 24,
              color: '#D1D5DB',
              lineHeight: 1.3,
              maxWidth: 950,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {post.frontmatter.description}
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '2px solid rgba(255,255,255,0.08)',
            paddingTop: 24,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 999,
                background: '#FF5400',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              {post.author.name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>
                {post.author.name}
              </div>
              <div style={{ fontSize: 16, color: '#9CA3AF' }}>
                {post.author.title}
              </div>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              color: '#9CA3AF',
              fontSize: 18,
            }}
          >
            <span>{post.readingTimeMinutes} dk okuma</span>
            <span style={{ color: '#4B5563' }}>·</span>
            <span>upcore.app/blog</span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
