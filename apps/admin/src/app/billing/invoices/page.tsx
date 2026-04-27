'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileText,
  Plus,
} from 'lucide-react';

import { AdminShell } from '@/components/AdminShell';
import { formatTRY } from '../page';

type InvoiceStatus = 'all' | 'draft' | 'issued' | 'paid' | 'overdue' | 'void' | 'refunded';

interface AdminInvoice {
  id: string;
  tenant_id: string;
  tenant_name: string;
  tenant_slug: string;
  invoice_no: string | null;
  period_start: string;
  period_end: string;
  subtotal_try: number;
  kdv_try: number;
  total_try: number;
  currency: string;
  status: string;
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
  pdf_url: string | null;
}

interface InvoicesResponse {
  items: AdminInvoice[];
  total: number;
  limit: number;
  offset: number;
}

const STATUS_OPTIONS: { value: InvoiceStatus; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'issued', label: 'Açık' },
  { value: 'paid', label: 'Ödenen' },
  { value: 'overdue', label: 'Geciken' },
  { value: 'void', label: 'İptal' },
  { value: 'refunded', label: 'İade' },
  { value: 'draft', label: 'Taslak' },
];

const STATUS_CLASS: Record<string, string> = {
  paid: 'bg-green-soft text-green',
  issued: 'bg-accent-soft text-accent',
  overdue: 'bg-red-soft text-red',
  draft: 'bg-bg-3 text-ink-60',
  void: 'bg-bg-3 text-ink-60',
  refunded: 'bg-amber-soft text-amber',
};

export default function InvoicesPage() {
  const [status, setStatus] = useState<InvoiceStatus>('all');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const pageSize = 25;

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (status !== 'all') {
      p.set('status', status);
    }
    if (from) {
      p.set('from', from);
    }
    if (to) {
      p.set('to', to);
    }
    p.set('limit', String(pageSize));
    p.set('offset', String((page - 1) * pageSize));
    return p.toString();
  }, [status, from, to, page]);

  const list = useQuery<InvoicesResponse>({
    queryKey: ['admin', 'billing', 'invoices', qs],
    queryFn: async () => {
      const res = await fetch(`/api/v1/admin/billing/invoices?${qs}`, { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return res.json();
    },
  });

  const totalPages = Math.max(1, Math.ceil((list.data?.total ?? 0) / pageSize));

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              href="/billing"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-40 hover:text-ink"
            >
              <ArrowLeft className="h-3 w-3" />
              Billing panosuna dön
            </Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Faturalar</h1>
            <p className="mt-1 text-sm text-ink-60">
              Tüm tenant'ların fatura kayıtları. Durum + tarih aralığı ile filtreleyebilirsin.
            </p>
          </div>
          <Link
            href="/billing/invoices/new"
            className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-[13px] font-semibold text-white hover:bg-accent/90"
          >
            <Plus className="h-4 w-4" />
            Manuel fatura
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex flex-col text-[11px] font-medium uppercase tracking-wider text-ink-40">
            Durum
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as InvoiceStatus);
                setPage(1);
              }}
              className="mt-1 h-10 rounded-md border border-line bg-bg px-2 text-sm"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-[11px] font-medium uppercase tracking-wider text-ink-40">
            Başlangıç
            <input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
              className="mt-1 h-10 rounded-md border border-line bg-bg px-2 text-sm"
            />
          </label>
          <label className="flex flex-col text-[11px] font-medium uppercase tracking-wider text-ink-40">
            Bitiş
            <input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              className="mt-1 h-10 rounded-md border border-line bg-bg px-2 text-sm"
            />
          </label>
          {(status !== 'all' || from || to) && (
            <button
              type="button"
              onClick={() => {
                setStatus('all');
                setFrom('');
                setTo('');
                setPage(1);
              }}
              className="h-10 rounded-md border border-line bg-bg px-3 text-[12px] font-medium text-ink-60 hover:border-accent"
            >
              Filtreleri temizle
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-line bg-bg">
          <table className="w-full text-sm">
            <thead className="bg-bg-2 text-[11px] uppercase tracking-wider text-ink-40">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Fatura no</th>
                <th className="px-4 py-3 text-left font-semibold">Tenant</th>
                <th className="px-4 py-3 text-left font-semibold">Dönem</th>
                <th className="px-4 py-3 text-right font-semibold">Ara toplam</th>
                <th className="px-4 py-3 text-right font-semibold">KDV</th>
                <th className="px-4 py-3 text-right font-semibold">Toplam</th>
                <th className="px-4 py-3 text-center font-semibold">Durum</th>
                <th className="px-4 py-3 text-right font-semibold">PDF</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {list.isLoading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={8} className="h-12 animate-pulse bg-bg-2/40" />
                  </tr>
                ))}
              {!list.isLoading && (list.data?.items ?? []).length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-ink-40">
                    Kayıt bulunamadı
                  </td>
                </tr>
              )}
              {(list.data?.items ?? []).map((inv) => (
                <tr key={inv.id} className="hover:bg-bg-2">
                  <td className="px-4 py-2 font-mono text-[11px] text-ink-60">
                    {inv.invoice_no ?? inv.id.slice(0, 8)}
                  </td>
                  <td className="px-4 py-2">
                    <p className="font-medium text-ink">{inv.tenant_name || '—'}</p>
                    <p className="font-mono text-[10px] text-ink-40">{inv.tenant_slug}</p>
                  </td>
                  <td className="px-4 py-2 tabular-nums text-ink-60">
                    {fmtDate(inv.period_start)} – {fmtDate(inv.period_end)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-ink-60">
                    {formatTRY(inv.subtotal_try)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums text-ink-60">
                    {formatTRY(inv.kdv_try)}
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums font-semibold text-ink">
                    {formatTRY(inv.total_try)}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <span
                      className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold ${
                        STATUS_CLASS[inv.status] ?? 'bg-bg-3 text-ink-60'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    {inv.pdf_url ? (
                      <a
                        href={inv.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded border border-line px-2 py-1 text-[11px] font-medium text-ink hover:border-accent"
                      >
                        <FileText className="h-3 w-3" />
                        PDF
                      </a>
                    ) : (
                      <span className="text-[11px] text-ink-40">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between text-[12px] text-ink-60">
          <span>
            {(list.data?.total ?? 0).toLocaleString('tr-TR')} kayıt · sayfa {page}/{totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-line bg-bg px-2 text-[12px] hover:border-accent disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Önceki
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-line bg-bg px-2 text-[12px] hover:border-accent disabled:opacity-40"
            >
              Sonraki
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function fmtDate(iso: string | null): string {
  if (!iso) {
    return '—';
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '—';
  }
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
