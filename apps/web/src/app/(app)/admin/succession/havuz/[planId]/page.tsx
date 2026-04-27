'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  usePositionPool,
  useCriticalPositions,
  useAddCandidate,
  useUpdateReadiness,
  useRemoveCandidate,
  READINESS_LABEL_TR,
  RISK_LABEL_TR,
  type Readiness,
  type SuccessionCandidate,
} from '@/hooks/useSuccession';
import { useEmployeeSearch, type EmployeeSearchResult } from '@/hooks/useEmployees';

const READINESS_ORDER: Readiness[] = ['ready_now', 'ready_1y', 'ready_2y'];

const READINESS_BG: Record<Readiness, { border: string; head: string; head_text: string }> = {
  ready_now: { border: '#BBF7D0', head: '#D1FAE5', head_text: '#059669' },
  ready_1y: { border: '#FDE68A', head: '#FEF3C7', head_text: '#D97706' },
  ready_2y: { border: '#E5E5E5', head: '#F5F5F5', head_text: '#6B7280' },
};

function avatarUrl(name: string): string {
  const clean = (name || 'ÇK').trim() || 'ÇK';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(clean)}&background=EEF0FD&color=5E5CE6&bold=true`;
}

function fitColor(score: number): string {
  if (score >= 80) return '#059669';
  if (score >= 60) return '#D97706';
  return '#DC2626';
}

export default function SuccessionPoolDetailPage() {
  const params = useParams<{ planId: string }>();
  const router = useRouter();
  const planId = params?.planId ?? '';

  // Join with the critical list to resolve position/incumbent display — one
  // round-trip anyway since we already cache it from the list page.
  const { data: criticalData } = useCriticalPositions();
  const pool = usePositionPool(planId);
  const addMut = useAddCandidate(planId);
  const updateMut = useUpdateReadiness(planId);
  const removeMut = useRemoveCandidate(planId);

  const [showAddModal, setShowAddModal] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const headerPosition = useMemo(
    () => criticalData?.items?.find((p) => p.plan_id === planId),
    [criticalData?.items, planId],
  );

  const grouped = useMemo(() => {
    const out: Record<Readiness, SuccessionCandidate[]> = {
      ready_now: [],
      ready_1y: [],
      ready_2y: [],
    };
    for (const c of pool.data?.candidates ?? []) {
      if (c.readiness in out) out[c.readiness as Readiness].push(c);
    }
    // Stable sort by rank then fit_score desc
    for (const k of READINESS_ORDER) {
      out[k].sort((a, b) => a.rank - b.rank || b.fit_score - a.fit_score);
    }
    return out;
  }, [pool.data?.candidates]);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs text-[#888]">
            <Link href="/admin/succession/pozisyonlar" className="text-[#5E5CE6] hover:underline">
              Kritik Pozisyonlar
            </Link>
            <span>/</span>
            <span>Havuz Detayı</span>
          </div>
          <h1 className="text-2xl font-bold text-[#111]">
            {headerPosition?.position_title_tr || 'Yedek Havuzu'}
          </h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-[#555]">
            <span>{headerPosition?.department_tr || '—'}</span>
            {headerPosition?.incumbent_full_name && (
              <>
                <span className="text-[#ccc]">•</span>
                <span>
                  Mevcut:{' '}
                  <span className="font-medium text-[#111]">
                    {headerPosition.incumbent_full_name}
                  </span>
                </span>
              </>
            )}
            {headerPosition?.risk_level && (
              <>
                <span className="text-[#ccc]">•</span>
                <span className="font-semibold text-[#DC2626]">
                  {RISK_LABEL_TR[headerPosition.risk_level]}
                </span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          data-testid="add-candidate-btn"
          className="rounded-md bg-[#5E5CE6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4F4DD1]"
        >
          + Aday Ekle
        </button>
      </div>

      {/* Loading / error */}
      {pool.isLoading && (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-[320px] animate-pulse rounded-xl border border-[#EDEDED] bg-[#FAFAFA]"
            />
          ))}
        </div>
      )}
      {pool.isError && (
        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
          Havuz yüklenemedi:{' '}
          {pool.error instanceof Error ? pool.error.message : 'bilinmeyen hata'}
        </div>
      )}

      {/* 3-column readiness board */}
      {!pool.isLoading && !pool.isError && (
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-3"
          data-testid="succession-board"
        >
          {READINESS_ORDER.map((key) => {
            const style = READINESS_BG[key];
            const list = grouped[key];
            return (
              <div
                key={key}
                className="flex flex-col overflow-hidden rounded-xl border bg-white"
                style={{ borderColor: style.border }}
                data-testid={`column-${key}`}
              >
                <div
                  className="flex items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                  style={{ background: style.head, color: style.head_text }}
                >
                  <span>{READINESS_LABEL_TR[key]}</span>
                  <span className="text-[10px] opacity-80">{list.length} aday</span>
                </div>
                <div className="flex flex-1 flex-col gap-3 p-3">
                  {list.length === 0 && (
                    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-[#E5E5E5] p-6 text-center text-xs text-[#888]">
                      Bu seviyede aday yok
                    </div>
                  )}
                  {list.map((c) => (
                    <CandidateCard
                      key={c.id}
                      cand={c}
                      onChangeReadiness={(next) =>
                        updateMut.mutate(
                          { candidate_id: c.id, readiness: next },
                          {
                            onSuccess: () =>
                              toast.success(
                                `Hazırlık güncellendi: ${READINESS_LABEL_TR[next]}`,
                              ),
                            onError: (e) =>
                              toast.error(
                                e instanceof Error ? e.message : 'Güncelleme başarısız',
                              ),
                          },
                        )
                      }
                      onRemove={() => setConfirmRemoveId(c.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add candidate modal */}
      {showAddModal && (
        <AddCandidateModal
          onClose={() => setShowAddModal(false)}
          onAdd={(empId, readiness) =>
            addMut.mutate(
              {
                candidate_employee_id: empId,
                readiness,
                fit_score: 0,
                rank: 1,
              },
              {
                onSuccess: () => {
                  toast.success('Aday havuza eklendi');
                  setShowAddModal(false);
                },
                onError: (e) => {
                  const msg = e instanceof Error ? e.message : 'Eklenemedi';
                  toast.error(msg);
                },
              },
            )
          }
          busy={addMut.isPending}
        />
      )}

      {/* Remove confirm modal */}
      {confirmRemoveId && (
        <ConfirmModal
          title="Adayı havuzdan çıkar?"
          body="Bu işlem geri alınabilir ama audit log'a yazılır."
          confirmText="Evet, çıkar"
          cancelText="Vazgeç"
          busy={removeMut.isPending}
          onCancel={() => setConfirmRemoveId(null)}
          onConfirm={() =>
            removeMut.mutate(
              { candidate_id: confirmRemoveId },
              {
                onSuccess: () => {
                  toast.success('Aday havuzdan çıkarıldı');
                  setConfirmRemoveId(null);
                },
                onError: (e) => {
                  toast.error(e instanceof Error ? e.message : 'Silme başarısız');
                },
              },
            )
          }
        />
      )}

      <div className="flex justify-end pt-2">
        <button
          onClick={() => router.back()}
          className="text-sm text-[#888] hover:text-[#5E5CE6]"
        >
          ← Geri
        </button>
      </div>
    </div>
  );
}

/* ─── Candidate card ─── */

interface CandidateCardProps {
  cand: SuccessionCandidate;
  onChangeReadiness: (next: Readiness) => void;
  onRemove: () => void;
}

const CandidateCard = ({ cand, onChangeReadiness, onRemove }: CandidateCardProps) => {
  // Display name we have only the id in the candidate row; for UX we show a
  // truncated id + readiness until /employees/{id} fetched on-demand.
  const displayName = `#${cand.candidate_employee_id.slice(0, 8)}`;
  const fit = Math.round(cand.fit_score ?? 0);
  const gaps = (cand.gaps_tr ?? '')
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div
      data-testid="candidate-card"
      data-candidate-id={cand.id}
      className="flex flex-col gap-2 rounded-lg border border-[#EDEDED] bg-white p-3 hover:border-[#5E5CE6]"
    >
      <div className="flex items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={avatarUrl(displayName)}
          alt=""
          width={28}
          height={28}
          className="h-7 w-7 rounded-full"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-[#111]">{displayName}</div>
          <div className="text-[11px] text-[#888]">Rank #{cand.rank}</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold" style={{ color: fitColor(fit) }}>
            %{fit}
          </div>
          <div className="text-[10px] text-[#888]">fit</div>
        </div>
      </div>

      {gaps.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {gaps.slice(0, 3).map((g, i) => (
            <span
              key={i}
              className="rounded bg-[#FEF3C7] px-1.5 py-0.5 text-[10px] font-medium text-[#D97706]"
            >
              {g}
            </span>
          ))}
          {gaps.length > 3 && (
            <span className="text-[10px] text-[#888]">+{gaps.length - 3}</span>
          )}
        </div>
      )}

      <div className="mt-1 flex items-center justify-between gap-2 border-t border-[#F0F0F0] pt-2">
        <select
          aria-label="Hazırlık"
          data-testid="readiness-select"
          value={cand.readiness}
          onChange={(e) => onChangeReadiness(e.target.value as Readiness)}
          className="rounded border border-[#E5E5E5] bg-white px-2 py-1 text-xs font-medium text-[#111]"
        >
          {READINESS_ORDER.map((k) => (
            <option key={k} value={k}>
              {READINESS_LABEL_TR[k]}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-1">
          <Link
            href={`/egitim?employee_id=${cand.candidate_employee_id}`}
            className="rounded border border-[#E5E5E5] px-2 py-1 text-[11px] font-medium text-[#5E5CE6] hover:border-[#5E5CE6]"
            title="Gelişim planı oluştur"
          >
            Gelişim
          </Link>
          <button
            onClick={onRemove}
            data-testid="remove-candidate-btn"
            className="rounded border border-[#FECACA] bg-white px-2 py-1 text-[11px] font-medium text-[#DC2626] hover:bg-[#FEF2F2]"
            title="Havuzdan çıkar"
          >
            Çıkar
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Add candidate modal ─── */

interface AddCandidateModalProps {
  onClose: () => void;
  onAdd: (employeeId: string, readiness: Readiness) => void;
  busy: boolean;
}

const AddCandidateModal = ({ onClose, onAdd, busy }: AddCandidateModalProps) => {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<EmployeeSearchResult | null>(null);
  const [readiness, setReadiness] = useState<Readiness>('ready_1y');
  const { data: results, isLoading } = useEmployeeSearch(query);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        data-testid="add-candidate-modal"
      >
        <div className="mb-1 text-lg font-bold text-[#111]">Havuza Aday Ekle</div>
        <p className="mb-4 text-sm text-[#888]">
          Çalışan arayın (isim, sicil, e-posta) ve hazırlık seviyesi belirleyin.
        </p>

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#888]">
          Çalışan
        </label>
        {selected ? (
          <div className="mb-3 flex items-center gap-3 rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl(`${selected.ad} ${selected.soyad}`)}
              alt=""
              className="h-8 w-8 rounded-full"
            />
            <div className="flex-1">
              <div className="text-sm font-semibold text-[#111]">
                {selected.ad} {selected.soyad}
              </div>
              <div className="text-xs text-[#888]">
                {selected.position_name || ''} {selected.department_name ? `· ${selected.department_name}` : ''}
              </div>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-xs text-[#888] hover:text-[#DC2626]"
            >
              Değiştir
            </button>
          </div>
        ) : (
          <div className="mb-3">
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="En az 2 karakter yazın..."
              data-testid="employee-search-input"
              className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-sm outline-none focus:border-[#5E5CE6]"
            />
            {query.trim().length >= 2 && (
              <div className="mt-2 max-h-48 overflow-auto rounded-md border border-[#EDEDED] bg-white">
                {isLoading && (
                  <div className="px-3 py-2 text-xs text-[#888]">Aranıyor...</div>
                )}
                {!isLoading && (results ?? []).length === 0 && (
                  <div className="px-3 py-2 text-xs text-[#888]">Sonuç bulunamadı.</div>
                )}
                {!isLoading &&
                  (results ?? []).map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelected(r)}
                      data-testid="employee-option"
                      className="flex w-full items-center gap-2 border-b border-[#F0F0F0] px-3 py-2 text-left last:border-b-0 hover:bg-[#FAFAFF]"
                    >
                      <span className="text-sm text-[#111]">
                        {r.ad} {r.soyad}
                      </span>
                      {r.employee_no && (
                        <span className="text-[11px] text-[#888]">#{r.employee_no}</span>
                      )}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-[#888]">
          Hazırlık Seviyesi
        </label>
        <select
          value={readiness}
          onChange={(e) => setReadiness(e.target.value as Readiness)}
          data-testid="readiness-select-modal"
          className="mb-4 w-full rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-sm"
        >
          {READINESS_ORDER.map((k) => (
            <option key={k} value={k}>
              {READINESS_LABEL_TR[k]}
            </option>
          ))}
        </select>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-semibold text-[#555] hover:bg-[#FAFAFA]"
          >
            Vazgeç
          </button>
          <button
            disabled={!selected || busy}
            onClick={() => selected && onAdd(selected.id, readiness)}
            data-testid="confirm-add-candidate"
            className="rounded-md bg-[#5E5CE6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4F4DD1] disabled:bg-[#A5A5C5]"
          >
            {busy ? 'Ekleniyor...' : 'Ekle'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── Confirm modal ─── */

interface ConfirmModalProps {
  title: string;
  body: string;
  confirmText: string;
  cancelText: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const ConfirmModal = ({
  title,
  body,
  confirmText,
  cancelText,
  busy,
  onCancel,
  onConfirm,
}: ConfirmModalProps) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    onClick={onCancel}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
      role="dialog"
      aria-modal="true"
    >
      <div className="mb-2 text-lg font-bold text-[#111]">{title}</div>
      <p className="mb-5 text-sm text-[#555]">{body}</p>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="rounded-md border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-semibold text-[#555]"
        >
          {cancelText}
        </button>
        <button
          disabled={busy}
          onClick={onConfirm}
          data-testid="confirm-remove"
          className="rounded-md bg-[#DC2626] px-4 py-2 text-sm font-semibold text-white hover:bg-[#B91C1C] disabled:bg-[#FCA5A5]"
        >
          {busy ? '...' : confirmText}
        </button>
      </div>
    </div>
  </div>
);
