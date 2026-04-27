'use client';

/**
 * /admin/pip/[caseId] — PIP dosya detayı.
 *
 * 3-adım timeline: Başlat → Aktif → Sonuç.
 * Hedefler, haftalık check-in, uzatma, kapanış (passed/terminated + legal file),
 * PDF export.
 */

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  usePipCase,
  useSubmitPipForLegal,
  useApprovePipLegal,
  useAddPipGoal,
  useAddPipCheckin,
  useExtendPipCase,
  useClosePipPassed,
  useClosePipTerminated,
  buildPipPdfUrl,
  PIP_STATUS_LABEL_TR,
  PIP_REASON_LABEL_TR,
  PIP_PRIORITY_LABEL_TR,
  PIP_TRACK_LABEL_TR,
  isPipClosed,
  isPipActive,
  type PipStatus,
} from '@/hooks/usePip';

const STATUS_COLORS: Record<PipStatus, { bg: string; fg: string }> = {
  draft: { bg: '#F5F5F5', fg: '#525252' },
  pending_legal: { bg: '#FEF3C7', fg: '#B45309' },
  active: { bg: '#DBEAFE', fg: '#1D4ED8' },
  extended: { bg: '#E0E7FF', fg: '#4338CA' },
  passed: { bg: '#D1FAE5', fg: '#047857' },
  terminated: { bg: '#FEE2E2', fg: '#B91C1C' },
};

export default function PipDetailPage() {
  const params = useParams<{ caseId: string }>();
  const caseId = params?.caseId ?? '';
  const { data: pipCase, isLoading, isError, error, refetch } = usePipCase(caseId);

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-xl border border-[#EDEDED] bg-[#FAFAFA]" />;
  }
  if (isError || !pipCase) {
    return (
      <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#991B1B]">
        <div className="font-semibold">PIP dosyası yüklenemedi</div>
        <div className="mt-1 text-xs">
          {error instanceof Error ? error.message : 'Dosya bulunamadı.'}
        </div>
        <Link
          href="/admin/pip"
          className="mt-3 inline-block rounded-md border border-[#FECACA] bg-white px-3 py-1.5 text-xs font-semibold"
        >
          ← Listeye dön
        </Link>
      </div>
    );
  }

  const colors = STATUS_COLORS[pipCase.status];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <Link href="/admin/pip" className="text-xs text-[#5E5CE6] hover:underline">
          ← PIP listesi
        </Link>
        <div className="mt-2 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#111]">
              PIP Dosyası · {pipCase.id.slice(0, 8)}
            </h1>
            <div className="mt-1 flex items-center gap-2 text-sm text-[#525252]">
              <span>Çalışan: {pipCase.employee_id.slice(0, 8)}</span>
              <span>·</span>
              <span>Neden: {PIP_REASON_LABEL_TR[pipCase.reason_category]}</span>
              <span>·</span>
              <span>{pipCase.duration_days} gün</span>
            </div>
          </div>
          <div className="flex gap-2">
            <span
              data-testid="pip-status-badge"
              className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: colors.bg, color: colors.fg }}
            >
              {PIP_STATUS_LABEL_TR[pipCase.status]}
            </span>
            <a
              href={buildPipPdfUrl(pipCase.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-semibold text-[#525252] hover:bg-[#F5F5F5]"
              data-testid="pip-pdf-btn"
            >
              PDF indir
            </a>
          </div>
        </div>
      </div>

      {/* 3-step timeline */}
      <Timeline status={pipCase.status} />

      {/* Reason summary */}
      <Section title="Olgusal Özet">
        <p className="whitespace-pre-wrap text-sm text-[#111]">{pipCase.reason_summary}</p>
      </Section>

      {/* Action strip — depends on status */}
      <ActionStrip pipCase={pipCase} onChanged={() => refetch()} />

      {/* Goals */}
      <GoalsSection pipCase={pipCase} onChanged={() => refetch()} />

      {/* Check-ins */}
      <CheckinsSection pipCase={pipCase} onChanged={() => refetch()} />

      {/* Outcome */}
      {pipCase.outcome && (
        <Section title="Sonuç">
          <div className="rounded-md bg-[#FAFAFA] p-3 text-sm text-[#111]">
            <div><strong>Sonuç:</strong> {pipCase.outcome.result}</div>
            {pipCase.outcome.outcome_notes && (
              <div className="mt-1 text-[#525252]">{pipCase.outcome.outcome_notes}</div>
            )}
            {pipCase.outcome.legal_file_url && (
              <div className="mt-1 text-xs">
                Legal dosya:{' '}
                <a
                  href={pipCase.outcome.legal_file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#5E5CE6] hover:underline"
                >
                  Görüntüle
                </a>
              </div>
            )}
            <div className="mt-1 text-xs text-[#888]">
              Kapatan: {pipCase.outcome.closed_by.slice(0, 8)} ·{' '}
              {new Date(pipCase.outcome.closed_at).toLocaleString('tr-TR')}
            </div>
          </div>
        </Section>
      )}
    </div>
  );
}

/* ─── Timeline ─── */

function Timeline({ status }: { status: PipStatus }) {
  const steps = [
    { key: 'init', label: 'Başlat', done: true },
    {
      key: 'active',
      label: 'Aktif Süreç',
      done: status !== 'draft' && status !== 'pending_legal',
    },
    { key: 'close', label: 'Sonuç', done: isPipClosed(status) },
  ];
  return (
    <div className="flex items-center gap-2 rounded-xl border border-[#EDEDED] bg-white p-4">
      {steps.map((s, i) => (
        <div key={s.key} className="flex flex-1 items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
              s.done ? 'bg-[#5E5CE6] text-white' : 'bg-[#F5F5F5] text-[#888]'
            }`}
          >
            {i + 1}
          </div>
          <div className="text-sm font-medium text-[#111]">{s.label}</div>
          {i < steps.length - 1 && (
            <div
              className={`mx-2 h-px flex-1 ${s.done ? 'bg-[#5E5CE6]' : 'bg-[#EDEDED]'}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ─── Reusable section card ─── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#EDEDED] bg-white p-5">
      <div className="mb-3 text-sm font-semibold text-[#111]">{title}</div>
      {children}
    </div>
  );
}

/* ─── Action strip — context-specific buttons ─── */

function ActionStrip({ pipCase, onChanged }: { pipCase: { id: string; status: PipStatus }; onChanged: () => void }) {
  const submitLegal = useSubmitPipForLegal(pipCase.id);
  const approveLegal = useApprovePipLegal(pipCase.id);
  const extend = useExtendPipCase(pipCase.id);
  const closePassed = useClosePipPassed(pipCase.id);
  const closeTerminated = useClosePipTerminated(pipCase.id);

  const [legalFileURL, setLegalFileURL] = useState('');
  const [terminatedFile, setTerminatedFile] = useState('');
  const [outcomeReason, setOutcomeReason] = useState('');
  const [extensionDays, setExtensionDays] = useState<30 | 60 | 90>(30);
  const [extensionReason, setExtensionReason] = useState('');

  if (isPipClosed(pipCase.status)) return null;

  return (
    <div className="rounded-xl border border-[#EDEDED] bg-white p-5">
      <div className="mb-3 text-sm font-semibold text-[#111]">İşlemler</div>

      {pipCase.status === 'draft' && (
        <div className="flex items-center gap-2">
          <button
            onClick={async () => {
              try {
                await submitLegal.mutateAsync({});
                toast.success('Legal onayına gönderildi.');
                onChanged();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'İşlem başarısız');
              }
            }}
            disabled={submitLegal.isPending}
            className="rounded-md bg-[#5E5CE6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4F4DD1] disabled:opacity-50"
            data-testid="submit-legal-btn"
          >
            Legal onayına gönder
          </button>
        </div>
      )}

      {pipCase.status === 'pending_legal' && (
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={legalFileURL}
            onChange={(e) => setLegalFileURL(e.target.value)}
            placeholder="Legal dosya URL (zorunlu)"
            className="flex-1 min-w-[280px] rounded-md border border-[#E5E5E5] px-3 py-2 text-sm"
            data-testid="legal-file-url"
          />
          <button
            onClick={async () => {
              if (!legalFileURL.trim()) {
                toast.error('Legal dosya URL zorunlu.');
                return;
              }
              try {
                await approveLegal.mutateAsync({ legal_file_url: legalFileURL.trim() });
                toast.success('Legal onaylandı — PIP aktif.');
                onChanged();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Onay başarısız');
              }
            }}
            disabled={approveLegal.isPending}
            className="rounded-md bg-[#5E5CE6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4F4DD1] disabled:opacity-50"
            data-testid="approve-legal-btn"
          >
            Legal Onayla & Aktive Et
          </button>
        </div>
      )}

      {isPipActive(pipCase.status) && (
        <div className="flex flex-col gap-4">
          {/* Extend */}
          <div className="rounded-md border border-dashed border-[#E5E5E5] bg-[#FAFAFA] p-3">
            <div className="mb-2 text-xs font-semibold text-[#525252]">Süre uzatma</div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex gap-1">
                {[30, 60, 90].map((d) => (
                  <button
                    key={d}
                    onClick={() => setExtensionDays(d as 30 | 60 | 90)}
                    className={`rounded-md px-3 py-1.5 text-xs ${
                      extensionDays === d ? 'bg-[#5E5CE6] text-white' : 'bg-white text-[#525252] border border-[#E5E5E5]'
                    }`}
                  >
                    +{d} gün
                  </button>
                ))}
              </div>
              <input
                value={extensionReason}
                onChange={(e) => setExtensionReason(e.target.value)}
                placeholder="Uzatma gerekçesi"
                className="flex-1 rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs"
              />
              <button
                onClick={async () => {
                  if (!extensionReason.trim()) {
                    toast.error('Uzatma gerekçesi zorunlu.');
                    return;
                  }
                  try {
                    await extend.mutateAsync({ extension_days: extensionDays, reason: extensionReason.trim() });
                    toast.success('PIP uzatıldı.');
                    onChanged();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Uzatma başarısız');
                  }
                }}
                disabled={extend.isPending}
                className="rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-semibold text-[#525252] hover:bg-[#F5F5F5] disabled:opacity-50"
                data-testid="extend-btn"
              >
                Uzat
              </button>
            </div>
          </div>

          {/* Close passed */}
          <div className="rounded-md border border-dashed border-[#D1FAE5] bg-[#F0FDF4] p-3">
            <div className="mb-2 text-xs font-semibold text-[#047857]">Başarılı kapanış</div>
            <div className="flex items-center gap-2">
              <input
                value={outcomeReason}
                onChange={(e) => setOutcomeReason(e.target.value)}
                placeholder="Sonuç gerekçesi (Hedeflere ulaşıldı…)"
                className="flex-1 rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs"
              />
              <button
                onClick={async () => {
                  if (!outcomeReason.trim()) {
                    toast.error('Gerekçe zorunlu.');
                    return;
                  }
                  try {
                    await closePassed.mutateAsync({ outcome_reason: outcomeReason.trim() });
                    toast.success('PIP başarılı olarak kapatıldı.');
                    onChanged();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'Kapatma başarısız');
                  }
                }}
                disabled={closePassed.isPending}
                className="rounded-md bg-[#047857] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#065F46] disabled:opacity-50"
                data-testid="close-passed-btn"
              >
                Başarılı kapat
              </button>
            </div>
          </div>

          {/* Close terminated */}
          <div className="rounded-md border border-dashed border-[#FECACA] bg-[#FEF2F2] p-3">
            <div className="mb-2 text-xs font-semibold text-[#B91C1C]">
              Fesih (İş Kanunu 25/2) — legal dosya zorunlu
            </div>
            <div className="flex flex-col gap-2">
              <input
                value={terminatedFile}
                onChange={(e) => setTerminatedFile(e.target.value)}
                placeholder="Fesih dosyası URL (zorunlu, mahkeme delili)"
                className="rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs"
                data-testid="terminated-file-url"
              />
              <div className="flex items-center gap-2">
                <input
                  value={outcomeReason}
                  onChange={(e) => setOutcomeReason(e.target.value)}
                  placeholder="Fesih gerekçesi"
                  className="flex-1 rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs"
                />
                <button
                  onClick={async () => {
                    if (!terminatedFile.trim() || !outcomeReason.trim()) {
                      toast.error('Legal dosya ve gerekçe zorunlu.');
                      return;
                    }
                    const confirmed = window.confirm(
                      'Fesih kararı ile iş sözleşmesi sona erdirilecek. Mahkeme süreci için dosya ekli mi? Devam edilsin mi?',
                    );
                    if (!confirmed) return;
                    try {
                      await closeTerminated.mutateAsync({
                        legal_file_url: terminatedFile.trim(),
                        outcome_reason: outcomeReason.trim(),
                      });
                      toast.success('Fesih kararı kayıt altına alındı.');
                      onChanged();
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : 'Kapatma başarısız');
                    }
                  }}
                  disabled={closeTerminated.isPending}
                  className="rounded-md bg-[#B91C1C] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#991B1B] disabled:opacity-50"
                  data-testid="close-terminated-btn"
                >
                  Fesih ile kapat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Goals section ─── */

function GoalsSection({ pipCase, onChanged }: { pipCase: { id: string; status: PipStatus; goals?: Array<{ id: string; description: string; measurable_target: string; deadline: string; priority: 'low' | 'medium' | 'high' }> }; onChanged: () => void }) {
  const add = useAddPipGoal(pipCase.id);
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const canAdd = !isPipClosed(pipCase.status);

  return (
    <Section title={`Hedefler (${pipCase.goals?.length ?? 0})`}>
      {(pipCase.goals ?? []).length === 0 && (
        <div className="text-xs text-[#888]">Henüz hedef tanımlı değil.</div>
      )}
      <div className="flex flex-col gap-2">
        {(pipCase.goals ?? []).map((g) => (
          <div
            key={g.id}
            data-testid="pip-goal-item"
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
      {canAdd && !open && (
        <button
          onClick={() => setOpen(true)}
          className="mt-3 text-xs font-semibold text-[#5E5CE6] hover:underline"
        >
          + Hedef ekle
        </button>
      )}
      {canAdd && open && (
        <div className="mt-3 flex flex-col gap-2 rounded-md border border-dashed border-[#E5E5E5] p-3">
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Hedef açıklaması"
            className="rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs"
          />
          <input
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Ölçülebilir hedef"
            className="rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="flex-1 rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs"
            />
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
              className="rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs"
            >
              <option value="low">Düşük</option>
              <option value="medium">Orta</option>
              <option value="high">Yüksek</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setOpen(false)}
              className="rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs"
            >
              İptal
            </button>
            <button
              onClick={async () => {
                if (!description.trim() || !target.trim() || !deadline) {
                  toast.error('Tüm alanlar zorunlu.');
                  return;
                }
                try {
                  await add.mutateAsync({
                    description: description.trim(),
                    measurable_target: target.trim(),
                    deadline,
                    priority,
                  });
                  setDescription('');
                  setTarget('');
                  setDeadline('');
                  setPriority('medium');
                  setOpen(false);
                  toast.success('Hedef eklendi.');
                  onChanged();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Ekleme başarısız');
                }
              }}
              disabled={add.isPending}
              className="rounded-md bg-[#5E5CE6] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4F4DD1] disabled:opacity-50"
            >
              Ekle
            </button>
          </div>
        </div>
      )}
    </Section>
  );
}

/* ─── Check-ins section ─── */

function CheckinsSection({ pipCase, onChanged }: { pipCase: { id: string; status: PipStatus; checkins?: Array<{ id: string; week_number: number; on_track: 'on_track' | 'off_track'; manager_notes?: string | null; employee_notes?: string | null; acknowledged_by_employee?: string | null }> }; onChanged: () => void }) {
  const add = useAddPipCheckin(pipCase.id);
  const [open, setOpen] = useState(false);
  const [week, setWeek] = useState(1);
  const [track, setTrack] = useState<'on_track' | 'off_track'>('on_track');
  const [managerNotes, setManagerNotes] = useState('');

  const canAdd = isPipActive(pipCase.status);
  const checkins = pipCase.checkins ?? [];
  const nextWeek = checkins.length ? Math.max(...checkins.map((k) => k.week_number)) + 1 : 1;

  return (
    <Section title={`Haftalık Takip (${checkins.length})`}>
      {checkins.length === 0 && (
        <div className="text-xs text-[#888]">Henüz check-in yok.</div>
      )}
      <div className="flex flex-col gap-2">
        {checkins.map((k) => (
          <div
            key={k.id}
            data-testid="pip-checkin-item"
            className="rounded-md border border-[#EDEDED] bg-[#FAFAFA] p-3 text-sm"
          >
            <div className="flex items-center justify-between">
              <div className="font-medium text-[#111]">Hafta {k.week_number}</div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  k.on_track === 'on_track' ? 'bg-[#D1FAE5] text-[#047857]' : 'bg-[#FEF3C7] text-[#B45309]'
                }`}
              >
                {PIP_TRACK_LABEL_TR[k.on_track]}
              </span>
            </div>
            {k.manager_notes && (
              <div className="mt-1 text-xs text-[#525252]">Yönetici: {k.manager_notes}</div>
            )}
            {k.employee_notes && (
              <div className="text-xs text-[#525252]">Çalışan: {k.employee_notes}</div>
            )}
            <div className="mt-1 text-[10px] text-[#888]">
              {k.acknowledged_by_employee
                ? `Çalışan onayı: ${new Date(k.acknowledged_by_employee).toLocaleString('tr-TR')}`
                : 'Çalışan henüz onaylamadı'}
            </div>
          </div>
        ))}
      </div>
      {canAdd && !open && (
        <button
          onClick={() => {
            setOpen(true);
            setWeek(nextWeek);
          }}
          className="mt-3 text-xs font-semibold text-[#5E5CE6] hover:underline"
        >
          + Haftalık check-in ekle
        </button>
      )}
      {canAdd && open && (
        <div className="mt-3 flex flex-col gap-2 rounded-md border border-dashed border-[#E5E5E5] p-3">
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              max={52}
              value={week}
              onChange={(e) => setWeek(Number(e.target.value))}
              className="w-24 rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs"
            />
            <select
              value={track}
              onChange={(e) => setTrack(e.target.value as 'on_track' | 'off_track')}
              className="rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs"
            >
              <option value="on_track">Hedefte</option>
              <option value="off_track">Geride</option>
            </select>
          </div>
          <textarea
            value={managerNotes}
            onChange={(e) => setManagerNotes(e.target.value)}
            rows={2}
            placeholder="Yönetici notu (haftalık görüşme özeti)"
            className="rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setOpen(false)}
              className="rounded-md border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs"
            >
              İptal
            </button>
            <button
              onClick={async () => {
                try {
                  await add.mutateAsync({
                    week_number: week,
                    on_track: track,
                    manager_notes: managerNotes.trim() || undefined,
                  });
                  setOpen(false);
                  setManagerNotes('');
                  toast.success('Check-in kaydedildi.');
                  onChanged();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Check-in başarısız');
                }
              }}
              disabled={add.isPending}
              className="rounded-md bg-[#5E5CE6] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#4F4DD1] disabled:opacity-50"
            >
              Kaydet
            </button>
          </div>
        </div>
      )}
    </Section>
  );
}
