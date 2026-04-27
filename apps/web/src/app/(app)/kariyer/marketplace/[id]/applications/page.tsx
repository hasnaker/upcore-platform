'use client';

import { useMemo, useState, use } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

import { useAuthMe } from '@/hooks/useAuthMe';
import {
  useOpportunityDetail,
  useOpportunityApplications,
  useUpdateApplicationStatus,
  fitBadgeVariant,
  type ApplicationStatus,
} from '@/hooks/useMobility';

type Props = { params: Promise<{ id: string }> };

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: 'Gönderildi',
  under_review: 'İncelemede',
  shortlisted: 'Kısa liste',
  interview: 'Görüşmede',
  offered: 'Teklif yapıldı',
  accepted: 'Kabul edildi',
  rejected: 'Reddedildi',
  withdrawn: 'Geri çekildi',
};

const HR_ROLES = new Set(['hr', 'hr_admin', 'admin', 'owner', 'it_admin']);

// Only statuses HR is allowed to transition into (the backend enforces this too).
const HR_STATUS_OPTIONS: ApplicationStatus[] = [
  'under_review',
  'shortlisted',
  'interview',
  'offered',
  'accepted',
  'rejected',
];

export default function OpportunityApplicationsPage({ params }: Props) {
  const { id } = use(params);
  const me = useAuthMe();

  const isHR = useMemo(
    () => (me.data?.roles ?? []).some((r) => HR_ROLES.has(r.toLowerCase())),
    [me.data?.roles],
  );

  const oppQ = useOpportunityDetail(id);
  const appsQ = useOpportunityApplications(id);
  const updateStatus = useUpdateApplicationStatus();

  const [minFit, setMinFit] = useState(0);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('all');

  if (me.isLoading || oppQ.isLoading || appsQ.isLoading) {
    return <div className="h-48 animate-pulse rounded-xl border border-line bg-bg" />;
  }

  if (!isHR) {
    return (
      <div className="rounded-xl border border-red/30 bg-red-soft p-6 text-sm text-red">
        Bu sayfa İK yetkilileri içindir.
        <Link href="/kariyer/marketplace" className="ml-2 underline">
          Marketplace'e dön
        </Link>
      </div>
    );
  }

  if (oppQ.error) {
    return (
      <div className="rounded-xl border border-red/30 bg-red-soft p-6 text-sm text-red">
        Pozisyon yüklenemedi. {oppQ.error.message}
      </div>
    );
  }

  if (appsQ.error) {
    return (
      <div className="rounded-xl border border-red/30 bg-red-soft p-6 text-sm text-red">
        Başvurular okunamadı. {appsQ.error.message}
      </div>
    );
  }

  const items = appsQ.data?.items ?? [];
  const filtered = items.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    const score = a.match_score ?? 0;
    if (score < minFit) return false;
    return true;
  });

  const handleStatus = (appId: string, status: ApplicationStatus) => {
    updateStatus.mutate(
      { applicationId: appId, status, opportunityId: id },
      {
        onSuccess: () => toast.success(`Durum güncellendi: ${STATUS_LABELS[status]}`),
        onError: (err) => toast.error(`Güncellenemedi: ${err.message}`),
      },
    );
  };

  return (
    <div className="flex flex-col gap-6" data-testid="hr-applications-page">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href={`/kariyer/marketplace/${id}`} className="text-[12px] text-ink-40 hover:underline">
            ← Pozisyon detayı
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-ink">
            {oppQ.data?.title ?? 'Pozisyon'} — Başvurular
          </h1>
          <p className="mt-1 text-sm text-ink-60">
            JD-R uyum skoruna göre sıralanmış başvurular. Gizli başvurular görüşme aşamasına alınmadan
            kimlik açıklanmaz.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-bg p-3">
        <label className="flex items-center gap-2 text-[12px] text-ink-60">
          Durum:
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ApplicationStatus | 'all')}
            className="rounded-md border border-line bg-bg px-2 py-1 text-[12px]"
            data-testid="filter-status"
          >
            <option value="all">Tümü</option>
            {(Object.keys(STATUS_LABELS) as ApplicationStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-[12px] text-ink-60">
          Min. uyum:
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={minFit}
            onChange={(e) => setMinFit(Number(e.target.value))}
            className="w-32"
            data-testid="filter-min-fit"
          />
          <span className="w-10 text-right font-medium text-ink-80">%{Math.round(minFit * 100)}</span>
        </label>
        <div className="ml-auto text-[12px] text-ink-40">
          {filtered.length} / {items.length} başvuru
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-line bg-bg p-10 text-center text-sm text-ink-60">
          Filtrelerle eşleşen başvuru yok.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-bg">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-bg-2 text-[11px] uppercase tracking-wider text-ink-40">
              <tr>
                <th className="px-3 py-2 text-left">Aday</th>
                <th className="px-3 py-2 text-left">JD-R Uyum</th>
                <th className="px-3 py-2 text-left">Başvuru</th>
                <th className="px-3 py-2 text-left">Motivasyon</th>
                <th className="px-3 py-2 text-left">Durum</th>
                <th className="px-3 py-2 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => {
                const pct = a.match_score != null ? Math.round(a.match_score * 100) : null;
                const variant = a.match_score != null ? fitBadgeVariant(a.match_score) : 'red';
                const fitCls =
                  variant === 'green'
                    ? 'bg-green-soft text-green'
                    : variant === 'amber'
                      ? 'bg-amber-soft text-amber'
                      : 'bg-red-soft text-red';
                return (
                  <tr key={a.id} className="border-t border-line" data-testid={`hr-app-row-${a.id}`}>
                    <td className="px-3 py-2">
                      {a.applicant_alias ? (
                        <span className="font-mono text-[12px] text-ink-60" data-testid="applicant-alias">
                          {a.applicant_alias}
                        </span>
                      ) : (
                        <span className="font-mono text-[12px] text-ink" data-testid="applicant-id">
                          {a.employee_id?.slice(0, 8)}…
                        </span>
                      )}
                      {a.confidential ? (
                        <span className="ml-2 rounded bg-bg-2 px-1.5 text-[10px] text-ink-40">gizli</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      {pct != null ? (
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${fitCls}`}>
                          %{pct}
                        </span>
                      ) : (
                        <span className="text-ink-40">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-ink-60">
                      {new Date(a.applied_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-3 py-2 text-ink-80">
                      {a.cover_note ? (
                        <span className="line-clamp-2 block max-w-xs">{a.cover_note}</span>
                      ) : (
                        <span className="text-ink-40">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-bg-2 px-2 py-0.5 text-[11px] font-medium text-ink-60"
                        data-testid={`hr-status-${a.id}`}
                      >
                        {STATUS_LABELS[a.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <select
                        data-testid={`status-select-${a.id}`}
                        value=""
                        onChange={(e) => {
                          const v = e.target.value as ApplicationStatus;
                          if (v) handleStatus(a.id, v);
                        }}
                        disabled={updateStatus.isPending || a.status === 'accepted' || a.status === 'rejected' || a.status === 'withdrawn'}
                        className="rounded-md border border-line bg-bg px-2 py-1 text-[11px] text-ink-80"
                      >
                        <option value="">Durum değiştir…</option>
                        {HR_STATUS_OPTIONS.filter((s) => s !== a.status).map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
