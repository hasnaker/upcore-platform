'use client';

import { useState } from 'react';
import { Bell, Clock, MessageSquare, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  hoursSinceAssigned,
  useAssignmentConsentHistory,
  useRemindConsent,
  type AssignmentStatus,
} from '@/hooks/useConsent';

interface BadgeProps {
  assignmentId: string;
  status: AssignmentStatus;
  acceptedAt?: string | null;
  assignedAt: string;
}

const BADGE_STYLE: Record<
  AssignmentStatus,
  { label: string; className: string }
> = {
  assigned: {
    label: 'Onay bekliyor',
    className: 'bg-amber-soft text-amber',
  },
  in_progress: {
    label: 'Onaylandı',
    className: 'bg-accent-soft text-accent',
  },
  completed: {
    label: 'Tamamlandı',
    className: 'bg-green-soft text-green',
  },
  declined: {
    label: 'Reddedildi',
    className: 'bg-red-soft text-red',
  },
  cancelled: {
    label: 'İptal',
    className: 'bg-bg-3 text-ink-60',
  },
  lapsed: {
    label: 'Süresi geçti',
    className: 'bg-bg-3 text-ink-60',
  },
};

/**
 * İK panelinde her assignment için consent durum rozeti.
 * - Onay bekliyor + 72 saat geçti → "Hatırlat" butonu
 * - Reddedildi  → tıklayınca drawer açar, ret gerekçesini gösterir
 */
export function AssignmentConsentBadge({
  assignmentId,
  status,
  acceptedAt,
  assignedAt,
}: BadgeProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const remind = useRemindConsent();

  const style = BADGE_STYLE[status];
  const hoursPending = hoursSinceAssigned(assignedAt);
  const canRemind = status === 'assigned' && !acceptedAt && hoursPending >= 72;

  const onRemind = async () => {
    try {
      await remind.mutateAsync({ assignmentId });
      toast.success('Hatırlatma gönderildi', {
        description: 'Çalışana yeniden onay e-postası iletildi.',
      });
    } catch (err) {
      toast.error('Gönderilemedi', {
        description: err instanceof Error ? err.message : 'Tekrar deneyin',
      });
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className={`inline-flex h-5 items-center rounded px-1.5 text-[10px] font-semibold ${style.className} hover:opacity-90`}
          title="Consent tarihçesi"
        >
          {style.label}
        </button>
        {status === 'assigned' && !acceptedAt && (
          <span className="text-[11px] text-ink-40" title={`${hoursPending} saat önce gönderildi`}>
            <Clock className="mr-0.5 inline h-3 w-3" />
            {hoursPending}s
          </span>
        )}
        {canRemind && (
          <button
            type="button"
            onClick={onRemind}
            disabled={remind.isPending}
            className="inline-flex h-5 items-center gap-0.5 rounded bg-accent-soft px-1.5 text-[10px] font-semibold text-accent hover:bg-accent/20 disabled:opacity-50"
          >
            <Bell className="h-3 w-3" />
            {remind.isPending ? 'Gönderiliyor…' : 'Hatırlat'}
          </button>
        )}
      </div>
      {drawerOpen && (
        <ConsentHistoryDrawer
          assignmentId={assignmentId}
          onClose={() => setDrawerOpen(false)}
        />
      )}
    </>
  );
}

function ConsentHistoryDrawer({
  assignmentId,
  onClose,
}: {
  assignmentId: string;
  onClose: () => void;
}) {
  const { data, isLoading } = useAssignmentConsentHistory(assignmentId);
  const items = data?.items ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/30"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex h-full w-full max-w-md flex-col overflow-hidden border-l border-line bg-bg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line p-5">
          <div>
            <h2 className="text-sm font-semibold text-ink">Consent Tarihçesi</h2>
            <p className="mt-0.5 text-[11px] text-ink-60">Append-only audit log</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-ink-40 hover:bg-bg-2 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading && (
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-md border border-line bg-bg-2"
                />
              ))}
            </div>
          )}
          {!isLoading && items.length === 0 && (
            <p className="rounded-md border border-line bg-bg-2 p-4 text-center text-[12px] text-ink-60">
              Henüz bir yanıt kaydedilmedi.
            </p>
          )}
          <div className="flex flex-col gap-3">
            {items.map((log) => (
              <div
                key={log.id}
                className="flex flex-col gap-1 rounded-md border border-line bg-bg p-3"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex h-5 items-center rounded px-1.5 text-[10px] font-semibold ${
                      log.action === 'granted'
                        ? 'bg-green-soft text-green'
                        : log.action === 'declined'
                          ? 'bg-red-soft text-red'
                          : 'bg-bg-3 text-ink-60'
                    }`}
                  >
                    {log.action === 'granted'
                      ? 'Kabul'
                      : log.action === 'declined'
                        ? 'Red'
                        : 'Geri çekme'}
                  </span>
                  <span className="text-[11px] text-ink-40">
                    {new Date(log.created_at).toLocaleString('tr-TR')}
                  </span>
                </div>
                {log.reason && (
                  <div className="flex items-start gap-1 text-[12px] text-ink-80">
                    <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-ink-40" />
                    <span>{log.reason}</span>
                  </div>
                )}
                <div className="mt-1 grid grid-cols-2 gap-2 text-[10px] text-ink-40">
                  <span>IP: {log.actor_ip || '—'}</span>
                  <span className="truncate" title={log.user_agent}>
                    UA: {log.user_agent ? log.user_agent.slice(0, 28) : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
