import type { Metadata } from 'next';
import Link from 'next/link';
import { EmployeeListClient } from './_components/EmployeeListClient';

export const metadata: Metadata = {
  title: 'Çalışanlar',
  description: 'Şirketinizdeki tüm çalışanları yönetin.',
};

// Canlı liste + istatistikler client tarafında çekilir (Clerk JWT).
// Server component sadece shell + SEO metadata.
export default function CalisanlarPage() {
  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Çalışanlar</h1>
          <p className="mt-1 text-sm text-ink-60">
            Tüm çalışanlar, departmanlar ve durumlar — canlı API üzerinden.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/calisanlar/import"
            className="inline-flex items-center gap-1.5 rounded-md border border-line bg-bg px-4 py-2 text-[13px] font-medium text-ink-60 transition-colors hover:border-ink-20"
          >
            CSV İçe Aktar
          </Link>
          <Link
            href="/calisanlar/yeni"
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-accent/90"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Yeni Çalışan
          </Link>
        </div>
      </div>

      <EmployeeListClient />
    </div>
  );
}
