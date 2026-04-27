'use client';

import { useMemo, useState, useDeferredValue } from 'react';
import { Search, X } from 'lucide-react';
import type { BlogPostSummary } from '@/lib/blog/types';
import { PostCard } from './PostCard';
import { ALL_CATEGORIES } from '@/lib/blog/categories';

interface BlogSearchProps {
  posts: BlogPostSummary[];
}

// Fuse.js alternatifi — bağımsız çalışan deterministik fuzzy puan.
// İçerik hacmi 12 makale + fiziksel tabloyla sabit, runtime cost << 1ms.
// Field ağırlıkları: başlık 0.5, açıklama 0.3, tag 0.15, yazar 0.05.
function scorePost(post: BlogPostSummary, query: string): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const fields: Array<{ text: string; weight: number }> = [
    { text: post.title, weight: 0.5 },
    { text: post.description, weight: 0.3 },
    { text: post.tags.join(' '), weight: 0.15 },
    { text: post.author.name, weight: 0.05 },
  ];
  let total = 0;
  for (const f of fields) {
    const t = f.text.toLowerCase();
    if (t.includes(q)) total += f.weight * 2;
    else {
      const tokens = q.split(/\s+/);
      const hits = tokens.filter((tok) => tok.length >= 3 && t.includes(tok)).length;
      if (hits > 0) total += (f.weight * hits) / tokens.length;
    }
  }
  return total;
}

export function BlogSearch({ posts }: BlogSearchProps) {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(() => {
    let list = posts;
    if (activeCategory !== 'all') {
      list = list.filter((p) => p.category.slug === activeCategory);
    }
    if (deferredQuery.trim().length >= 2) {
      list = list
        .map((p) => ({ post: p, score: scorePost(p, deferredQuery) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((x) => x.post);
    }
    return list;
  }, [posts, activeCategory, deferredQuery]);

  return (
    <div data-testid="blog-search">
      <div className="flex flex-col gap-4 border-b border-[#E5E7EB] pb-6 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Makale, konu veya yazar ara…"
            aria-label="Blog makalelerinde ara"
            className="h-11 w-full rounded-md border border-[#D1D5DB] bg-white pl-10 pr-9 text-sm text-[#0F1419] placeholder:text-[#9CA3AF] focus:border-[#FF5400] focus:outline-none focus:ring-2 focus:ring-[#FF5400]/20"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-[#9CA3AF] hover:bg-[#F3F4F6] hover:text-[#0F1419]"
              aria-label="Aramayı temizle"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div
          role="group"
          aria-label="Kategori filtresi"
          className="flex flex-wrap gap-2"
        >
          <FilterPill
            label="Tümü"
            active={activeCategory === 'all'}
            onClick={() => setActiveCategory('all')}
          />
          {ALL_CATEGORIES.map((cat) => (
            <FilterPill
              key={cat.slug}
              label={cat.name}
              active={activeCategory === cat.slug}
              onClick={() => setActiveCategory(cat.slug)}
            />
          ))}
        </div>
      </div>

      <div aria-live="polite" className="mt-2 text-xs text-[#6B7280]">
        {filtered.length} makale bulundu
        {deferredQuery ? ` · "${deferredQuery}" araması için` : ''}
      </div>

      {filtered.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-[#D1D5DB] bg-[#F9FAFB] p-12 text-center">
          <div className="text-sm font-semibold text-[#0F1419]">Sonuç bulunamadı</div>
          <p className="mt-1 text-xs text-[#6B7280]">
            Farklı bir arama terimi deneyin veya filtreleri sıfırlayın.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setActiveCategory('all');
            }}
            className="mt-4 inline-flex h-9 items-center rounded-md bg-[#0F1419] px-4 text-xs font-semibold text-white hover:bg-[#FF5400]"
          >
            Filtreleri sıfırla
          </button>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <PostCard key={p.slug} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-9 rounded-full px-4 text-xs font-medium transition-colors ${
        active
          ? 'bg-[#0F1419] text-white'
          : 'border border-[#E5E7EB] bg-white text-[#374151] hover:border-[#FF5400] hover:text-[#FF5400]'
      }`}
    >
      {label}
    </button>
  );
}
