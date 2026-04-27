'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Briefcase, MapPin, Plus, Search, Users } from 'lucide-react';
import { useRequisitions, type Requisition } from '@/hooks/useAts';

const STATUS_FILTER: Array<{ value: string; label: string }> = [
  { value: 'open', label: 'Açık' },
  { value: 'on_hold', label: 'Beklemede' },
  { value: 'closed', label: 'Kapandı' },
  { value: '', label: 'Tümü' },
];

export default function ATSPage() {
  const [status, setStatus] = useState('open');
  const [search, setSearch] = useState('');

  const reqs = useRequisitions(status ? { status, limit: 100 } : { limit: 100 });

  const filtered = useMemo(() => {
    const items = reqs.data?.items ?? [];
    if (!search.trim()) return items;
    const q = search.toLocaleLowerCase('tr-TR');
    return items.filter(
      (r) =>
        r.title.toLocaleLowerCase('tr-TR').includes(q) ||
        (r.location?.toLocaleLowerCase('tr-TR').includes(q) ?? false),
    );
  }, [reqs.data, search]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">
            Aday Takip Sistemi (ATS)
          </h1>
          <p className="mt-1 text-sm text-ink-60">
            Açık ilanlar, Kanban pipeline ve aday JD-R fit skorları.
          </p>
        </div>
        <Link
          href="/ats/yeni-ilan"
          className="inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-accent/90"
        >
          <Plus className="h-4 w-4" />
          Yeni İlan
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-40" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pozisyon adı, lokasyon ara…"
            className="h-10 w-full rounded-md border border-line bg-bg pl-9 pr-3 text-sm text-ink placeholder:text-ink-40 focus:border-accent focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-1 rounded-md border border-line bg-bg p-1 text-[12px]">
          {STATUS_FILTER.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatus(f.value)}
              className={`rounded px-3 py-1.5 font-medium transition-colors ${
                status === f.value
                  ? 'bg-accent-soft text-accent'
                  : 'text-ink-60 hover:text-ink'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {reqs.isLoading && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-xl border border-line bg-bg"
            />
          ))}
        </div>
      )}

      {reqs.isError && (
        <div className="rounded-lg border border-red/30 bg-red-soft p-4 text-sm text-red">
          <p className="font-medium">İlanlar yüklenemedi</p>
          <p className="mt-1 text-[12px]">{reqs.error?.message}</p>
          <button
            type="button"
            onClick={() => reqs.refetch()}
            className="mt-3 rounded bg-red px-3 py-1.5 text-[12px] font-medium text-white"
          >
            Yeniden dene
          </button>
        </div>
      )}

      {!reqs.isLoading && !reqs.isError && filtered.length === 0 && (
        <EmptyState hasSearch={!!search} status={status} />
      )}

      {!reqs.isLoading && !reqs.isError && filtered.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <RequisitionCard key={r.id} req={r} />
          ))}
        </div>
      )}
    </div>
  );
}

const RequisitionCard = ({ req }: { req: Requisition }) => {
  const statusPill =
    req.status === 'open'
      ? 'bg-green-soft text-green'
      : req.status === 'on_hold'
        ? 'bg-amber-soft text-amber'
        : 'bg-bg-3 text-ink-60';

  return (
    <Link
      href={`/ats/${req.id}`}
      className="flex flex-col gap-3 rounded-xl border border-line bg-bg p-5 transition-colors hover:border-ink-20"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-ink">{req.title}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-ink-40">
            {req.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {req.location}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {req.headcount} kadro
            </span>
            <span>{req.employment_type}</span>
          </div>
        </div>
        <span
          className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium ${statusPill}`}
        >
          {req.status === 'open'
            ? 'Açık'
            : req.status === 'on_hold'
              ? 'Beklemede'
              : req.status === 'closed'
                ? 'Kapandı'
                : req.status}
        </span>
      </div>

      <p className="line-clamp-3 text-[12px] text-ink-60">{req.description}</p>

      <div className="flex items-center justify-between border-t border-line pt-3 text-[11px] text-ink-40">
        <span>
          {new Date(req.created_at).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
        <span className="font-medium text-accent">Kanban'a git →</span>
      </div>
    </Link>
  );
};

const EmptyState = ({ hasSearch, status }: { hasSearch: boolean; status: string }) => (
  <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-bg px-6 py-16 text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft">
      <Briefcase className="h-7 w-7 text-accent" />
    </div>
    <p className="text-sm font-medium text-ink">
      {hasSearch
        ? 'Aramaya uygun ilan bulunamadı'
        : status === 'open'
          ? 'Şu anda açık ilan yok'
          : 'İlan bulunamadı'}
    </p>
    <p className="max-w-md text-xs text-ink-40">
      Yeni bir kadro talebi oluşturarak ilk açık pozisyonu yayınlayın. Kariyer.net,
      LinkedIn ve kendi kariyer sayfanızdan başvuru toplayabilirsiniz.
    </p>
    <Link
      href="/ats/yeni-ilan"
      className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-white"
    >
      <Plus className="h-4 w-4" /> Yeni ilan oluştur
    </Link>
  </div>
);
