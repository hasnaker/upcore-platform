'use client';

import { useEffect, useState } from 'react';

interface Heading {
  id: string;
  level: number;
  text: string;
}

interface TableOfContentsProps {
  headings: Heading[];
}

// Sticky sidebar — kaydırdıkça aktif başlığı IntersectionObserver ile işaretler.
// RSC-dostu: server render edilmiş başlık listesini client-side state
// ile günceller, SSR markup'ta aktif satır önceden hesaplanmış değildir.
export function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string | null>(headings[0]?.id ?? null);

  useEffect(() => {
    if (typeof window === 'undefined' || headings.length === 0) return;
    const elements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => !!el);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          // En üstteki görünür başlığı aktif say.
          const sorted = visible.sort(
            (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
          );
          setActiveId(sorted[0]!.target.id);
        }
      },
      { rootMargin: '-96px 0px -72% 0px', threshold: 0 }
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  if (headings.length === 0) return null;

  return (
    <nav
      aria-label="İçindekiler"
      className="sticky top-24 hidden rounded-lg border border-[#E5E7EB] bg-white p-4 text-sm lg:block"
    >
      <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-[#6B7280]">
        İçindekiler
      </div>
      <ul className="space-y-1.5">
        {headings
          .filter((h) => h.level <= 3)
          .map((h) => (
            <li
              key={h.id}
              className={h.level === 3 ? 'pl-3' : ''}
            >
              <a
                href={`#${h.id}`}
                className={`block text-[13px] leading-snug transition-colors ${
                  activeId === h.id
                    ? 'font-semibold text-[#FF5400]'
                    : 'text-[#4B5563] hover:text-[#0F1419]'
                }`}
              >
                {h.text}
              </a>
            </li>
          ))}
      </ul>
    </nav>
  );
}
