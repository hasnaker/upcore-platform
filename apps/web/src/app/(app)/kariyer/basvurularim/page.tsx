'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { Briefcase, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';

import { useAuthMe } from '@/hooks/useAuthMe';
import {
  useMyApplications,
  useWithdrawApplication,
  type ApplicationStatus,
} from '@/hooks/useMobility';

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

const STATUS_CLASS: Record<ApplicationStatus, string> = {
  applied: 'bg-accent-soft text-accent',
  under_review: 'bg-accent-soft text-accent',
  shortlisted: 'bg-accent-soft text-accent',
  interview: 'bg-amber-soft text-amber',
  offered: 'bg-green-soft text-green',
  accepted: 'bg-green-soft text-green',
  rejected: 'bg-red-soft text-red',
  withdrawn: 'bg-ink-10 text-ink-60',
};

export default function MyApplicationsPage() {
  const me = useAuthMe();
  const myId = me.data?.id ?? null;
  const q = useMyApplications(myId);
  const withdrawMut = useWithdrawApplication();

  if (me.isLoading || q.isLoading) {
    return <div className="h-48 animate-pulse rounded-xl border border-line bg-bg" />;
  }

  const items = q.data?.items ?? [];

  return (
    <div className="flex flex-col gap-6" data-testid="my-applications-page">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Başvurularım</h1>
          <p className="mt-1 text-sm text-ink-60">
            Dahili kariyer marketplace'teki başvurularınız. Henüz işleme alınmamış başvuruları
            geri çekebilirsiniz.
          </p>
        </div>
        <Link
          href="/kariyer/marketplace"
          className="rounded-md border border-line bg-bg px-3 py-1.5 text-[12px] font-medium text-ink-60 hover:border-ink-20"
        >
          Marketplace
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-line bg-bg p-10 text-center text-sm text-ink-60">
          <Briefcase className="mx-auto mb-3 h-6 w-6 text-ink-40" />
          Henüz bir başvurunuz yok. Marketplace'ten açık ilanları keşfedin.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-bg">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-bg-2 text-[11px] uppercase tracking-wider text-ink-40">
              <tr>
                <th className="px-3 py-2 text-left">İlan</th>
                <th className="px-3 py-2 text-left">Başvuru Tarihi</th>
                <th className="px-3 py-2 text-left">Eşleşme</th>
                <th className="px-3 py-2 text-left">Durum</th>
                <th className="px-3 py-2 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => {
                const pct = a.match_score != null ? Math.round(a.match_score * 100) : null;
                return (
                  <tr key={a.id} className="border-t border-line" data-testid={`application-row-${a.id}`}>
                    <td className="px-3 py-2">
                      <Link
                        href={`/kariyer/marketplace/${a.opportunity_id}`}
                        className="text-ink underline decoration-ink-20 hover:decoration-ink"
                      >
                        {a.opportunity_id.slice(0, 8)}…
                      </Link>
                      {a.confidential ? (
                        <span className="ml-2 rounded bg-bg-2 px-1.5 text-[10px] text-ink-40">gizli</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-ink-60">
                      {new Date(a.applied_at).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-3 py-2">
                      {pct != null ? (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            pct >= 70
                              ? 'bg-green-soft text-green'
                              : pct >= 40
                                ? 'bg-amber-soft text-amber'
                                : 'bg-red-soft text-red'
                          }`}
                        >
                          %{pct}
                        </span>
                      ) : (
                        <span className="text-ink-40">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        data-testid={`application-status-${a.id}`}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[a.status]}`}
                      >
                        {a.status === 'accepted' ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : a.status === 'rejected' || a.status === 'withdrawn' ? (
                          <XCircle className="h-3 w-3" />
                        ) : null}
                        {STATUS_LABELS[a.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right">
                      {a.status === 'applied' ? (
                        <button
                          type="button"
                          data-testid={`withdraw-${a.id}`}
                          onClick={() =>
                            withdrawMut.mutate(
                              { applicationId: a.id },
                              {
                                onSuccess: () => toast.success('Başvuru geri çekildi'),
                                onError: (err) => toast.error(`Geri çekilemedi: ${err.message}`),
                              },
                            )
                          }
                          disabled={withdrawMut.isPending}
                          className="inline-flex items-center gap-1 rounded-md border border-line bg-bg px-2.5 py-1 text-[11px] font-medium text-ink-60 hover:border-red/40 hover:text-red disabled:opacity-50"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Geri çek
                        </button>
                      ) : (
                        <span className="text-[11px] text-ink-40">—</span>
                      )}
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
