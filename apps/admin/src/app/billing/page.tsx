'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Plus,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';

import { AdminShell } from '@/components/AdminShell';
import { MRRTrendChart, PlanDistributionPie } from './_components/Charts';
import { ChurnRiskTable } from './_components/ChurnRiskTable';
import { StripePortalDialog } from './_components/StripePortalDialog';

interface PlanCount {
  plan_id: string;
  plan_code: string;
  plan_name: string;
  monthly_price_try: number;
  subscriptions: number;
  mrr_contribution_try: number;
}

interface MRRTrendPoint {
  month: string;
  mrr_try: number;
  active_subscriptions: number;
}

interface BillingSummary {
  as_of: string;
  mrr_try: number;
  arr_try: number;
  active_subscriptions: number;
  total_tenants: number;
  plan_distribution: PlanCount[];
  trend_12m: MRRTrendPoint[];
}

interface ChurnRiskRow {
  tenant_id: string;
  tenant_name: string;
  score: number;
  usage_drop_3m_pct: number;
  payment_late_count: number;
  open_tickets: number;
}

interface ChurnResponse {
  enabled: boolean;
  items: ChurnRiskRow[];
}

export default function AdminBillingDashboard() {
  const [portalOpen, setPortalOpen] = useState(false);

  const summary = useQuery<BillingSummary>({
    queryKey: ['admin', 'billing', 'summary'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/billing/summary', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      return res.json();
    },
  });

  const churn = useQuery<ChurnResponse>({
    queryKey: ['admin', 'billing', 'churn-risk'],
    queryFn: async () => {
      const res = await fetch('/api/v1/admin/billing/churn-risk', { cache: 'no-store' });
      if (!res.ok) {
        return { enabled: false, items: [] };
      }
      return res.json();
    },
  });

  const openPortal = useMutation<{ url: string }, Error, { tenantId: string }>({
    mutationFn: async ({ tenantId }) => {
      const res = await fetch('/api/v1/admin/billing/stripe-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          return_url:
            typeof window !== 'undefined'
              ? `${window.location.origin}/billing`
              : 'https://admin.upcore.io/billing',
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string; error?: string };
        throw new Error(body.detail ?? body.error ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (typeof window !== 'undefined') {
        window.open(data.url, '_blank', 'noopener,noreferrer');
      }
      toast.success('Stripe portalı yeni sekmede açıldı');
      setPortalOpen(false);
    },
    onError: (err) => toast.error(`Portal açılamadı: ${err.message}`),
  });

  const totalMRR = summary.data?.mrr_try ?? 0;
  const totalARR = summary.data?.arr_try ?? 0;
  const totalSubs = summary.data?.active_subscriptions ?? 0;
  const totalTenants = summary.data?.total_tenants ?? 0;
  const trend = useMemo(() => summary.data?.trend_12m ?? [], [summary.data?.trend_12m]);
  const plans = summary.data?.plan_distribution ?? [];

  const mom = useMemo(() => {
    if (trend.length < 2) {
      return null;
    }
    const last = trend[trend.length - 1];
    const prev = trend[trend.length - 2];
    if (!last || !prev || prev.mrr_try === 0) {
      return null;
    }
    return ((last.mrr_try - prev.mrr_try) / prev.mrr_try) * 100;
  }, [trend]);

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">Billing</h1>
            <p className="mt-1 text-sm text-ink-60">
              Platform MRR, plan dağılımı, abonelik trendi ve Stripe portal erişimi.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPortalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-bg px-3 py-2 text-[13px] font-medium text-ink hover:border-accent"
            >
              <ExternalLink className="h-4 w-4" />
              Stripe Portalı aç
            </button>
            <Link
              href="/billing/invoices/new"
              className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-2 text-[13px] font-semibold text-white hover:bg-accent/90"
            >
              <Plus className="h-4 w-4" />
              Manuel fatura
            </Link>
            <Link
              href="/billing/invoices"
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-bg px-3 py-2 text-[13px] font-medium text-ink hover:border-accent"
            >
              Faturalar
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {summary.isError && (
          <div className="flex items-start gap-2 rounded-md border border-red/30 bg-red-soft p-3 text-[12px] text-red">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5" />
            <span>
              Billing özeti yüklenemedi: <span className="font-mono">{String(summary.error)}</span>
            </span>
          </div>
        )}

        {/* KPI cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            icon={<Wallet className="h-3.5 w-3.5" />}
            label="MRR"
            value={summary.isLoading ? '…' : formatTRY(totalMRR)}
            trend={mom != null ? `${mom >= 0 ? '+' : ''}${mom.toFixed(1)}% MoM` : '—'}
            tone="green"
          />
          <KpiCard
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            label="ARR"
            value={summary.isLoading ? '…' : formatTRY(totalARR)}
            trend="MRR × 12"
            tone="accent"
          />
          <KpiCard
            icon={<Users className="h-3.5 w-3.5" />}
            label="Aktif abonelik"
            value={summary.isLoading ? '…' : String(totalSubs)}
            trend={`${totalTenants} tenant`}
            tone="accent"
          />
          <KpiCard
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            label="Plan tier"
            value={summary.isLoading ? '…' : String(plans.length)}
            trend="Aktif plan çeşidi"
            tone="accent"
          />
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <section className="rounded-xl border border-line bg-bg p-5">
            <header className="mb-4 flex items-center justify-between">
              <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">
                Son 12 ay MRR trendi
              </h2>
              <BarChart3 className="h-4 w-4 text-ink-40" />
            </header>
            {summary.isLoading ? (
              <div className="h-56 animate-pulse rounded-md bg-bg-2" />
            ) : trend.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-40">Veri yok</p>
            ) : (
              <MRRTrendChart data={trend} />
            )}
          </section>
          <section className="rounded-xl border border-line bg-bg p-5">
            <header className="mb-4">
              <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">
                Plan dağılımı
              </h2>
            </header>
            {summary.isLoading ? (
              <div className="h-56 animate-pulse rounded-md bg-bg-2" />
            ) : plans.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-40">Aktif plan yok</p>
            ) : (
              <PlanDistributionPie data={plans} />
            )}
          </section>
        </div>

        {/* Plan breakdown table */}
        <section className="overflow-hidden rounded-xl border border-line bg-bg">
          <header className="border-b border-line px-5 py-3">
            <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">
              Plan kırılımı
            </h2>
          </header>
          <table className="w-full text-sm">
            <thead className="bg-bg-2 text-[11px] uppercase tracking-wider text-ink-40">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Plan</th>
                <th className="px-4 py-2 text-right font-semibold">Aylık ücret</th>
                <th className="px-4 py-2 text-right font-semibold">Abonelik</th>
                <th className="px-4 py-2 text-right font-semibold">MRR katkısı</th>
                <th className="px-4 py-2 text-right font-semibold">Pay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {plans.map((p) => {
                const share = totalMRR > 0 ? (p.mrr_contribution_try / totalMRR) * 100 : 0;
                return (
                  <tr key={p.plan_id} className="hover:bg-bg-2">
                    <td className="px-4 py-2">
                      <span className="font-medium text-ink">{p.plan_name}</span>
                      <span className="ml-2 rounded bg-bg-3 px-1.5 py-0.5 font-mono text-[10px] uppercase text-ink-60">
                        {p.plan_code}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-ink-60">
                      {formatTRY(p.monthly_price_try)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-ink">
                      {p.subscriptions}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums font-semibold text-ink">
                      {formatTRY(p.mrr_contribution_try)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-ink-60">
                      {share.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
              {plans.length === 0 && !summary.isLoading && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-ink-40">
                    Plan bulunamadı
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Churn risk (feature-flag gated) */}
        {churn.data?.enabled && (
          <section className="overflow-hidden rounded-xl border border-line bg-bg">
            <header className="flex items-center justify-between border-b border-line px-5 py-3">
              <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">
                Churn riski (beta)
              </h2>
              <span className="rounded bg-amber-soft px-2 py-0.5 text-[10px] font-medium text-amber">
                admin_billing_churn_risk
              </span>
            </header>
            <ChurnRiskTable rows={churn.data.items} loading={churn.isLoading} />
          </section>
        )}

        <StripePortalDialog
          open={portalOpen}
          onClose={() => setPortalOpen(false)}
          onSubmit={(tenantId) => openPortal.mutate({ tenantId })}
          busy={openPortal.isPending}
        />
      </div>
    </AdminShell>
  );
}

function KpiCard({
  icon,
  label,
  value,
  trend,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  trend: string;
  tone: 'green' | 'accent' | 'amber';
}) {
  const toneClass =
    tone === 'green' ? 'text-green' : tone === 'amber' ? 'text-amber' : 'text-accent';
  return (
    <div className="rounded-xl border border-line bg-bg p-5">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-ink-40">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      <p className={`mt-1 text-[11px] ${toneClass}`}>{trend}</p>
    </div>
  );
}

export function formatTRY(v: number): string {
  if (Math.abs(v) >= 1_000_000) {
    return `₺ ${(v / 1_000_000).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}M`;
  }
  if (Math.abs(v) >= 1_000) {
    return `₺ ${(v / 1_000).toLocaleString('tr-TR', { maximumFractionDigits: 1 })}K`;
  }
  return `₺ ${v.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}`;
}
