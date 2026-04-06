'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { EmployeeView } from '@/lib/employee-mapper';

interface Props {
  employees: EmployeeView[];
}

const RENK_MAP: Record<string, { bg: string; text: string }> = {
  green: { bg: 'bg-green-soft', text: 'text-green' },
  amber: { bg: 'bg-amber-soft', text: 'text-amber' },
  red:   { bg: 'bg-red-soft',   text: 'text-red' },
  gray:  { bg: 'bg-bg-3',       text: 'text-ink-40' },
};

const PAGE_SIZE = 10;

export function EmployeeListClient({ employees }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search.trim()) return employees;
    const q = search.toLocaleLowerCase('tr-TR');
    return employees.filter(
      (e) =>
        e.tamAd.toLocaleLowerCase('tr-TR').includes(q) ||
        e.sicilNo.toLocaleLowerCase('tr-TR').includes(q) ||
        e.email.toLocaleLowerCase('tr-TR').includes(q),
    );
  }, [employees, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-40"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Ad, soyad, sicil no veya email ile arayın..."
          className="h-10 w-full rounded-lg border border-line bg-bg pl-10 pr-4 text-sm text-ink placeholder:text-ink-40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-line bg-bg">
        <table className="w-full">
          <thead>
            <tr className="border-b border-line bg-bg-2">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-40">Çalışan</th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-40 md:table-cell">Sicil No</th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-40 lg:table-cell">Email</th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-40 sm:table-cell">Başlama</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-ink-40">Durum</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="h-10 w-10 text-ink-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128H5.228A2 2 0 013 17.208V5.802A2 2 0 015.228 4h8.544A2 2 0 0116 5.802V12" />
                    </svg>
                    <p className="text-sm font-medium text-ink-60">
                      {search ? 'Aramanızla eşleşen çalışan bulunamadı.' : 'Henüz çalışan eklenmemiş.'}
                    </p>
                    {!search && (
                      <button
                        onClick={() => router.push('/calisanlar/yeni')}
                        className="mt-2 text-sm font-medium text-accent hover:underline"
                      >
                        İlk çalışanınızı ekleyin →
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((emp) => {
                const renk = RENK_MAP[emp.durumRenk] ?? RENK_MAP['gray']!;
                return (
                  <tr
                    key={emp.id}
                    onClick={() => router.push(`/calisanlar/${emp.id}`)}
                    className="cursor-pointer border-b border-line transition-colors last:border-0 hover:bg-bg-2"
                  >
                    {/* Çalışan */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
                          {emp.initials}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-ink">{emp.tamAd}</div>
                          <div className="truncate text-xs text-ink-40 md:hidden">{emp.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Sicil No */}
                    <td className="hidden px-4 py-3 text-sm text-ink-60 md:table-cell">
                      {emp.sicilNo}
                    </td>

                    {/* Email */}
                    <td className="hidden px-4 py-3 text-sm text-ink-60 lg:table-cell">
                      {emp.email}
                    </td>

                    {/* Başlama */}
                    <td className="hidden px-4 py-3 text-sm text-ink-60 sm:table-cell">
                      {emp.iseBaslama
                        ? new Date(emp.iseBaslama).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>

                    {/* Durum */}
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${renk.bg} ${renk.text}`}>
                        {emp.durumLabel}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-ink-40">
            {filtered.length} çalışandan {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} gösteriliyor
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-md border border-line bg-bg px-3 py-1.5 text-xs font-medium text-ink-60 transition-colors hover:bg-bg-2 disabled:opacity-40"
            >
              ← Önceki
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-md border border-line bg-bg px-3 py-1.5 text-xs font-medium text-ink-60 transition-colors hover:bg-bg-2 disabled:opacity-40"
            >
              Sonraki →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
