'use client';

import { usePathname } from 'next/navigation';

const PAGE_TITLES: Record<string, string> = {
  '/panel': 'Aksiyon Merkezi',
  '/executive': 'Yönetici Paneli',
  '/calisanlar': 'Çalışanlar',
  '/departmanlar': 'Departmanlar',
  '/izinler': 'İzinler',
  '/belgeler': 'Belgeler',
  '/tukenmislik': 'Tükenmişlik',
  '/anketler': 'Anketler',
  '/degerlendirmeler': 'Değerlendirmeler',
  '/analytics': 'Analitik',
  '/aksiyonlar': 'Aksiyonlar',
  '/ayarlar': 'Ayarlar',
};

export function AppTopbar() {
  const pathname = usePathname();
  const title = PAGE_TITLES[pathname] ?? 'Upcore';

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#f0f0f0] bg-white px-6">
      <h1 className="text-[15px] font-semibold text-[#111]">{title}</h1>
      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 rounded-lg border border-[#eee] bg-[#fafafa] px-3 py-1.5 md:flex">
          <svg className="h-3.5 w-3.5 text-[#aaa]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-[12px] text-[#aaa]">Ara...</span>
          <kbd className="ml-4 rounded border border-[#e5e5e5] bg-white px-1.5 py-0.5 text-[10px] font-medium text-[#bbb]">⌘K</kbd>
        </div>
        <button className="relative rounded-lg p-2 text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#111]">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#5E5CE6]" />
        </button>
      </div>
    </header>
  );
}
