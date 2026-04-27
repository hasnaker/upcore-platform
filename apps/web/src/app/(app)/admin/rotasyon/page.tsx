'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Repeat,
  ShieldAlert,
  UserCheck,
  Users,
  XCircle,
} from 'lucide-react';

import { useAuthMe } from '@/hooks/useAuthMe';
import {
  useApproveRotation,
  useCompleteRotation,
  usePendingRotations,
  useRejectRotation,
  type RotationPendingRole,
  type RotationRow,
} from '@/hooks/useMobility';

const ROLE_LABELS: Record<RotationPendingRole, string> = {
  current_manager: 'Mevcut Yönetici',
  target_manager: 'Hedef Yönetici',
  hr: 'İK',
};

const ROLE_DESCRIPTIONS: Record<RotationPendingRole, string> = {
  current_manager:
    'Ekibinizden rotasyon talep eden çalışanlar. İlk onay adımı — kararınızdan sonra hedef yöneticiye geçer.',
  target_manager:
    'Sizin departmanınıza gelmek isteyen çalışanlar. Mevcut yönetici onayının ardından karar verin.',
  hr: 'Her iki yönetici onayından geçmiş, İK son onayını bekleyen rotasyonlar.',
};

const HR_ROLES = new Set(['hr', 'hr_admin', 'hr_director', 'admin', 'owner']);
const MANAGER_ROLES = new Set(['manager', 'team_lead']);

type Tab = RotationPendingRole;

export default function AdminRotasyonPage() {
  const me = useAuthMe();
  const roles = (me.data?.roles ?? []).map((r) => r.toLowerCase());

  const isHR = roles.some((r) => HR_ROLES.has(r));
  const isManager = roles.some((r) => MANAGER_ROLES.has(r));

  // Default tab — HR users land on HR queue, managers on current_manager.
  const defaultTab: Tab = isHR ? 'hr' : isManager ? 'current_manager' : 'current_manager';
  const [tab, setTab] = useState<Tab>(defaultTab);

  if (me.isLoading) {
    return <div className="h-48 animate-pulse rounded-xl border border-line bg-bg" />;
  }

  if (!isHR && !isManager) {
    return (
      <div className="rounded-xl border border-red/30 bg-red-soft p-6 text-sm text-red">
        Bu sayfa yalnızca yöneticiler ve İK içindir.
        <Link href="/kariyer" className="ml-2 underline">
          Kariyer paneline dön
        </Link>
      </div>
    );
  }

  const availableTabs: Tab[] = [];
  if (isManager || isHR) {
    availableTabs.push('current_manager', 'target_manager');
  }
  if (isHR) availableTabs.push('hr');

  return (
    <div className="flex flex-col gap-6" data-testid="admin-rotasyon-page">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-ink">
            <Repeat className="h-5 w-5 text-accent" />
            Rotasyon Onayları
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-60">
            Çalışanlardan gelen iç rotasyon talepleri. Onay zinciri: mevcut yönetici → hedef
            yönetici → İK. Hedef yönetici, mevcut yönetici onayı olmadan onaylayamaz.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-bg-2 p-1">
        {availableTabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            data-testid={`admin-tab-${t}`}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
              tab === t ? 'bg-bg text-ink shadow-sm' : 'text-ink-60 hover:text-ink'
            }`}
          >
            {t === 'current_manager' && <UserCheck className="h-4 w-4" />}
            {t === 'target_manager' && <Users className="h-4 w-4" />}
            {t === 'hr' && <ShieldAlert className="h-4 w-4" />}
            {ROLE_LABELS[t]}
          </button>
        ))}
      </div>

      <p className="text-[12px] text-ink-60">{ROLE_DESCRIPTIONS[tab]}</p>

      <PendingQueue role={tab} canComplete={isHR} />
    </div>
  );
}

/* ─── Pending Queue ─── */

function PendingQueue({ role, canComplete }: { role: RotationPendingRole; canComplete: boolean }) {
  const query = usePendingRotations(role);

  if (query.isLoading) {
    return <div className="h-48 animate-pulse rounded-xl border border-line bg-bg" />;
  }

  if (query.error) {
    return (
      <div className="rounded-xl border border-red/30 bg-red-soft p-4 text-sm text-red">
        Liste yüklenemedi. {query.error.message}
      </div>
    );
  }

  const items = query.data?.rotations ?? [];
  if (items.length === 0) {
    return (
      <div
        data-testid="admin-empty"
        className="rounded-xl border border-line bg-bg p-10 text-center text-sm text-ink-60"
      >
        Bu listede onay bekleyen rotasyon yok.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3" data-testid="admin-pending-list">
      {items.map((r) => (
        <RotationCard key={r.id} rotation={r} role={role} canComplete={canComplete} />
      ))}
    </div>
  );
}

/* ─── Card ─── */

function RotationCard({
  rotation,
  role,
  canComplete,
}: {
  rotation: RotationRow;
  role: RotationPendingRole;
  canComplete: boolean;
}) {
  const approveMut = useApproveRotation();
  const rejectMut = useRejectRotation();
  const completeMut = useCompleteRotation();
  const [expanded, setExpanded] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const timeline = useMemo(() => buildTimeline(rotation), [rotation]);

  const handleApprove = () => {
    approveMut.mutate(
      { id: rotation.id },
      {
        onSuccess: () => toast.success(`Rotasyon onaylandı (${ROLE_LABELS[role]})`),
        onError: (err) => toast.error(`Onaylanamadı: ${friendlyErr(err.message)}`),
      },
    );
  };

  const handleReject = () => {
    if (rejectReason.trim().length < 10) {
      toast.error('Red gerekçesi en az 10 karakter olmalı.');
      return;
    }
    rejectMut.mutate(
      { id: rotation.id, reason: rejectReason.trim() },
      {
        onSuccess: () => {
          toast.success('Rotasyon reddedildi');
          setRejectOpen(false);
          setRejectReason('');
        },
        onError: (err) => toast.error(`Reddedilemedi: ${friendlyErr(err.message)}`),
      },
    );
  };

  const handleComplete = () => {
    completeMut.mutate(
      { id: rotation.id },
      {
        onSuccess: () => toast.success('Rotasyon kapatıldı ve 90 gün değerlendirme planlandı'),
        onError: (err) => toast.error(`Kapatılamadı: ${friendlyErr(err.message)}`),
      },
    );
  };

  const statusBusy = approveMut.isPending || rejectMut.isPending || completeMut.isPending;

  return (
    <article
      data-testid={`admin-rotation-${rotation.id}`}
      data-status={rotation.status}
      className="overflow-hidden rounded-xl border border-line bg-bg"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[12px] text-ink-60">
            <Clock className="h-3 w-3" />
            {new Date(rotation.created_at).toLocaleString('tr-TR')}
          </div>
          <div className="mt-1 text-sm font-semibold text-ink">
            {rotation.employee_full_name ?? rotation.employee_id.slice(0, 8) + '…'}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1 text-[12px] text-ink-80">
            <span className="rounded-md bg-bg-2 px-2 py-0.5">
              {rotation.from_position_title ?? rotation.from_position_id.slice(0, 8)}
            </span>
            <ChevronRight className="h-3 w-3 text-ink-40" />
            <span className="rounded-md bg-accent-soft px-2 py-0.5 font-medium text-accent">
              {rotation.to_position_title ?? rotation.to_position_id.slice(0, 8)}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
            {rotation.status === 'proposed' ? 'Onay bekliyor' : rotation.status}
          </span>
          {rotation.start_date && (
            <span className="text-[11px] text-ink-40">
              Başlangıç: {new Date(rotation.start_date).toLocaleDateString('tr-TR')}
            </span>
          )}
        </div>
      </div>

      <div className="p-4">
        <div className="text-[12px] font-medium text-ink-80">Gerekçe</div>
        <p className="mt-1 whitespace-pre-wrap text-[13px] text-ink-80">
          {rotation.reason_tr || '—'}
        </p>
      </div>

      <div className="border-t border-line bg-bg-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-[12px] font-medium text-ink-60 hover:underline"
          data-testid={`timeline-toggle-${rotation.id}`}
        >
          {expanded ? 'Zaman çizelgesini gizle' : 'Zaman çizelgesini göster'}
        </button>
        {expanded && (
          <ol className="mt-3 flex flex-col gap-2" data-testid={`timeline-${rotation.id}`}>
            {timeline.map((step, idx) => (
              <li key={step.label} className="flex items-start gap-2 text-[12px]">
                <span
                  className={`mt-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold ${
                    step.done
                      ? 'bg-green text-white'
                      : step.current
                        ? 'bg-accent text-white'
                        : 'bg-ink-10 text-ink-40'
                  }`}
                >
                  {idx + 1}
                </span>
                <div>
                  <div className="font-medium text-ink">{step.label}</div>
                  <div className="text-ink-40">{step.detail}</div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {rotation.status === 'proposed' && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-bg p-3">
          <button
            type="button"
            disabled={statusBusy}
            data-testid={`reject-btn-${rotation.id}`}
            onClick={() => setRejectOpen((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md border border-line bg-bg px-3 py-1.5 text-[12px] font-medium text-ink-80 hover:border-red/40 hover:text-red disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            Reddet
          </button>
          <button
            type="button"
            disabled={statusBusy}
            data-testid={`approve-btn-${rotation.id}`}
            onClick={handleApprove}
            className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-[12px] font-medium text-white hover:bg-accent/90 disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            Onayla
          </button>
        </div>
      )}

      {rotation.status === 'approved' && canComplete && (
        <div className="flex items-center justify-end border-t border-line bg-bg p-3">
          <button
            type="button"
            data-testid={`complete-btn-${rotation.id}`}
            disabled={statusBusy}
            onClick={handleComplete}
            className="inline-flex items-center gap-1 rounded-md bg-green px-3 py-1.5 text-[12px] font-medium text-white hover:bg-green/90 disabled:opacity-50"
          >
            Rotasyonu Kapat (90 gün değerlendirme planla)
          </button>
        </div>
      )}

      {rejectOpen && (
        <div className="border-t border-line bg-red-soft/40 p-4" data-testid={`reject-panel-${rotation.id}`}>
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-ink-80">
              Red gerekçesi (çalışana iletilir — en az 10 karakter)
            </span>
            <textarea
              data-testid={`reject-reason-${rotation.id}`}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              minLength={10}
              className="rounded-md border border-line bg-bg px-3 py-2 text-[13px]"
              placeholder="Örn: Hedef pozisyon için gerekli teknik yetkinlikler henüz oluşmamış. Önce X eğitimini tamamlamanızı öneririm."
            />
          </label>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setRejectOpen(false);
                setRejectReason('');
              }}
              className="rounded-md border border-line bg-bg px-3 py-1.5 text-[12px] font-medium text-ink-60"
            >
              Vazgeç
            </button>
            <button
              type="button"
              data-testid={`reject-submit-${rotation.id}`}
              disabled={rejectReason.trim().length < 10 || statusBusy}
              onClick={handleReject}
              className="inline-flex items-center gap-1 rounded-md bg-red px-3 py-1.5 text-[12px] font-medium text-white hover:bg-red/90 disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              Reddi Gönder
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

/* ─── Helpers ─── */

interface TimelineStep {
  label: string;
  detail: string;
  done: boolean;
  current: boolean;
}

function buildTimeline(r: RotationRow): TimelineStep[] {
  const isProposed = r.status === 'proposed';
  const isApproved = r.status === 'approved' || r.status === 'active' || r.status === 'completed';
  const isCompleted = r.status === 'completed';
  const isRejected = r.status === 'rejected';
  return [
    {
      label: 'Talep gönderildi',
      detail: new Date(r.created_at).toLocaleString('tr-TR'),
      done: true,
      current: false,
    },
    {
      label: 'Yönetici onayı',
      detail: isApproved ? 'Onaylandı' : isRejected ? 'Reddedildi' : 'Bekliyor',
      done: isApproved || isRejected,
      current: isProposed,
    },
    {
      label: 'Aktif rotasyon',
      detail: r.status === 'active' || isCompleted ? 'Başladı' : 'Bekliyor',
      done: r.status === 'active' || isCompleted,
      current: r.status === 'approved',
    },
    {
      label: 'Kapanış + 90 gün değerlendirme',
      detail: isCompleted ? 'Tamamlandı' : 'Bekliyor',
      done: isCompleted,
      current: r.status === 'active',
    },
  ];
}

function friendlyErr(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes('invalid_transition')) return 'Bu aşamada izin verilen bir işlem değil.';
  if (lower.includes('reject_reason')) return 'Red gerekçesi en az 10 karakter olmalı.';
  if (lower.includes('forbidden')) return 'Bu aksiyon için yetkiniz yok.';
  if (lower.includes('cooldown')) return 'Cooldown aktif.';
  return msg;
}
