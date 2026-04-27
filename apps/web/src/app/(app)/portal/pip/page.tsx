'use client';

/**
 * /portal/pip — Çalışanın kendi PIP dosyasının salt okunur görünümü.
 *
 * Haftalık check-in'leri acknowledge edebilir (IP + UA + zaman damgası kaydı).
 * Geri kalan veri salt okunurdur.
 */

import { useMemo } from 'react';
import { toast } from 'sonner';
import {
  useMyPipCases,
  useAcknowledgePipCheckin,
  PIP_STATUS_LABEL_TR,
  PIP_REASON_LABEL_TR,
  PIP_PRIORITY_LABEL_TR,
  PIP_TRACK_LABEL_TR,
  isPipClosed,
  isPipActive,
  type PipStatus,
  type PipCase,
  type PipCheckin,
} from '@/hooks/usePip';

const STATUS_COLORS: Record<PipStatus, { bg: string; fg: string }> = {
  draft: { bg: '#F5F5F5', fg: '#525252' },
  pending_legal: { bg: '#FEF3C7', fg: '#B45309' },
  active: { bg: '#DBEAFE', fg: '#1D4ED8' },
  extended: { bg: '#E0E7FF', fg: '#4338CA' },
  passed: { bg: '#D1FAE5', fg: '#047857' },
  terminated: { bg: '#FEE2E2', fg: '#B91C1C' },
};

export default function PortalPipPage() {
  const { data, isLoading, isError, error, refetch } = useMyPipCases();

  const items = useMemo(() => data?.items ?? [], [data?.items]);
  const activeOrPending = items.filter(
    (c) => !isPipClosed(c.status) || (c.status === 'passed' || c.status === 'terminated'),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111]">Performans Dosyam</h1>
        <p className="mt-1 text-sm text-[#888]">
          Kendi performans iyileştirme sürecinizin salt-okunur görünümü. Haftalık check-in
          kayıtlarını onaylayabilirsiniz.
        </p>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-[120px] animate-pulse rounded-xl border border-[#EDEDED] bg-[#FAFAFA]"
            />
          ))}
        </div>
      )}

      {isError && (
        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]">
          <div className="font-semibold">Dosya yüklenemedi</div>
          <div className="mt-1 text-xs">
            {error instanceof Error ? error.message : 'Sunucu yanıt vermedi.'}
          </div>
          <button
            onClick={() => refetch()}
            className="mt-2 rounded-md border border-[#FECACA] bg-white px-3 py-1.5 text-xs font-semibold"
          >
            Tekrar dene
          </button>
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#D4D4D4] bg-[#FAFAFA] px-6 py-14 text-center">
          <div className="text-lg font-semibold text-[#111]">Aktif PIP dosyanız yok</div>
          <p className="text-sm text-[#888]">
            Adınıza açılmış bir Performans İyileştirme Planı bulunmuyor.
          </p>
        </div>
      )}

      {!isLoading && !isError && activeOrPending.length > 0 &&
        activeOrPending.map((c) => (
          <PipCardReadOnly key={c.id} pipCase={c} onChanged={() => refetch()} />
        ))}
    </div>
  );
}

function PipCardReadOnly({
  pipCase,
  onChanged,
}: {
  pipCase: PipCase;
  onChanged: () => void;
}) {
  const colors = STATUS_COLORS[pipCase.status];
  const startDate = new Date(pipCase.start_date).toLocaleDateString('tr-TR');
  const end = new Date(pipCase.start_date);
  end.setDate(end.getDate() + pipCase.duration_days);
  const endDate = end.toLocaleDateString('tr-TR');

  return (
    <div
      data-testid="portal-pip-card"
      className="rounded-xl border border-[#EDEDED] bg-white p-5"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold text-[#111]">
            Dosya {pipCase.id.slice(0, 8)} · {PIP_REASON_LABEL_TR[pipCase.reason_category]}
          </div>
          <div className="mt-0.5 text-xs text-[#525252]">
            {startDate} → {endDate} · {pipCase.duration_days} gün
          </div>
        </div>
        <span
          className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
          style={{ background: colors.bg, color: colors.fg }}
        >
          {PIP_STATUS_LABEL_TR[pipCase.status]}
        </span>
      </div>

      <div className="mt-4 rounded-md bg-[#FAFAFA] p-3">
        <div className="text-xs font-semibold text-[#525252]">Olgusal Özet</div>
        <p className="mt-1 whitespace-pre-wrap text-sm text-[#111]">{pipCase.reason_summary}</p>
      </div>

      {(pipCase.goals ?? []).length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold text-[#525252]">İyileştirme Hedefleri</div>
          <div className="mt-2 flex flex-col gap-2">
            {(pipCase.goals ?? []).map((g) => (
              <div
                key={g.id}
                className="rounded-md border border-[#EDEDED] bg-[#FAFAFA] p-3 text-sm"
              >
                <div className="font-medium text-[#111]">{g.description}</div>
                <div className="mt-1 text-xs text-[#525252]">
                  Ölçüt: {g.measurable_target} · Son: {new Date(g.deadline).toLocaleDateString('tr-TR')} · Öncelik:{' '}
                  {PIP_PRIORITY_LABEL_TR[g.priority]}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(pipCase.checkins ?? []).length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold text-[#525252]">Haftalık Takip</div>
          <div className="mt-2 flex flex-col gap-2">
            {(pipCase.checkins ?? []).map((k) => (
              <CheckinCard
                key={k.id}
                checkin={k}
                caseId={pipCase.id}
                locked={!isPipActive(pipCase.status)}
                onChanged={onChanged}
              />
            ))}
          </div>
        </div>
      )}

      {pipCase.outcome && (
        <div className="mt-4 rounded-md bg-[#FAFAFA] p-3">
          <div className="text-xs font-semibold text-[#525252]">Sonuç</div>
          <div className="mt-1 text-sm">
            {PIP_STATUS_LABEL_TR[pipCase.status]}
            {pipCase.outcome.outcome_notes && (
              <div className="mt-1 text-xs text-[#525252]">{pipCase.outcome.outcome_notes}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CheckinCard({
  checkin,
  caseId,
  locked,
  onChanged,
}: {
  checkin: PipCheckin;
  caseId: string;
  locked: boolean;
  onChanged: () => void;
}) {
  const ack = useAcknowledgePipCheckin(caseId);
  const canAck = !checkin.acknowledged_by_employee && !locked;

  return (
    <div
      data-testid="portal-checkin-item"
      className="rounded-md border border-[#EDEDED] bg-[#FAFAFA] p-3 text-sm"
    >
      <div className="flex items-center justify-between">
        <div className="font-medium text-[#111]">Hafta {checkin.week_number}</div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
            checkin.on_track === 'on_track'
              ? 'bg-[#D1FAE5] text-[#047857]'
              : 'bg-[#FEF3C7] text-[#B45309]'
          }`}
        >
          {PIP_TRACK_LABEL_TR[checkin.on_track]}
        </span>
      </div>
      {checkin.manager_notes && (
        <div className="mt-1 text-xs text-[#525252]">Yönetici: {checkin.manager_notes}</div>
      )}
      <div className="mt-2 flex items-center justify-between">
        <div className="text-[10px] text-[#888]">
          {checkin.acknowledged_by_employee
            ? `Onay: ${new Date(checkin.acknowledged_by_employee).toLocaleString('tr-TR')}`
            : 'Onay bekliyor'}
        </div>
        {canAck && (
          <button
            onClick={async () => {
              try {
                await ack.mutateAsync({ checkinId: checkin.id });
                toast.success('Onay kaydedildi.');
                onChanged();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Onay başarısız');
              }
            }}
            disabled={ack.isPending}
            className="rounded-md bg-[#5E5CE6] px-3 py-1 text-[10px] font-semibold text-white hover:bg-[#4F4DD1] disabled:opacity-50"
            data-testid="ack-checkin-btn"
          >
            Okudum, onaylıyorum
          </button>
        )}
      </div>
    </div>
  );
}
