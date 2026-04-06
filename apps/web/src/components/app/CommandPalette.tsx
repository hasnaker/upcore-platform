'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface SearchResult {
  id: string;
  type: 'employee' | 'okr' | 'department' | 'position' | 'document';
  title: string;
  subtitle: string;
  href: string;
}

const TYPE_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  employee: { icon: '👤', color: '#5E5CE6', bg: '#f0f0ff' },
  okr: { icon: '🎯', color: '#059669', bg: '#D1FAE5' },
  department: { icon: '🏢', color: '#D97706', bg: '#FEF3C7' },
  position: { icon: '💼', color: '#0EA5E9', bg: '#E0F2FE' },
  document: { icon: '📄', color: '#737373', bg: '#F5F5F5' },
};

const QUICK_LINKS = [
  { label: 'Aksiyon Merkezi', href: '/panel', shortcut: 'P' },
  { label: 'Calisanlar', href: '/calisanlar', shortcut: 'C' },
  { label: 'Performans', href: '/performans', shortcut: 'F' },
  { label: 'Guclu Yonler', href: '/guclu-yonler', shortcut: 'G' },
  { label: 'Kariyer', href: '/kariyer', shortcut: 'K' },
  { label: 'Tukenmislik', href: '/tukenmislik', shortcut: 'T' },
  { label: 'Analytics', href: '/analytics', shortcut: 'A' },
  { label: 'Ayarlar', href: '/ayarlar', shortcut: 'S' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced search
  const search = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((data) => {
          setResults(data.results || []);
          setSelectedIndex(0);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 200);
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    search(val);
  }, [search]);

  const navigate = useCallback((href: string) => {
    setOpen(false);
    router.push(href);
  }, [router]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const items = query.length >= 2 ? results : QUICK_LINKS;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (query.length >= 2 && results[selectedIndex]) {
        navigate(results[selectedIndex].href);
      } else if (QUICK_LINKS[selectedIndex]) {
        navigate(QUICK_LINKS[selectedIndex].href);
      }
    }
  }, [query, results, selectedIndex, navigate]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-[560px] overflow-hidden rounded-2xl border border-[#e5e5e5] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 border-b border-[#f0f0f0] px-4 py-3">
          <svg className="h-5 w-5 shrink-0 text-[#aaa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Calisan, OKR, departman ara..."
            className="flex-1 text-[15px] text-[#111] outline-none placeholder:text-[#aaa]"
          />
          {loading && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#f0f0f0] border-t-[#5E5CE6]" />
          )}
          <kbd className="rounded border border-[#e5e5e5] bg-[#fafafa] px-1.5 py-0.5 text-[10px] font-medium text-[#bbb]">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {query.length >= 2 ? (
            // Search results
            results.length > 0 ? (
              <div className="py-2">
                <div className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#aaa]">
                  Sonuclar ({results.length})
                </div>
                {results.map((result, i) => {
                  const config = TYPE_ICONS[result.type] || TYPE_ICONS['document']!;
                  return (
                    <button
                      key={result.id}
                      onClick={() => navigate(result.href)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
                        i === selectedIndex ? 'bg-[#f0f0ff]' : 'hover:bg-[#fafafa]'
                      }`}
                    >
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[14px]"
                        style={{ background: config.bg }}
                      >
                        {config.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-[#111]">{result.title}</div>
                        <div className="truncate text-[11px] text-[#888]">{result.subtitle}</div>
                      </div>
                      <svg className="h-3.5 w-3.5 shrink-0 text-[#ccc]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            ) : !loading ? (
              <div className="px-4 py-8 text-center text-[13px] text-[#888]">
                &quot;{query}&quot; icin sonuc bulunamadi
              </div>
            ) : null
          ) : (
            // Quick links
            <div className="py-2">
              <div className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#aaa]">
                Hizli Erisim
              </div>
              {QUICK_LINKS.map((link, i) => (
                <button
                  key={link.href}
                  onClick={() => navigate(link.href)}
                  className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition ${
                    i === selectedIndex ? 'bg-[#f0f0ff]' : 'hover:bg-[#fafafa]'
                  }`}
                >
                  <span className="text-[13px] font-medium text-[#111]">{link.label}</span>
                  <kbd className="rounded border border-[#e5e5e5] bg-[#fafafa] px-1.5 py-0.5 text-[10px] font-medium text-[#bbb]">
                    {link.shortcut}
                  </kbd>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-4 border-t border-[#f0f0f0] px-4 py-2 text-[10px] text-[#aaa]">
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-[#e5e5e5] bg-[#fafafa] px-1 py-0.5">↑↓</kbd>
            Gezin
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-[#e5e5e5] bg-[#fafafa] px-1 py-0.5">↵</kbd>
            Sec
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded border border-[#e5e5e5] bg-[#fafafa] px-1 py-0.5">ESC</kbd>
            Kapat
          </span>
        </div>
      </div>
    </div>
  );
}
