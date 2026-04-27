// UpCore Blog — core type tanımları.
// İçerik frontmatter, yazar kaydı, kategori/etiket ve render edilmiş post
// şekilleri tek bir dosyada toplanır; tüm blog altyapısı bu türlerin
// üzerine oturur.

export type BlogCategorySlug =
  | 'egitim'
  | 'sektorel'
  | 'vaka'
  | 'uzman-gorusu'
  | 'urun';

export interface BlogAuthor {
  slug: string;
  name: string;
  title: string;
  bio: string;
  photo: string;
  email?: string;
  linkedin?: string;
  twitter?: string;
  website?: string;
  orcid?: string;
  isGuest?: boolean;
}

export interface BlogCategory {
  slug: BlogCategorySlug;
  name: string;
  description: string;
}

export interface BlogFrontmatter {
  title: string;
  description: string;
  author: string; // author slug
  category: BlogCategorySlug;
  tags: string[];
  publishedAt: string; // ISO 8601
  updatedAt?: string; // ISO 8601
  heroImage?: string;
  heroAlt?: string;
  draft?: boolean;
}

export interface BlogPost {
  slug: string;
  frontmatter: BlogFrontmatter;
  content: string; // raw MDX body
  readingTimeMinutes: number;
  wordCount: number;
  author: BlogAuthor;
  category: BlogCategory;
  headings: Array<{ id: string; level: number; text: string }>;
}

export interface BlogPostSummary {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  readingTimeMinutes: number;
  heroImage?: string;
  heroAlt?: string;
  author: BlogAuthor;
  category: BlogCategory;
  tags: string[];
}
