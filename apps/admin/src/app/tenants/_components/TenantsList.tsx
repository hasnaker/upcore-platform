'use client';

import {
  AlertTriangle,
  Building2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@upcore/design-system';
import { TenantRow } from './TenantRow';
import type { AdminTenantRow } from './types';

interface TenantsListProps {
  items: AdminTenantRow[];
  total: number;
  page: number;
  hasMore: boolean;
  isPending: boolean;
  isError: boolean;
  isFetching: boolean;
  error: Error | null;
  onPageChange: (next: number) => void;
  onRetry: () => void;
  onSuspend: (row: AdminTenantRow) => void;
  onActivate: (row: AdminTenantRow) => void;
  onImpersonate: (row: AdminTenantRow) => void;
}

export function TenantsList({
  items,
  total,
  page,
  hasMore,
  isPending,
  isError,
  isFetching,
  error,
  onPageChange,
  onRetry,
  onSuspend,
  onActivate,
  onImpersonate,
}: TenantsListProps) {
  return (
    <>
      <div className="overflow-hidden rounded-xl border border-line bg-bg">
        {isPending ? (
          <TableSkeleton />
        ) : isError ? (
          <ErrorBlock
            message={error?.message ?? 'Bilinmeyen hata'}
            onRetry={onRetry}
          />
        ) : items.length === 0 ? (
          <div className="p-12">
            <div className="mx-auto max-w-sm rounded-lg border border-dashed border-line bg-bg-2 p-8 text-center">
              <Building2 className="mx-auto h-6 w-6 text-ink-40" />
              <p className="mt-3 text-sm font-medium text-ink">
                Sonuç bulunamadı
              </p>
              <p className="mt-1 text-xs text-ink-60">
                Arama ve filtre koşullarını değiştirerek tekrar deneyin.
              </p>
            </div>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-bg-2 text-[11px] uppercase tracking-wider text-ink-40">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Tenant</th>
                <th className="px-4 py-3 text-left font-semibold">Plan</th>
                <th className="px-4 py-3 text-left font-semibold">Durum</th>
                <th className="px-4 py-3 text-right font-semibold">Çalışan</th>
                <th className="px-4 py-3 text-left font-semibold">
                  Oluşturulma
                </th>
                <th className="px-4 py-3 text-right font-semibold">Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {items.map((t) => (
                <TenantRow
                  key={t.id}
                  row={t}
                  onSuspend={() => onSuspend(t)}
                  onActivate={() => onActivate(t)}
                  onImpersonate={() => onImpersonate(t)}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {items.length > 0 && (
        <div className="flex items-center justify-between text-[12px] text-ink-60">
          <span>
            Sayfa {page} · {items.length} kayıt · Toplam{' '}
            {total.toLocaleString('tr-TR')}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              disabled={page <= 1 || isFetching}
              onClick={() => onPageChange(Math.max(1, page - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Önceki
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={!hasMore || isFetching}
              onClick={() => onPageChange(page + 1)}
            >
              Sonraki <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

function TableSkeleton() {
  return (
    <div className="divide-y divide-line">
      <div className="bg-bg-2 px-4 py-3">
        <div className="h-3 w-24 animate-pulse rounded bg-bg-3" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-4">
          <div className="h-4 w-1/3 animate-pulse rounded bg-bg-2" />
          <div className="h-4 w-16 animate-pulse rounded bg-bg-2" />
          <div className="h-5 w-20 animate-pulse rounded-full bg-bg-2" />
          <div className="ml-auto h-4 w-12 animate-pulse rounded bg-bg-2" />
        </div>
      ))}
    </div>
  );
}

function ErrorBlock({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 p-10 text-center">
      <AlertTriangle className="h-6 w-6 text-red" />
      <p className="text-sm font-medium text-ink">Tenant listesi yüklenemedi</p>
      <p className="max-w-md text-xs text-ink-60">{message}</p>
      <Button size="sm" variant="secondary" onClick={onRetry}>
        <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Tekrar dene
      </Button>
    </div>
  );
}
