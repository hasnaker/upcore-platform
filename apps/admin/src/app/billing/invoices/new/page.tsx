'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Minus, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';

import { AdminShell } from '@/components/AdminShell';
import { formatTRY } from '../../page';
import { TenantAutocomplete } from '../../_components/TenantAutocomplete';

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
}

interface ManualInvoiceResponse {
  id: string;
  invoice_no: string | null;
  total_try: number;
  pdf_url: string | null;
}

const EMPTY_LINE: LineItem = { description: '', quantity: 1, unit_price: 0 };

export default function NewManualInvoicePage() {
  const router = useRouter();
  const [tenantId, setTenantId] = useState<string>('');
  const [tenantLabel, setTenantLabel] = useState<string>('');
  const [currency] = useState<string>('TRY');
  const [kdvRate, setKdvRate] = useState<number>(20);
  const [dueAt, setDueAt] = useState<string>(defaultDueDate());
  const [notes, setNotes] = useState<string>('');
  const [lines, setLines] = useState<LineItem[]>([EMPTY_LINE]);

  const totals = useMemo(() => {
    const subtotal = lines.reduce(
      (s, l) => s + Math.max(0, l.quantity) * Math.max(0, l.unit_price),
      0,
    );
    const kdv = subtotal * (kdvRate / 100);
    return {
      subtotal: round2(subtotal),
      kdv: round2(kdv),
      total: round2(subtotal + kdv),
    };
  }, [lines, kdvRate]);

  const mutation = useMutation<ManualInvoiceResponse, Error, void>({
    mutationFn: async () => {
      const res = await fetch('/api/v1/admin/billing/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          currency,
          kdv_rate: kdvRate / 100,
          due_at: new Date(`${dueAt}T00:00:00Z`).toISOString(),
          notes,
          line_items: lines.filter((l) => l.description.trim() && l.quantity > 0),
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string; error?: string };
        throw new Error(body.detail ?? body.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Fatura oluşturuldu · ${data.invoice_no ?? data.id.slice(0, 8)}`);
      router.push('/billing/invoices');
    },
    onError: (err) => toast.error(`Fatura oluşturulamadı: ${err.message}`),
  });

  const valid =
    !!tenantId &&
    lines.filter((l) => l.description.trim() && l.quantity > 0 && l.unit_price >= 0).length > 0;

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div>
          <Link
            href="/billing/invoices"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-ink-40 hover:text-ink"
          >
            <ArrowLeft className="h-3 w-3" />
            Faturalara dön
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
            Manuel fatura oluştur
          </h1>
          <p className="mt-1 text-sm text-ink-60">
            Tek seferlik, abonelik dışı kalemleri (pilot ücreti, danışmanlık, custom ETL) fatura
            olarak kayıt alır. KDV %20 varsayılan.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) {
              mutation.mutate();
            }
          }}
          className="grid gap-6 lg:grid-cols-[2fr_1fr]"
        >
          {/* Form */}
          <div className="flex flex-col gap-5 rounded-xl border border-line bg-bg p-5">
            <div>
              <label className="block text-[11px] font-medium uppercase tracking-wider text-ink-40">
                Tenant <span className="text-red">*</span>
              </label>
              <div className="mt-1.5">
                <TenantAutocomplete
                  value={tenantId}
                  label={tenantLabel}
                  onSelect={(id, label) => {
                    setTenantId(id);
                    setTenantLabel(label);
                  }}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="block text-[11px] font-medium uppercase tracking-wider text-ink-40">
                  Para birimi
                </span>
                <input
                  type="text"
                  value={currency}
                  disabled
                  className="mt-1.5 h-10 w-full rounded-md border border-line bg-bg-2 px-2 text-sm text-ink-60"
                />
              </label>
              <label className="block">
                <span className="block text-[11px] font-medium uppercase tracking-wider text-ink-40">
                  KDV (%)
                </span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={kdvRate}
                  onChange={(e) => setKdvRate(Number(e.target.value))}
                  className="mt-1.5 h-10 w-full rounded-md border border-line bg-bg px-2 text-sm"
                />
              </label>
              <label className="block">
                <span className="block text-[11px] font-medium uppercase tracking-wider text-ink-40">
                  Vade tarihi
                </span>
                <input
                  type="date"
                  value={dueAt}
                  onChange={(e) => setDueAt(e.target.value)}
                  className="mt-1.5 h-10 w-full rounded-md border border-line bg-bg px-2 text-sm"
                />
              </label>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-wider text-ink-40">
                  Kalemler
                </span>
                <button
                  type="button"
                  onClick={() => setLines((prev) => [...prev, { ...EMPTY_LINE }])}
                  className="inline-flex items-center gap-1 rounded-md border border-line bg-bg px-2 py-1 text-[11px] font-medium text-ink hover:border-accent"
                >
                  <Plus className="h-3 w-3" />
                  Kalem ekle
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {lines.map((line, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-[1fr_90px_110px_110px_32px] items-center gap-2 rounded-md border border-line bg-bg-2/40 p-2"
                  >
                    <input
                      type="text"
                      placeholder="Açıklama"
                      value={line.description}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l, idx) =>
                            idx === i ? { ...l, description: e.target.value } : l,
                          ),
                        )
                      }
                      className="h-9 w-full rounded-md border border-line bg-bg px-2 text-sm"
                    />
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      placeholder="Miktar"
                      value={line.quantity}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l, idx) =>
                            idx === i ? { ...l, quantity: Number(e.target.value) } : l,
                          ),
                        )
                      }
                      className="h-9 w-full rounded-md border border-line bg-bg px-2 text-right text-sm tabular-nums"
                    />
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      placeholder="Birim TL"
                      value={line.unit_price}
                      onChange={(e) =>
                        setLines((prev) =>
                          prev.map((l, idx) =>
                            idx === i ? { ...l, unit_price: Number(e.target.value) } : l,
                          ),
                        )
                      }
                      className="h-9 w-full rounded-md border border-line bg-bg px-2 text-right text-sm tabular-nums"
                    />
                    <span className="text-right text-sm tabular-nums text-ink-60">
                      {formatTRY(Math.max(0, line.quantity) * Math.max(0, line.unit_price))}
                    </span>
                    <button
                      type="button"
                      aria-label="Kalemi sil"
                      disabled={lines.length === 1}
                      onClick={() => setLines((prev) => prev.filter((_, idx) => idx !== i))}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-bg text-ink-40 hover:border-red hover:text-red disabled:opacity-40"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="block text-[11px] font-medium uppercase tracking-wider text-ink-40">
                Notlar
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Muhasebe referansı, PO numarası, vs."
                className="mt-1.5 w-full rounded-md border border-line bg-bg p-2 text-sm"
              />
            </label>
          </div>

          {/* Totals */}
          <aside className="flex flex-col gap-4">
            <div className="rounded-xl border border-line bg-bg p-5">
              <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">
                Özet
              </h2>
              <dl className="mt-3 flex flex-col gap-2 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-ink-60">Ara toplam</dt>
                  <dd className="tabular-nums text-ink">{formatTRY(totals.subtotal)}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-ink-60">KDV ({kdvRate}%)</dt>
                  <dd className="tabular-nums text-ink">{formatTRY(totals.kdv)}</dd>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
                  <dt className="text-[13px] font-semibold text-ink">Toplam</dt>
                  <dd className="tabular-nums text-[15px] font-bold text-ink">
                    {formatTRY(totals.total)}
                  </dd>
                </div>
              </dl>
              <button
                type="submit"
                disabled={!valid || mutation.isPending}
                className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-2.5 text-[13px] font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                {mutation.isPending ? 'Oluşturuluyor…' : 'Fatura oluştur'}
              </button>
            </div>
            <div className="rounded-xl border border-line bg-bg-2 p-4 text-[11px] text-ink-60">
              <p className="font-semibold text-ink">Ne zaman manuel fatura?</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                <li>Pilot / POC ücreti — abonelik dışı</li>
                <li>Özel kurulum, veri göçü, SSO konfigürasyonu</li>
                <li>Bir seferlik eğitim, danışmanlık</li>
                <li>Abonelik overage'ını kırılımlı olarak tekrar faturalama</li>
              </ul>
            </div>
          </aside>
        </form>
      </div>
    </AdminShell>
  );
}

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
