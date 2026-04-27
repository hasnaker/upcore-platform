'use client';

// KVKK Madde 22 — ML İtirazları Review Queue (İK + DPO).
//
// Çalışan, otomatik karara (ML tahmini) itiraz eder → bu sayfada İK kuyruğu
// görür. DPO veya platform-admin iki aksiyondan birini seçer:
//   - "Haklı" (Uphold) → tahmin retract, audit event (ml.prediction.retracted.v1),
//     downstream müdahale kaldırılır.
//   - "Reddet" (Dismiss) → DPO imzası zorunlu, kullanıcıya gerekçeli bildirim.
//
// Audit trail: IP + UA + reason + DPO_user_id her aksiyonda kaydedilir
// (gateway otomatik ekler, sunucu migration 062 trigger'ı zorunlu tutar).

import { useState, useCallback, useEffect, useMemo } from 'react';
import { AdminShell } from '@/components/AdminShell';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileSearch,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

type ObjectionStatus =
  | 'received'
  | 'verifying'
  | 'in_progress'
  | 'completed'
  | 'rejected';

type ObjectionOutcome = 'upheld' | 'dismissed' | 'under_review' | null;

interface MLObjection {
  id: string;
  tenant_id: string;
  user_id: string;
  prediction_id: string;
  reason: string;
  contact_email?: string | null;
  status: ObjectionStatus;
  resolution_outcome: ObjectionOutcome;
  resolution_note?: string | null;
  rejection_reason?: string | null;
  dpo_user_id?: string | null;
  dpo_signed_at?: string | null;
  prediction_retracted_at?: string | null;
  reviewer_ip?: string | null;
  reviewer_ua?: string | null;
  objected_at: string;
  reviewed_at?: string | null;
  completed_at?: string | null;
  due_date?: string; // 30 gün SLA
}

interface ObjectionListResponse {
  items: MLObjection[];
  total: number;
}

const STATUS_LABEL: Record<ObjectionStatus, string> = {
  received: 'Alındı',
  verifying: 'Doğrulama',
  in_progress: 'İncelemede',
  completed: 'Tamamlandı',
  rejected: 'Reddedildi',
};

const STATUS_STYLE: Record<ObjectionStatus, string> = {
  received: 'bg-bg-3 text-ink-60',
  verifying: 'bg-amber-soft text-amber',
  in_progress: 'bg-accent-soft text-accent',
  completed: 'bg-green-soft text-green',
  rejected: 'bg-red-soft text-red',
};

const OUTCOME_LABEL: Record<Exclude<ObjectionOutcome, null>, string> = {
  upheld: 'Haklı (tahmin iptal)',
  dismissed: 'Reddedildi (DPO onayı)',
  under_review: 'İncelemede',
};

const formatDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString('tr-TR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

// 30 gün SLA kontrolü (server-side mantık ile eşleşir)
const isOverdue = (o: MLObjection): boolean => {
  if (o.status === 'completed' || o.status === 'rejected') return false;
  const due = new Date(o.objected_at).getTime() + 30 * 24 * 60 * 60 * 1000;
  return Date.now() > due;
};

const daysToDue = (o: MLObjection): number => {
  const due = new Date(o.objected_at).getTime() + 30 * 24 * 60 * 60 * 1000;
  return Math.ceil((due - Date.now()) / (24 * 60 * 60 * 1000));
};

export default function KvkkMlItirazPage() {
  const [items, setItems] = useState<MLObjection[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | ObjectionStatus>(
    'all',
  );
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [selected, setSelected] = useState<MLObjection | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Aksiyon form state
  const [actionKind, setActionKind] = useState<'uphold' | 'dismiss' | null>(
    null,
  );
  const [resolutionNote, setResolutionNote] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [dpoConfirmed, setDpoConfirmed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      qs.set('limit', '50');
      if (statusFilter !== 'all') qs.set('status', statusFilter);
      if (overdueOnly) qs.set('overdue', 'true');

      const res = await fetch(
        `/api/v1/admin/ml-objections?${qs.toString()}`,
        { method: 'GET', cache: 'no-store' },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(data.message ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as ObjectionListResponse;
      setItems(data.items ?? []);
      setTotal(data.total ?? data.items?.length ?? 0);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, overdueOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetAction = useCallback(() => {
    setActionKind(null);
    setResolutionNote('');
    setRejectionReason('');
    setDpoConfirmed(false);
    setActionError(null);
  }, []);

  const openDetail = useCallback(
    (o: MLObjection) => {
      setSelected(o);
      resetAction();
    },
    [resetAction],
  );

  const closeDetail = useCallback(() => {
    setSelected(null);
    resetAction();
  }, [resetAction]);

  const submitUphold = useCallback(async () => {
    if (!selected) return;
    if (resolutionNote.trim().length < 5) {
      setActionError('Karar gerekçesi en az 5 karakter olmalıdır.');
      return;
    }
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await fetch(
        `/api/v1/admin/ml-objections/${selected.id}/uphold`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resolution_note: resolutionNote.trim() }),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(data.message ?? `HTTP ${res.status}`);
      }
      closeDetail();
      await load();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setActionBusy(false);
    }
  }, [selected, resolutionNote, closeDetail, load]);

  const submitDismiss = useCallback(async () => {
    if (!selected) return;
    if (rejectionReason.trim().length < 10) {
      setActionError('Ret gerekçesi en az 10 karakter olmalıdır.');
      return;
    }
    if (!dpoConfirmed) {
      setActionError(
        'İtiraz reddi için DPO imzası zorunludur. "DPO olarak onaylıyorum" kutusunu işaretleyin.',
      );
      return;
    }
    setActionBusy(true);
    setActionError(null);
    try {
      const res = await fetch(
        `/api/v1/admin/ml-objections/${selected.id}/dismiss`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rejection_reason: rejectionReason.trim(),
            dpo_confirmed: true,
          }),
        },
      );
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(data.message ?? `HTTP ${res.status}`);
      }
      closeDetail();
      await load();
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setActionBusy(false);
    }
  }, [selected, rejectionReason, dpoConfirmed, closeDetail, load]);

  const kpis = useMemo(() => {
    const open = items.filter(
      (o) => o.status !== 'completed' && o.status !== 'rejected',
    );
    const overdue = open.filter(isOverdue);
    const upheld = items.filter((o) => o.resolution_outcome === 'upheld');
    const dismissed = items.filter(
      (o) => o.resolution_outcome === 'dismissed',
    );
    return { open: open.length, overdue: overdue.length, upheld: upheld.length, dismissed: dismissed.length };
  }, [items]);

  return (
    <AdminShell>
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">
              KVKK Madde 22 — ML İtirazları
            </h1>
            <p className="mt-1 text-sm text-ink-60">
              Çalışanların otomatik karar (tükenmişlik tahmini vb.) itirazları.
              30 gün SLA · İK ön inceleme · DPO imzası ile red · Haklı bulunan
              tahminler ve ilgili müdahaleler otomatik geri çekilir.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-bg px-3 py-1.5 text-[12px] font-medium text-ink-60 hover:bg-bg-2 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
            />
            Yenile
          </button>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard
            icon={<Clock className="h-4 w-4" />}
            label="Açık itiraz"
            value={kpis.open}
            tone="info"
          />
          <KpiCard
            icon={<AlertCircle className="h-4 w-4" />}
            label="SLA aşımı"
            value={kpis.overdue}
            tone={kpis.overdue > 0 ? 'warning' : 'info'}
          />
          <KpiCard
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Haklı bulunan"
            value={kpis.upheld}
            tone="success"
          />
          <KpiCard
            icon={<ShieldAlert className="h-4 w-4" />}
            label="DPO ile reddedilen"
            value={kpis.dismissed}
            tone="neutral"
          />
        </div>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-red/30 bg-red-soft p-3 text-[12px] text-red"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <div>
              <div className="font-semibold">İtiraz kuyruğu yüklenemedi</div>
              <div>{error}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-md border border-line bg-bg p-1 text-[12px]">
            {(
              ['all', 'received', 'verifying', 'in_progress', 'completed', 'rejected'] as const
            ).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded px-3 py-1.5 font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-accent-soft text-accent'
                    : 'text-ink-60 hover:text-ink'
                }`}
              >
                {s === 'all' ? 'Tümü' : STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-[12px] text-ink-60">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-line"
            />
            SLA aşanları göster
          </label>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-line bg-bg">
          {loading && items.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-40">Yükleniyor…</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-60">
              Bu kriterlere uyan itiraz bulunamadı.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-bg-2 text-[11px] uppercase tracking-wider text-ink-40">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">İtiraz Tarihi</th>
                  <th className="px-4 py-3 text-left font-semibold">Kullanıcı</th>
                  <th className="px-4 py-3 text-left font-semibold">Tahmin ID</th>
                  <th className="px-4 py-3 text-left font-semibold">Durum</th>
                  <th className="px-4 py-3 text-left font-semibold">Sonuç</th>
                  <th className="px-4 py-3 text-left font-semibold">SLA</th>
                  <th className="px-4 py-3 text-right font-semibold">Aksiyon</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((o) => {
                  const overdue = isOverdue(o);
                  const days = daysToDue(o);
                  return (
                    <tr key={o.id} className="hover:bg-bg-2">
                      <td className="px-4 py-3 font-mono tabular-nums text-[11px] text-ink-40">
                        {formatDate(o.objected_at)}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-ink-60">
                        {o.user_id.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-ink-40">
                        {o.prediction_id.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-medium uppercase tracking-wider ${STATUS_STYLE[o.status]}`}
                        >
                          {STATUS_LABEL[o.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-ink-60">
                        {o.resolution_outcome
                          ? OUTCOME_LABEL[o.resolution_outcome]
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-[11px]">
                        {o.status === 'completed' || o.status === 'rejected' ? (
                          <span className="text-ink-40">—</span>
                        ) : overdue ? (
                          <span className="font-medium text-red">
                            {Math.abs(days)} gün gecikti
                          </span>
                        ) : (
                          <span className="text-ink-60">{days} gün kaldı</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => openDetail(o)}
                          className="inline-flex items-center gap-1 rounded-md border border-line bg-bg px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-bg-2"
                        >
                          <FileSearch className="h-3 w-3" />
                          İncele
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {items.length > 0 && (
            <div className="border-t border-line bg-bg-2 px-4 py-2 text-[11px] text-ink-40">
              {items.length} kayıt · toplam {total}
            </div>
          )}
        </div>

        <div className="flex items-start gap-2 rounded-md border border-accent/20 bg-accent-soft p-3 text-[11px] text-ink-80">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
          <p>
            <strong>KVKK uyumlu:</strong> İtiraz kayıtları 30 gün SLA ile
            işlenir. Haklı bulunan tahminler geri çekilir
            (ml.prediction.retracted.v1 event → müdahale servisi önerileri
            siler). Reddin DPO imzası zorunlu, audit trail IP + UA + gerekçe
            içerir.
          </p>
        </div>
      </div>

      {/* Detail modal */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeDetail}
        >
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-line bg-bg p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-ink">
                  İtiraz detayı
                </h2>
                <p className="mt-1 font-mono text-[11px] text-ink-40">
                  {selected.id}
                </p>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="rounded-md p-1 text-ink-40 hover:bg-bg-2"
                aria-label="Kapat"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-[12px]">
              <Field label="Kullanıcı ID" value={selected.user_id} mono />
              <Field label="Tahmin ID" value={selected.prediction_id} mono />
              <Field
                label="İletişim"
                value={selected.contact_email ?? '—'}
              />
              <Field
                label="İtiraz tarihi"
                value={formatDate(selected.objected_at)}
              />
              <Field label="Durum" value={STATUS_LABEL[selected.status]} />
              <Field
                label="Sonuç"
                value={
                  selected.resolution_outcome
                    ? OUTCOME_LABEL[selected.resolution_outcome]
                    : '—'
                }
              />
              {selected.dpo_user_id && (
                <Field
                  label="DPO imzası"
                  value={`${selected.dpo_user_id.slice(0, 8)}… · ${formatDate(selected.dpo_signed_at)}`}
                  mono
                />
              )}
              {selected.prediction_retracted_at && (
                <Field
                  label="Tahmin geri çekildi"
                  value={formatDate(selected.prediction_retracted_at)}
                />
              )}
            </dl>

            <div className="mt-5 rounded-md border border-line bg-bg-2 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-40">
                Çalışanın itiraz gerekçesi
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink">
                {selected.reason}
              </p>
            </div>

            {selected.resolution_note && (
              <div className="mt-3 rounded-md border border-green/20 bg-green-soft p-3 text-[12px] text-ink-80">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-green">
                  Karar gerekçesi (Haklı)
                </div>
                <p className="mt-1">{selected.resolution_note}</p>
              </div>
            )}
            {selected.rejection_reason && (
              <div className="mt-3 rounded-md border border-red/20 bg-red-soft p-3 text-[12px] text-ink-80">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-red">
                  Ret gerekçesi
                </div>
                <p className="mt-1">{selected.rejection_reason}</p>
              </div>
            )}

            {/* Action area: only show if not finalised */}
            {selected.status !== 'completed' &&
              selected.status !== 'rejected' && (
                <div className="mt-6 border-t border-line pt-5">
                  {actionKind === null ? (
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setActionKind('uphold')}
                        className="inline-flex items-center gap-2 rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Haklı bul (tahmini geri çek)
                      </button>
                      <button
                        type="button"
                        onClick={() => setActionKind('dismiss')}
                        className="inline-flex items-center gap-2 rounded-lg border border-red/40 bg-bg px-4 py-2 text-sm font-semibold text-red hover:bg-red-soft"
                      >
                        <XCircle className="h-4 w-4" />
                        Reddet (DPO onayı ile)
                      </button>
                    </div>
                  ) : actionKind === 'uphold' ? (
                    <div className="space-y-3">
                      <label className="block text-[12px] font-medium text-ink">
                        Karar gerekçesi (çalışana ve audit log'a yazılır)
                        <textarea
                          value={resolutionNote}
                          onChange={(e) => setResolutionNote(e.target.value)}
                          rows={4}
                          placeholder="Örn: Modelin kullandığı veriler eksik; itiraz haklıdır, tahmin geri çekilir."
                          className="mt-1 w-full rounded-md border border-line bg-bg p-2 text-sm focus:border-accent focus:outline-none"
                        />
                      </label>
                      <div className="rounded-md border border-amber/30 bg-amber-soft p-3 text-[11px] text-ink-80">
                        Onaylarsanız:
                        <ul className="mt-1 list-inside list-disc">
                          <li>
                            ml_predictions_audit.status = <code>retracted</code>
                          </li>
                          <li>
                            ml.prediction.retracted.v1 event yayınlanır
                          </li>
                          <li>
                            Müdahale servisi ilgili önerileri otomatik kaldırır
                          </li>
                          <li>Çalışana TR bildirim gönderilir</li>
                        </ul>
                      </div>
                      {actionError && (
                        <div className="text-[12px] text-red">{actionError}</div>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={submitUphold}
                          disabled={actionBusy}
                          className="inline-flex items-center gap-2 rounded-lg bg-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                        >
                          {actionBusy ? 'İşleniyor…' : 'Onayla'}
                        </button>
                        <button
                          type="button"
                          onClick={resetAction}
                          className="rounded-lg border border-line bg-bg px-4 py-2 text-sm text-ink-60 hover:bg-bg-2"
                        >
                          Vazgeç
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <label className="block text-[12px] font-medium text-ink">
                        Ret gerekçesi (çalışana iletilir, audit log'a yazılır)
                        <textarea
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={4}
                          placeholder="Örn: Modelin kullandığı veriler doğrulandı; tahmin değiştirilmez."
                          className="mt-1 w-full rounded-md border border-line bg-bg p-2 text-sm focus:border-accent focus:outline-none"
                        />
                      </label>
                      <label className="flex items-start gap-2 rounded-md border border-red/30 bg-red-soft p-3 text-[12px] text-ink-80">
                        <input
                          type="checkbox"
                          checked={dpoConfirmed}
                          onChange={(e) => setDpoConfirmed(e.target.checked)}
                          className="mt-0.5 h-3.5 w-3.5 rounded border-line"
                        />
                        <span>
                          <strong>DPO olarak onaylıyorum.</strong> KVKK Madde 22
                          gereği itiraz reddi için Veri Koruma Görevlisi
                          imzası zorunludur. IP adresim + user-agent audit
                          log'a kaydedilir.
                        </span>
                      </label>
                      {actionError && (
                        <div className="text-[12px] text-red">{actionError}</div>
                      )}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={submitDismiss}
                          disabled={actionBusy}
                          className="inline-flex items-center gap-2 rounded-lg border border-red/40 bg-bg px-4 py-2 text-sm font-semibold text-red hover:bg-red-soft disabled:opacity-50"
                        >
                          {actionBusy ? 'İşleniyor…' : 'DPO imzası ile reddet'}
                        </button>
                        <button
                          type="button"
                          onClick={resetAction}
                          className="rounded-lg border border-line bg-bg px-4 py-2 text-sm text-ink-60 hover:bg-bg-2"
                        >
                          Vazgeç
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            {/* Audit trail */}
            {(selected.reviewer_ip || selected.reviewer_ua) && (
              <div className="mt-5 rounded-md border border-line bg-bg-2 p-3 text-[11px] text-ink-40">
                <div className="font-semibold uppercase tracking-wider">
                  Audit trail
                </div>
                <div className="mt-1 space-y-0.5 font-mono">
                  {selected.reviewer_ip && <div>IP: {selected.reviewer_ip}</div>}
                  {selected.reviewer_ua && <div>UA: {selected.reviewer_ua}</div>}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: 'info' | 'warning' | 'success' | 'neutral';
}

const KpiCard = ({ icon, label, value, tone }: KpiCardProps) => {
  const toneClass = {
    info: 'bg-accent-soft text-accent',
    warning: 'bg-amber-soft text-amber',
    success: 'bg-green-soft text-green',
    neutral: 'bg-bg-3 text-ink-60',
  }[tone];
  return (
    <div className="rounded-xl border border-line bg-bg p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-ink-40">
        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${toneClass}`}>
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-ink">
        {value}
      </div>
    </div>
  );
};

interface FieldProps {
  label: string;
  value: string;
  mono?: boolean;
}

const Field = ({ label, value, mono }: FieldProps) => (
  <div>
    <dt className="text-[10px] uppercase tracking-wider text-ink-40">{label}</dt>
    <dd
      className={`mt-0.5 text-[12px] text-ink ${mono ? 'font-mono text-[11px]' : ''}`}
    >
      {value}
    </dd>
  </div>
);
