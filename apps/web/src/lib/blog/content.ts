// Blog içerik erişim katmanı — disk üzerindeki MDX dosyalarını ve yazar
// kayıtlarını tipli nesnelere çevirir. Tüm blog sayfaları ve API'leri
// bu modülü kaynak olarak kullanır.
//
// Varsayım: next build sırasında `apps/web/content/blog/**` deploy
// imajına kopyalanır (standalone output `includeFiles` ayarı ile).
// Dev'de süreç `process.cwd()` üzerinden çözer, prod'da Next.js runtime
// tracing bu dosyaları `.next/standalone/apps/web/content/...` altına alır.

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { parseFrontmatter } from './frontmatter';
import { computeReadingTime } from './reading-time';
import { extractHeadings } from './mdx';
import { slugify } from './slugify';
import { BLOG_CATEGORIES, getCategory } from './categories';
import type {
  BlogAuthor,
  BlogCategorySlug,
  BlogFrontmatter,
  BlogPost,
  BlogPostSummary,
} from './types';

const CONTENT_ROOT = path.join(process.cwd(), 'content', 'blog');
const POSTS_DIR = path.join(CONTENT_ROOT, 'posts');
const AUTHORS_DIR = path.join(CONTENT_ROOT, 'authors');

// --------- Yazar yükleme ---------

let authorCache: Map<string, BlogAuthor> | null = null;

export async function loadAuthors(): Promise<Map<string, BlogAuthor>> {
  if (authorCache) return authorCache;
  const map = new Map<string, BlogAuthor>();
  let files: string[] = [];
  try {
    files = await fs.readdir(AUTHORS_DIR);
  } catch {
    files = [];
  }
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const slug = file.replace(/\.json$/, '');
    try {
      const raw = await fs.readFile(path.join(AUTHORS_DIR, file), 'utf-8');
      const data = JSON.parse(raw) as Omit<BlogAuthor, 'slug'>;
      map.set(slug, { slug, ...data });
    } catch {
      // bozuk dosyaları sessizce atla — diğerleri çalışsın.
    }
  }
  authorCache = map;
  return map;
}

export async function getAuthor(slug: string): Promise<BlogAuthor | undefined> {
  const authors = await loadAuthors();
  return authors.get(slug);
}

export async function getAllAuthors(): Promise<BlogAuthor[]> {
  const authors = await loadAuthors();
  return Array.from(authors.values()).sort((a, b) => a.name.localeCompare(b.name, 'tr'));
}

// --------- Post yükleme ---------

let postCache: BlogPost[] | null = null;

function validateFrontmatter(
  slug: string,
  fm: Record<string, unknown>
): BlogFrontmatter {
  const required = ['title', 'description', 'author', 'category', 'publishedAt'];
  for (const key of required) {
    if (!fm[key]) {
      throw new Error(`Blog post "${slug}" eksik frontmatter alanı: ${key}`);
    }
  }
  if (!getCategory(String(fm['category']))) {
    throw new Error(`Blog post "${slug}" geçersiz kategori: ${String(fm['category'])}`);
  }
  const tagsRaw = fm['tags'];
  const tags = Array.isArray(tagsRaw) ? tagsRaw.map((t) => String(t)) : [];
  return {
    title: String(fm['title']),
    description: String(fm['description']),
    author: String(fm['author']),
    category: String(fm['category']) as BlogCategorySlug,
    tags,
    publishedAt: String(fm['publishedAt']),
    updatedAt: fm['updatedAt'] ? String(fm['updatedAt']) : undefined,
    heroImage: fm['heroImage'] ? String(fm['heroImage']) : undefined,
    heroAlt: fm['heroAlt'] ? String(fm['heroAlt']) : undefined,
    draft: fm['draft'] === true,
  };
}

export async function loadAllPosts(): Promise<BlogPost[]> {
  if (postCache) return postCache;
  const authors = await loadAuthors();
  let files: string[] = [];
  try {
    files = await fs.readdir(POSTS_DIR);
  } catch {
    files = [];
  }
  const posts: BlogPost[] = [];
  for (const file of files) {
    if (!file.endsWith('.mdx')) continue;
    const slug = file.replace(/\.mdx$/, '');
    const raw = await fs.readFile(path.join(POSTS_DIR, file), 'utf-8');
    const { data, body } = parseFrontmatter(raw);
    const fm = validateFrontmatter(slug, data);
    if (fm.draft && process.env['NODE_ENV'] === 'production') continue;
    const { minutes, words } = computeReadingTime(body);
    const author = authors.get(fm.author);
    if (!author) {
      throw new Error(
        `Blog post "${slug}" tanımsız yazara başvuruyor: ${fm.author}`
      );
    }
    const category = BLOG_CATEGORIES[fm.category];
    const headings = extractHeadings(body);
    posts.push({
      slug,
      frontmatter: fm,
      content: body,
      readingTimeMinutes: minutes,
      wordCount: words,
      author,
      category,
      headings,
    });
  }
  posts.sort(
    (a, b) =>
      new Date(b.frontmatter.publishedAt).getTime() -
      new Date(a.frontmatter.publishedAt).getTime()
  );
  postCache = posts;
  return posts;
}

export async function getPost(slug: string): Promise<BlogPost | undefined> {
  const posts = await loadAllPosts();
  return posts.find((p) => p.slug === slug);
}

export function postToSummary(post: BlogPost): BlogPostSummary {
  return {
    slug: post.slug,
    title: post.frontmatter.title,
    description: post.frontmatter.description,
    publishedAt: post.frontmatter.publishedAt,
    updatedAt: post.frontmatter.updatedAt,
    readingTimeMinutes: post.readingTimeMinutes,
    heroImage: post.frontmatter.heroImage,
    heroAlt: post.frontmatter.heroAlt,
    author: post.author,
    category: post.category,
    tags: post.frontmatter.tags,
  };
}

export async function getPostSummaries(): Promise<BlogPostSummary[]> {
  const posts = await loadAllPosts();
  return posts.map(postToSummary);
}

export async function getRelatedPosts(
  slug: string,
  limit = 3
): Promise<BlogPostSummary[]> {
  const posts = await loadAllPosts();
  const current = posts.find((p) => p.slug === slug);
  if (!current) return [];
  const scored = posts
    .filter((p) => p.slug !== slug)
    .map((p) => {
      let score = 0;
      if (p.frontmatter.category === current.frontmatter.category) score += 3;
      for (const tag of p.frontmatter.tags) {
        if (current.frontmatter.tags.includes(tag)) score += 2;
      }
      if (p.author.slug === current.author.slug) score += 1;
      return { post: p, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return scored.map((s) => postToSummary(s.post));
}

export async function getPostsByCategory(
  category: string
): Promise<BlogPostSummary[]> {
  const posts = await loadAllPosts();
  return posts
    .filter((p) => p.frontmatter.category === category)
    .map(postToSummary);
}

export async function getPostsByAuthor(
  authorSlug: string
): Promise<BlogPostSummary[]> {
  const posts = await loadAllPosts();
  return posts.filter((p) => p.author.slug === authorSlug).map(postToSummary);
}

export async function getPostsByTag(tag: string): Promise<BlogPostSummary[]> {
  const posts = await loadAllPosts();
  return posts
    .filter((p) => p.frontmatter.tags.some((t) => tagSlug(t) === tag))
    .map(postToSummary);
}

export function tagSlug(tag: string): string {
  return slugify(tag);
}

export async function getAllTags(): Promise<
  Array<{ tag: string; slug: string; count: number }>
> {
  const posts = await loadAllPosts();
  const counts = new Map<string, { tag: string; count: number }>();
  for (const p of posts) {
    for (const t of p.frontmatter.tags) {
      const key = tagSlug(t);
      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else counts.set(key, { tag: t, count: 1 });
    }
  }
  return Array.from(counts.entries())
    .map(([slug, v]) => ({ slug, tag: v.tag, count: v.count }))
    .sort((a, b) => b.count - a.count);
}
