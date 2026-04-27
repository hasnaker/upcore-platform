// UpCore blog için MDX-lite renderer.
// next-mdx-remote veya @mdx-js/react bağımlılığı OLMADAN çalışır.
// Desteklenen Markdown:
//   - ATX başlıklar (# … ######) → otomatik id + anchor
//   - Paragraf, zorla satır sonu (iki boşluk)
//   - Sıralı/sırasız liste (iç içe destekli)
//   - Blok alıntı
//   - Fenced code (```)
//   - Inline: **bold**, *italic*, `code`, [link](url), ![alt](src)
//   - Yatay çizgi (---) *ilk satır dışında*
// Desteklenen özel MDX bileşenleri (XML benzeri, çocuk içeriği yok):
//   <Callout variant="info|warning|quote">metin…</Callout>
//   <Citation author="..." year="..." doi="..." title="..." />
//   <DataChart id="..." />
//   <TableOfContents />
//   <ShareButtons />
//   <RelatedPosts />
//   <NewsletterCTA />
//
// Güvenlik: HTML doğrudan DOM'a yazılmaz, her düğüm React elementi olarak
// üretilir (dangerouslySetInnerHTML YOK).

import { Fragment, type ReactNode } from 'react';
import { Callout } from '@/components/blog/Callout';
import { Citation } from '@/components/blog/Citation';
import { DataChart } from '@/components/blog/DataChart';
import { ShareButtons } from '@/components/blog/ShareButtons';
import { RelatedPosts } from '@/components/blog/RelatedPosts';
import { NewsletterCTA } from '@/components/blog/NewsletterCTA';
import { TableOfContents } from '@/components/blog/TableOfContents';
import { slugify } from './slugify';
import type { BlogPost, BlogPostSummary } from './types';

export interface RenderContext {
  post: BlogPost;
  related: BlogPostSummary[];
  shareUrl: string;
}

export interface Heading {
  id: string;
  level: number;
  text: string;
}

// -------- Başlık çıkartma (TOC ve SEO için) --------
export function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  const lines = markdown.split(/\r?\n/);
  let inFence = false;
  const usedIds = new Set<string>();
  for (const line of lines) {
    if (/^```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!m) continue;
    const level = m[1]!.length;
    const text = m[2]!.trim();
    let id = slugify(text);
    let n = 2;
    while (usedIds.has(id)) {
      id = `${slugify(text)}-${n}`;
      n += 1;
    }
    usedIds.add(id);
    headings.push({ id, level, text });
  }
  return headings;
}

// -------- Render ana fonksiyonu --------
export function renderMdx(markdown: string, ctx: RenderContext): ReactNode {
  const blocks = splitBlocks(markdown);
  return (
    <>
      {blocks.map((block, idx) => (
        <Fragment key={idx}>{renderBlock(block, ctx, idx)}</Fragment>
      ))}
    </>
  );
}

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'quote'; text: string }
  | { kind: 'code'; lang: string; content: string }
  | { kind: 'hr' }
  | { kind: 'table'; headers: string[]; rows: string[][] }
  | { kind: 'component'; name: string; attrs: Record<string, string>; inner: string };

function splitBlocks(src: string): Block[] {
  const lines = src.split(/\r?\n/);
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';
    const trimmed = line.trim();
    if (!trimmed) {
      i += 1;
      continue;
    }
    // Fenced code
    if (/^```/.test(trimmed)) {
      const lang = trimmed.replace(/^```/, '').trim();
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !/^```/.test((lines[i] ?? '').trim())) {
        buf.push(lines[i] ?? '');
        i += 1;
      }
      i += 1; // closing fence
      blocks.push({ kind: 'code', lang, content: buf.join('\n') });
      continue;
    }
    // Heading
    const h = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (h) {
      blocks.push({ kind: 'heading', level: h[1]!.length, text: h[2]!.trim() });
      i += 1;
      continue;
    }
    // HR
    if (/^-{3,}\s*$/.test(trimmed)) {
      blocks.push({ kind: 'hr' });
      i += 1;
      continue;
    }
    // Quote
    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i] ?? '')) {
        buf.push((lines[i] ?? '').replace(/^>\s?/, ''));
        i += 1;
      }
      blocks.push({ kind: 'quote', text: buf.join('\n').trim() });
      continue;
    }
    // Markdown table
    if (trimmed.startsWith('|') && i + 1 < lines.length && /^\|[\s:|-]+\|\s*$/.test((lines[i + 1] ?? '').trim())) {
      const headers = splitRow(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && (lines[i] ?? '').trim().startsWith('|')) {
        rows.push(splitRow((lines[i] ?? '').trim()));
        i += 1;
      }
      blocks.push({ kind: 'table', headers, rows });
      continue;
    }
    // Ordered list
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test((lines[i] ?? '').trim())) {
        const itemLine = (lines[i] ?? '').replace(/^\s*\d+\.\s+/, '');
        const buf = [itemLine];
        i += 1;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i] ?? '')) {
          buf.push((lines[i] ?? '').trim());
          i += 1;
        }
        items.push(buf.join(' '));
      }
      blocks.push({ kind: 'ol', items });
      continue;
    }
    // Unordered list
    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test((lines[i] ?? '').trim())) {
        const itemLine = (lines[i] ?? '').replace(/^\s*[-*]\s+/, '');
        const buf = [itemLine];
        i += 1;
        while (i < lines.length && /^\s{2,}\S/.test(lines[i] ?? '')) {
          buf.push((lines[i] ?? '').trim());
          i += 1;
        }
        items.push(buf.join(' '));
      }
      blocks.push({ kind: 'ul', items });
      continue;
    }
    // MDX component — tek-satır self-closing (`<Foo ... />`) veya
    // çok-satırlı (`<Foo ...>...</Foo>`).
    const selfClose = /^<([A-Z][A-Za-z0-9]*)\s*([^/>]*)\/>\s*$/.exec(trimmed);
    if (selfClose) {
      const name = selfClose[1]!;
      const attrs = parseAttrs(selfClose[2] ?? '');
      blocks.push({ kind: 'component', name, attrs, inner: '' });
      i += 1;
      continue;
    }
    const openOnly = /^<([A-Z][A-Za-z0-9]*)\s*([^>]*)>\s*$/.exec(trimmed);
    if (openOnly && !trimmed.endsWith('/>')) {
      const name = openOnly[1]!;
      const attrs = parseAttrs(openOnly[2] ?? '');
      const closeRe = new RegExp(`^</${name}>\\s*$`);
      const buf: string[] = [];
      i += 1;
      while (i < lines.length && !closeRe.test((lines[i] ?? '').trim())) {
        buf.push(lines[i] ?? '');
        i += 1;
      }
      i += 1; // closing tag
      blocks.push({ kind: 'component', name, attrs, inner: buf.join('\n').trim() });
      continue;
    }
    // Paragraf — boş satıra kadar biriktir.
    const buf: string[] = [line];
    i += 1;
    while (i < lines.length && (lines[i] ?? '').trim() !== '') {
      const next = lines[i] ?? '';
      // Başlığa/listeye çarparsak dur.
      if (
        /^(#{1,6})\s+/.test(next.trim()) ||
        /^[-*]\s+/.test(next.trim()) ||
        /^\d+\.\s+/.test(next.trim()) ||
        /^>\s?/.test(next) ||
        /^```/.test(next.trim()) ||
        /^<[A-Z]/.test(next.trim()) ||
        next.trim().startsWith('|')
      ) {
        break;
      }
      buf.push(next);
      i += 1;
    }
    blocks.push({ kind: 'paragraph', text: buf.join('\n').trim() });
  }
  return blocks;
}

function splitRow(line: string): string[] {
  const trimmed = line.trim();
  const stripped = trimmed.replace(/^\|/, '').replace(/\|$/, '');
  return stripped.split('|').map((c) => c.trim());
}

function parseAttrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /(\w[\w-]*)\s*=\s*"([^"]*)"|(\w[\w-]*)\s*=\s*'([^']*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const key = (m[1] ?? m[3])!;
    const val = m[2] ?? m[4] ?? '';
    out[key] = val;
  }
  return out;
}

function renderBlock(block: Block, ctx: RenderContext, idx: number): ReactNode {
  switch (block.kind) {
    case 'heading': {
      const id = slugify(block.text);
      const className = 'blog-heading scroll-mt-24';
      const children = (
        <>
          <a
            href={`#${id}`}
            className="anchor mr-2 text-[#9CA3AF] no-underline opacity-0 transition-opacity hover:text-[#FF5400] group-hover:opacity-100"
            aria-label={`${block.text} başlığına kalıcı bağlantı`}
          >
            #
          </a>
          {renderInline(block.text)}
        </>
      );
      switch (block.level) {
        case 1:
          return (
            <h1 id={id} className={`${className} group text-4xl font-bold tracking-tight text-[#0F1419]`}>
              {children}
            </h1>
          );
        case 2:
          return (
            <h2 id={id} className={`${className} group mt-12 border-b border-[#E5E7EB] pb-2 text-2xl font-bold tracking-tight text-[#0F1419]`}>
              {children}
            </h2>
          );
        case 3:
          return (
            <h3 id={id} className={`${className} group mt-8 text-xl font-semibold text-[#0F1419]`}>
              {children}
            </h3>
          );
        default:
          return (
            <h4 id={id} className={`${className} group mt-6 text-lg font-semibold text-[#111827]`}>
              {children}
            </h4>
          );
      }
    }
    case 'paragraph':
      return <p className="my-5 leading-relaxed text-[#374151]">{renderInline(block.text)}</p>;
    case 'ul':
      return (
        <ul className="my-5 list-disc space-y-2 pl-6 text-[#374151]">
          {block.items.map((it, i) => (
            <li key={i}>{renderInline(it)}</li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol className="my-5 list-decimal space-y-2 pl-6 text-[#374151]">
          {block.items.map((it, i) => (
            <li key={i}>{renderInline(it)}</li>
          ))}
        </ol>
      );
    case 'quote':
      return (
        <blockquote className="my-6 border-l-4 border-[#FF5400] bg-[#FFF7F2] px-5 py-3 italic text-[#374151]">
          {renderInline(block.text)}
        </blockquote>
      );
    case 'code':
      return (
        <pre className="my-6 overflow-x-auto rounded-md bg-[#0F1419] p-4 text-xs leading-relaxed text-[#E5E7EB]">
          <code data-lang={block.lang}>{block.content}</code>
        </pre>
      );
    case 'hr':
      return <hr className="my-10 border-[#E5E7EB]" />;
    case 'table':
      return (
        <div className="my-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {block.headers.map((h, i) => (
                  <th
                    key={i}
                    className="border border-[#E5E7EB] bg-[#F9FAFB] px-3 py-2 text-left font-semibold text-[#0F1419]"
                  >
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td
                      key={c}
                      className="border border-[#E5E7EB] px-3 py-2 align-top text-[#374151]"
                    >
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'component':
      return renderComponent(block.name, block.attrs, block.inner, ctx, idx);
  }
}

function renderComponent(
  name: string,
  attrs: Record<string, string>,
  inner: string,
  ctx: RenderContext,
  _idx: number
): ReactNode {
  switch (name) {
    case 'Callout':
      return (
        <Callout variant={(attrs['variant'] as 'info' | 'warning' | 'quote') ?? 'info'}>
          {renderInline(inner)}
        </Callout>
      );
    case 'Citation':
      return (
        <Citation
          author={attrs['author'] ?? ''}
          year={attrs['year'] ?? ''}
          title={attrs['title'] ?? ''}
          doi={attrs['doi']}
          url={attrs['url']}
          journal={attrs['journal']}
        />
      );
    case 'DataChart':
      return <DataChart id={attrs['id'] ?? ''} title={attrs['title'] ?? ''} />;
    case 'TableOfContents':
      return <TableOfContents headings={ctx.post.headings} />;
    case 'ShareButtons':
      return <ShareButtons title={ctx.post.frontmatter.title} url={ctx.shareUrl} />;
    case 'RelatedPosts':
      return <RelatedPosts posts={ctx.related} />;
    case 'NewsletterCTA':
      return <NewsletterCTA />;
    default:
      return null;
  }
}

// -------- Inline --------
// Sıralama: escape → image → link → inline code → bold → italic.
export function renderInline(text: string): ReactNode {
  // Null safety: renderInline([email protected]) benzeri durumları erken kesme.
  if (!text) return null;

  // 1) Çift-boşluk satır sonu → <br>
  const parts = text.split(/  \n/);
  return parts.map((part, idx) => (
    <Fragment key={idx}>
      {idx > 0 ? <br /> : null}
      {parseInlineSegment(part)}
    </Fragment>
  ));
}

function parseInlineSegment(text: string): ReactNode[] {
  const tokens: ReactNode[] = [];
  let remaining = text;
  let safety = 0;
  while (remaining.length > 0 && safety < 2000) {
    safety += 1;
    const next = findNextToken(remaining);
    if (!next) {
      tokens.push(remaining);
      break;
    }
    if (next.index > 0) {
      tokens.push(remaining.slice(0, next.index));
    }
    tokens.push(next.node);
    remaining = remaining.slice(next.index + next.length);
  }
  return tokens;
}

interface TokenMatch {
  index: number;
  length: number;
  node: ReactNode;
}

function findNextToken(src: string): TokenMatch | null {
  const candidates: TokenMatch[] = [];
  // image
  const img = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/.exec(src);
  if (img) {
    candidates.push({
      index: img.index,
      length: img[0].length,
      node: (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img[2]}
          alt={img[1] ?? ''}
          title={img[3]}
          loading="lazy"
          className="my-4 rounded-md"
        />
      ),
    });
  }
  // link
  const link = /\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/.exec(src);
  if (link) {
    const href = link[2] ?? '';
    const isExternal = /^https?:\/\//.test(href);
    candidates.push({
      index: link.index,
      length: link[0].length,
      node: (
        <a
          href={href}
          title={link[3]}
          className="font-medium text-[#FF5400] underline decoration-[#FF5400]/30 underline-offset-2 hover:decoration-[#FF5400]"
          {...(isExternal
            ? { target: '_blank', rel: 'noopener noreferrer' }
            : {})}
        >
          {link[1]}
        </a>
      ),
    });
  }
  // inline code
  const code = /`([^`]+)`/.exec(src);
  if (code) {
    candidates.push({
      index: code.index,
      length: code[0].length,
      node: (
        <code className="rounded bg-[#F3F4F6] px-1.5 py-0.5 font-mono text-[0.9em] text-[#0F1419]">
          {code[1]}
        </code>
      ),
    });
  }
  // bold
  const bold = /\*\*([^*]+)\*\*/.exec(src);
  if (bold) {
    candidates.push({
      index: bold.index,
      length: bold[0].length,
      node: <strong className="font-semibold text-[#0F1419]">{bold[1]}</strong>,
    });
  }
  // italic
  const italic = /(^|[^*])\*([^*\n]+)\*/.exec(src);
  if (italic) {
    const leadLen = italic[1]?.length ?? 0;
    candidates.push({
      index: italic.index + leadLen,
      length: italic[0].length - leadLen,
      node: <em className="italic">{italic[2]}</em>,
    });
  }
  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.index - b.index);
  return candidates[0] ?? null;
}
