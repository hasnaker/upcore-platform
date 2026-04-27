'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDown, ChevronUp, Search, Filter, Download } from 'lucide-react';
import { useEmployees, type EmployeeQueryParams } from '@/hooks/useEmployees';
import { useDepartments } from '@/hooks/useDepartments';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { EmployeeView } from '@/lib/employee-mapper';

type SortKey = 'ad' | 'employee_no' | 'hire_date' | 'employment_status';
type SortDir = 'asc' | 'desc';

const STATUS_OPTIONS = [
  { value: '', label: 'Tüm durumlar' },
  { value: 'active', label: 'Aktif' },
  { value: 'on_leave', label: 'İzinde' },
  { value: 'suspended', label: 'Askıda' },
  { value: 'terminated', label: 'Ayrılmış' },
  { value: 'retired', label: 'Emekli' },
];

const PAGE_SIZES = [10, 20, 50, 100];

const renkToPillClass: Record<EmployeeView['durumRenk'], string> = {
  green: 'bg-green-soft text-green',
  amber: 'bg-amber-soft text-amber',
  red: 'bg-red-soft text-red',
  gray: 'bg-bg-3 text-ink-40',
};

export function EmployeeListClient() {
  const router = useRouter();

  // Filtreler + pagination — controlled state
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('ad');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const search = useDebouncedValue(searchInput, 300);

  const params: EmployeeQueryParams = useMemo(
    () => ({
      page,
      limit,
      search: search || undefined,
      department_id: departmentFilter || undefined,
      employment_status: statusFilter || undefined,
      sort: `${sortKey}:${sortDir}`,
    }),
    [page, limit, search, departmentFilter, statusFilter, sortKey, sortDir],
  );

  const { data, isLoading, isError, error, refetch, isFetching } = useEmployees(params);
  const { data: departments = [] } = useDepartments();

  const rows = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(1);
  };

  const exportCSV = () => {
    if (rows.length === 0) return;
    const header = ['Sicil No', 'Ad', 'Soyad', 'Email', 'İşe Başlama', 'Kıdem (ay)', 'Durum'];
    const lines = [header.join(',')].concat(
      rows.map((e) =>
        [e.sicilNo, e.ad, e.soyad, e.email, e.iseBaslama, e.kidemAy, e.durumLabel]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(','),
      ),
    );
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calisanlar-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1 lg:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-40" />
          <input
            type="search"
            placeholder="Ad, soyad, email veya sicil no ara…"
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            className="h-10 w-full rounded-md border border-line bg-bg pl-9 pr-3 text-sm text-ink placeholder:text-ink-40 focus:border-accent focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-ink-40">
            <Filter className="h-3.5 w-3.5" />
            Filtre
          </div>
          <select
            value={departmentFilter}
            onChange={(e) => {
              setDepartmentFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-line bg-bg px-3 text-sm text-ink focus:border-accent focus:outline-none"
          >
            <option value="">Tüm departmanlar</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name_tr}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-line bg-bg px-3 text-sm text-ink focus:border-accent focus:outline-none"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={exportCSV}
            disabled={rows.length === 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-bg px-3 text-[13px] font-medium text-ink-60 transition-colors hover:border-ink-20 disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-line bg-bg">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-bg-2 text-[11px] uppercase tracking-wider text-ink-40">
              <tr>
                <HeaderCell label="Çalışan" sortKey="ad" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <HeaderCell label="Sicil No" sortKey="employee_no" currentKey={sortKey} dir={sortDir} onSort={toggleSort} />
                <th className="px-4 py-3 text-left font-semibold">Email</th>
                <HeaderCell
                  label="İşe Başlama"
                  sortKey="hire_date"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                />
                <HeaderCell
                  label="Durum"
                  sortKey="employment_status"
                  currentKey={sortKey}
                  dir={sortDir}
                  onSort={toggleSort}
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {isLoading && !data && <SkeletonRows count={Math.min(limit, 8)} />}

              {isError && (
                <tr>
                  <td colSpan={5} className="px-4 py-10">
                    <div className="mx-auto max-w-md rounded-md border border-red/30 bg-red-soft px-4 py-4 text-center text-sm text-red">
                      <p className="font-medium">Çalışanlar yüklenemedi.</p>
                      <p className="mt-1 text-[12px]">{error?.message ?? 'Bilinmeyen hata'}</p>
                      <button
                        type="button"
                        onClick={() => refetch()}
                        className="mt-3 rounded-md bg-red px-3 py-1.5 text-[12px] font-medium text-white"
                      >
                        Yeniden dene
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {!isLoading && !isError && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <p className="text-sm font-medium text-ink">Çalışan bulunamadı</p>
                    <p className="mt-1 text-xs text-ink-40">
                      {search || departmentFilter || statusFilter
                        ? 'Filtrelerinizi değiştirmeyi veya ilk çalışanınızı eklemeyi deneyin.'
                        : 'Henüz hiç çalışan eklenmemiş. İlk çalışanınızı ekleyin.'}
                    </p>
                    <Link
                      href="/calisanlar/yeni"
                      className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-white"
                    >
                      + Yeni Çalışan
                    </Link>
                  </td>
                </tr>
              )}

              {rows.map((emp) => (
                <tr
                  key={emp.id}
                  onClick={() => router.push(`/calisanlar/${emp.id}`)}
                  className="cursor-pointer transition-colors hover:bg-bg-2"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
                        {emp.initials}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink">{emp.tamAd}</p>
                        <p className="truncate text-[11px] text-ink-40">
                          {emp.kidemAy > 0
                            ? `${Math.floor(emp.kidemAy / 12)} yıl ${emp.kidemAy % 12} ay`
                            : 'Yeni'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-ink-60">{emp.sicilNo || '—'}</td>
                  <td className="px-4 py-3 text-ink-60">{emp.email || '—'}</td>
                  <td className="px-4 py-3 tabular-nums text-ink-60">
                    {emp.iseBaslama
                      ? new Date(emp.iseBaslama).toLocaleDateString('tr-TR', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex h-6 items-center rounded-full px-2 text-[11px] font-medium ${renkToPillClass[emp.durumRenk]}`}
                    >
                      {emp.durumLabel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length > 0 && (
          <div className="flex flex-col items-center justify-between gap-3 border-t border-line bg-bg-2 px-4 py-3 text-[12px] text-ink-60 sm:flex-row">
            <div className="flex items-center gap-2">
              <span>Sayfa başına:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="h-7 rounded border border-line bg-bg px-2 text-xs focus:border-accent focus:outline-none"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 tabular-nums">
              <span>
                {total === 0 ? 0 : (page - 1) * limit + 1}–{Math.min(page * limit, total)} / {total}
              </span>
              {isFetching && <span className="ml-2 text-ink-40">yenileniyor…</span>}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="inline-flex h-7 items-center justify-center rounded border border-line bg-bg px-2 disabled:opacity-40"
              >
                ‹‹
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex h-7 items-center justify-center rounded border border-line bg-bg px-2 disabled:opacity-40"
              >
                ‹
              </button>
              <span className="px-2 text-ink-60">
                {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex h-7 items-center justify-center rounded border border-line bg-bg px-2 disabled:opacity-40"
              >
                ›
              </button>
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages}
                className="inline-flex h-7 items-center justify-center rounded border border-line bg-bg px-2 disabled:opacity-40"
              >
                ››
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

const HeaderCell = ({
  label,
  sortKey,
  currentKey,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentKey: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
}) => {
  const active = currentKey === sortKey;
  return (
    <th className="px-4 py-3 text-left font-semibold">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 transition-colors ${active ? 'text-ink-80' : 'text-ink-40 hover:text-ink-60'}`}
      >
        {label}
        {active ? (
          dir === 'asc' ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )
        ) : (
          <ChevronDown className="h-3 w-3 opacity-30" />
        )}
      </button>
    </th>
  );
};

const SkeletonRows = ({ count }: { count: number }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <tr key={i} className="animate-pulse">
        <td className="px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-bg-3" />
            <div className="h-3 w-32 rounded bg-bg-3" />
          </div>
        </td>
        <td className="px-4 py-4">
          <div className="h-3 w-16 rounded bg-bg-3" />
        </td>
        <td className="px-4 py-4">
          <div className="h-3 w-40 rounded bg-bg-3" />
        </td>
        <td className="px-4 py-4">
          <div className="h-3 w-20 rounded bg-bg-3" />
        </td>
        <td className="px-4 py-4">
          <div className="h-6 w-16 rounded-full bg-bg-3" />
        </td>
      </tr>
    ))}
  </>
);
