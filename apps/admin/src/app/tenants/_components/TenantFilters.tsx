'use client';

import { Search } from 'lucide-react';
import { Input } from '@upcore/design-system';
import { STATUS_LABEL, type StatusFilter } from './types';

interface TenantFiltersProps {
  search: string;
  status: StatusFilter;
  onSearchChange: (v: string) => void;
  onStatusChange: (s: StatusFilter) => void;
}

const FILTER_OPTIONS = ['all', 'active', 'trial', 'suspended'] as const;

export function TenantFilters({
  search,
  status,
  onSearchChange,
  onStatusChange,
}: TenantFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1 sm:max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-40" />
        <Input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Tenant adı veya slug ara…"
          className="pl-9"
          aria-label="Tenant ara"
        />
      </div>
      <div
        className="flex items-center gap-1 rounded-md border border-line bg-bg p-1 text-[12px]"
        role="tablist"
        aria-label="Durum filtresi"
      >
        {FILTER_OPTIONS.map((s) => {
          const label = s === 'all' ? 'Tümü' : STATUS_LABEL[s];
          const active = status === s;
          return (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onStatusChange(s)}
              className={`rounded px-3 py-1.5 font-medium transition-colors ${
                active ? 'bg-accent-soft text-accent' : 'text-ink-60 hover:text-ink'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
