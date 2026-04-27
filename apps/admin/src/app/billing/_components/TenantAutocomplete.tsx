'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, Loader2, Search } from 'lucide-react';

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  status: string;
}

interface TenantListResponse {
  items: TenantRow[];
  total: number;
}

interface Props {
  value: string;
  label: string;
  onSelect: (tenantId: string, label: string) => void;
}

/**
 * Reusable tenant search + pick control. Hits /api/v1/admin/tenants with the
 * server-side proxy that enforces platform-admin role.
 */
export function TenantAutocomplete({ value, label, onSelect }: Props) {
  const [q, setQ] = useState<string>(label);
  const [open, setOpen] = useState<boolean>(false);
  const [debounced, setDebounced] = useState<string>('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const enabled = open && debounced.length >= 2;

  const results = useQuery<TenantListResponse>({
    queryKey: ['admin', 'tenants', 'autocomplete', debounced],
    queryFn: async () => {
      const res = await fetch(
        `/api/v1/admin/tenants?q=${encodeURIComponent(debounced)}&page=1&page_size=10`,
        { cache: 'no-store' },
      );
      if (!res.ok) {
        return { items: [], total: 0 };
      }
      return res.json();
    },
    enabled,
    staleTime: 30_000,
  });

  const items = results.data?.items ?? [];

  const selectedHint = useMemo(
    () => (value ? `Seçili: ${label || value.slice(0, 8)}` : ''),
    [value, label],
  );

  return (
    <div className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-40" />
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          placeholder="Tenant ara (min 2 karakter)…"
          className="h-10 w-full rounded-md border border-line bg-bg pl-8 pr-3 text-sm focus:border-accent focus:outline-none"
        />
        {results.isFetching && enabled && (
          <Loader2 className="absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink-40" />
        )}
      </div>
      {open && enabled && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-line bg-bg shadow-lg">
          {items.length === 0 && !results.isFetching && (
            <li className="px-3 py-4 text-center text-[12px] text-ink-40">Sonuç bulunamadı</li>
          )}
          {items.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(t.id, t.name);
                  setQ(t.name);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-bg-2"
              >
                <Building2 className="h-3.5 w-3.5 text-ink-40" />
                <span className="flex-1">
                  <span className="block font-medium text-ink">{t.name}</span>
                  <span className="block font-mono text-[10px] text-ink-40">{t.slug}</span>
                </span>
                <span className="rounded bg-bg-2 px-1.5 py-0.5 text-[10px] text-ink-60">
                  {t.status}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {selectedHint && !open && (
        <p className="mt-1 text-[10px] text-ink-40">{selectedHint}</p>
      )}
    </div>
  );
}
