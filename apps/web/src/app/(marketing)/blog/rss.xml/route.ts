import { getPostSummaries } from '@/lib/blog/content';
import { siteConfig } from '@/config/site';

export const revalidate = 3600;

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export async function GET() {
  const posts = await getPostSummaries();
  const base = siteConfig.url;
  const latest = posts[0]?.publishedAt ?? new Date().toISOString();

  const items = posts
    .map((p) => {
      const link = `${base}/blog/${p.slug}`;
      return `    <item>
      <title>${escapeXml(p.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description>${escapeXml(p.description)}</description>
      <category>${escapeXml(p.category.name)}</category>
      <author>${escapeXml(p.author.email ?? 'editor@upcore.app')} (${escapeXml(p.author.name)})</author>
      <pubDate>${new Date(p.publishedAt).toUTCString()}</pubDate>
    </item>`;
    })
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>UpCore Blog</title>
    <link>${base}/blog</link>
    <atom:link href="${base}/blog/rss.xml" rel="self" type="application/rss+xml" />
    <description>Bilim temelli Türkçe İK içerikleri — JD-R, BAT-TR, tükenmişlik, bağlılık.</description>
    <language>tr-TR</language>
    <lastBuildDate>${new Date(latest).toUTCString()}</lastBuildDate>
    <generator>UpCore Next.js 15</generator>
${items}
  </channel>
</rss>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
