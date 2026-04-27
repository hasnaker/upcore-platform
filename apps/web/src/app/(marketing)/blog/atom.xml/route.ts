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
  const updated = posts[0]?.publishedAt ?? new Date().toISOString();

  const entries = posts
    .map((p) => {
      const link = `${base}/blog/${p.slug}`;
      return `  <entry>
    <title>${escapeXml(p.title)}</title>
    <id>${link}</id>
    <link href="${link}" rel="alternate" type="text/html"/>
    <published>${new Date(p.publishedAt).toISOString()}</published>
    <updated>${new Date(p.updatedAt ?? p.publishedAt).toISOString()}</updated>
    <summary>${escapeXml(p.description)}</summary>
    <category term="${escapeXml(p.category.slug)}" label="${escapeXml(p.category.name)}"/>
    <author>
      <name>${escapeXml(p.author.name)}</name>
    </author>
  </entry>`;
    })
    .join('\n');

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="tr-TR">
  <title>UpCore Blog</title>
  <link rel="self" href="${base}/blog/atom.xml"/>
  <link rel="alternate" type="text/html" href="${base}/blog"/>
  <updated>${new Date(updated).toISOString()}</updated>
  <id>${base}/blog</id>
  <subtitle>Bilim temelli Türkçe İK içerikleri.</subtitle>
  <author>
    <name>UpCore</name>
    <uri>${base}</uri>
  </author>
${entries}
</feed>`;

  return new Response(body, {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
