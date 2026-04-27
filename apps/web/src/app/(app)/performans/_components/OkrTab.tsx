'use client';

import React, { useMemo, useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  AlertCircle,
  Building2,
  Calendar,
  ChevronDown,
  ChevronRight,
  Lock,
  Plus,
  RefreshCw,
  Target,
  Trash2,
  User,
  Users,
} from 'lucide-react';

import {
  isCycleClosing,
  isCycleEditable,
  useCreateOkr,
  useOkrTree,
  usePerformanceCycles,
  useUpdateKeyResult,
  useUpdateOkr,
  type OKR,
  type OKRKeyResult,
  type OKROwnerType,
  type OKRTreeNode,
  type PerformanceCycle,
} from '@/hooks/usePerformance';
import { useEmployees } from '@/hooks/useEmployees';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

/* ─────────────────────────────────────────────────────────────
 * OKR Tab — live data (no mocks).
 * API: /cycles, /okrs/tree, /okrs, /okrs/{id}/key-results/{krId}.
 * ───────────────────────────────────────────────────────────── */

// ============================================================================
// Helpers
// ============================================================================

const progressColor = (p: number) => {
  if (p >= 70) return '#059669';
  if (p >= 40) return '#D97706';
  return '#DC2626';
};

const progressBg = (p: number) => {
  if (p >= 70) return '#ECFDF5';
  if (p >= 40) return '#FFFBEB';
  return '#FEF2F2';
};

const ownerTypeLabel: Record<OKROwnerType, string> = {
  company: 'Şirket',
  department: 'Departman',
  team: 'Takım',
  individual: 'Bireysel',
};

const cycleStatusLabel: Record<PerformanceCycle['status'], string> = {
  planning: 'Planlama',
  goal_setting: 'Hedef Belirleme',
  active: 'Aktif',
  in_review: 'Değerlendirme',
  calibration: 'Kalibrasyon',
  closed: 'Kapalı',
  archived: 'Arşivlenmiş',
};

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

// Walk the tree and flatten so metric cards can compute aggregates.
function flattenTree(nodes: OKRTreeNode[] | undefined): OKRTreeNode[] {
  if (!nodes) return [];
  const out: OKRTreeNode[] = [];
  const stack = [...nodes];
  while (stack.length) {
    const n = stack.pop();
    if (!n) continue;
    out.push(n);
    stack.push(...n.children);
  }
  return out;
}

// ============================================================================
// Progress Bar (shared with KR + OKR cards)
// ============================================================================

interface ProgressBarProps {
  progress: number;
  height?: number;
}

const ProgressBar = ({ progress, height = 8 }: ProgressBarProps) => (
  <div
    className="w-full rounded-full"
    style={{ background: progressBg(progress), height }}
    role="progressbar"
    aria-valuenow={progress}
    aria-valuemin={0}
    aria-valuemax={100}
  >
    <div
      className="rounded-full transition-all duration-300"
      style={{
        width: `${Math.min(Math.max(progress, 0), 100)}%`,
        height,
        background: progressColor(progress),
      }}
    />
  </div>
);

// ============================================================================
// KR Progress Popover — inline % + confidence editor
// ============================================================================

interface KrProgressPopoverProps {
  okrId: string;
  kr: OKRKeyResult;
  cycleStatus: PerformanceCycle['status'];
  children: React.ReactNode;
}

const KrProgressPopover = ({ okrId, kr, cycleStatus, children }: KrProgressPopoverProps) => {
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState(kr.progress_pct);
  const [confidence, setConfidence] = useState(kr.confidence_score ?? 50);
  const [score, setScore] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const update = useUpdateKeyResult(okrId);
  const closing = isCycleClosing(cycleStatus);

  React.useEffect(() => {
    setProgress(kr.progress_pct);
    setConfidence(kr.confidence_score ?? 50);
  }, [kr.progress_pct, kr.confidence_score]);

  const handleSave = async () => {
    if (closing) {
      if (score < 0 || score > 1) {
        toast.error('Skor 0 ile 1 arası olmalı');
        return;
      }
      if (!comment.trim()) {
        toast.error('Kapanış yorumu zorunludur');
        return;
      }
    }
    try {
      await update.mutateAsync({
        id: kr.id,
        patch: {
          progress_pct: progress,
          confidence_score: confidence,
          current_value:
            kr.target_value > kr.start_value
              ? kr.start_value + ((kr.target_value - kr.start_value) * progress) / 100
              : progress,
        },
      });
      toast.success('KR güncellendi');
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Güncelleme başarısız');
    }
  };

  if (!isCycleEditable(cycleStatus) && !closing) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left"
      >
        {children}
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Kapat"
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-[320px] rounded-lg border border-[#E5E5E5] bg-white p-4 shadow-lg">
            <h4 className="mb-3 text-[13px] font-semibold text-[#0A0A0A]">
              {closing ? 'Çeyrek kapanış değerlendirmesi' : 'İlerleme güncelle'}
            </h4>

            {!closing && (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between text-[11px] font-medium text-[#525252]">
                    <span>İlerleme</span>
                    <span className="font-semibold">%{progress}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={progress}
                    onChange={(e) => setProgress(Number(e.target.value))}
                    className="mt-1 w-full accent-[#5E5CE6]"
                    aria-label="İlerleme yüzdesi"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-[11px] font-medium text-[#525252]">
                    <span>Güven (confidence)</span>
                    <span className="font-semibold">%{confidence}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={confidence}
                    onChange={(e) => setConfidence(Number(e.target.value))}
                    className="mt-1 w-full accent-[#5E5CE6]"
                    aria-label="Güven skoru"
                  />
                </div>
              </div>
            )}

            {closing && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#525252]">
                    Kapanış skoru (0.0 – 1.0)
                  </label>
                  <input
                    type="number"
                    step={0.1}
                    min={0}
                    max={1}
                    value={score}
                    onChange={(e) => setScore(Number(e.target.value))}
                    className="mt-1 w-full rounded-md border border-[#E5E5E5] px-2 py-1.5 text-[13px] focus:border-[#5E5CE6] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#525252]">
                    Değerlendirme yorumu
                  </label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    placeholder="Bu çeyrekteki performansı kısaca değerlendir"
                    className="mt-1 w-full rounded-md border border-[#E5E5E5] px-2 py-1.5 text-[13px] focus:border-[#5E5CE6] focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-[#E5E5E5] px-3 py-1.5 text-[12px] font-medium text-[#525252] hover:bg-[#FAFAFA]"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={update.isPending}
                className="rounded-md bg-[#5E5CE6] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#4B49B6] disabled:opacity-50"
              >
                {update.isPending ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ============================================================================
// OKR Card — recursive
// ============================================================================

interface OkrCardProps {
  node: OKRTreeNode;
  cycleStatus: PerformanceCycle['status'];
  depth: number;
}

const ownerIcon: Record<OKROwnerType, React.ReactNode> = {
  company: <Building2 className="h-3.5 w-3.5" />,
  department: <Users className="h-3.5 w-3.5" />,
  team: <Users className="h-3.5 w-3.5" />,
  individual: <User className="h-3.5 w-3.5" />,
};

const OkrCard = ({ node, cycleStatus, depth }: OkrCardProps) => {
  const [expanded, setExpanded] = useState(depth < 2);
  const closing = isCycleClosing(cycleStatus);
  const okrUpdate = useUpdateOkr(node.id);
  const p = node.progress_pct;

  const onStatusChange = async (status: OKR['status']) => {
    try {
      await okrUpdate.mutateAsync({ status });
      toast.success('Durum güncellendi');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Güncelleme başarısız');
    }
  };

  return (
    <div
      className="rounded-xl border border-[#F0F0F0] bg-white"
      style={{ marginLeft: depth * 24 }}
      data-testid="okr-card"
    >
      <div className="flex w-full items-start gap-3 p-4">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md hover:bg-[#F5F5F5]"
          aria-label={expanded ? 'Daralt' : 'Genişlet'}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-[#737373]" />
          ) : (
            <ChevronRight className="h-4 w-4 text-[#737373]" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-semibold text-[#0A0A0A]">
              {node.objective_tr}
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[11px] font-medium text-[#525252]"
              title="Sahip türü"
            >
              {ownerIcon[node.owner_type]}
              {ownerTypeLabel[node.owner_type]}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ background: progressBg(p), color: progressColor(p) }}
            >
              %{p}
            </span>
            {node.confidence_score != null && (
              <span className="rounded-full bg-[#EFF6FF] px-2 py-0.5 text-[11px] font-medium text-[#1D4ED8]">
                Güven %{node.confidence_score}
              </span>
            )}
            <span className="rounded-full border border-[#E5E5E5] px-2 py-0.5 text-[11px] font-medium text-[#525252]">
              {node.status}
            </span>
          </div>
          <div className="mt-2">
            <ProgressBar progress={p} />
          </div>
          {node.description && (
            <p className="mt-2 text-[12px] text-[#737373]">{node.description}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isCycleEditable(cycleStatus) && (
            <select
              aria-label="OKR durumu"
              value={node.status}
              onChange={(e) => onStatusChange(e.target.value as OKR['status'])}
              disabled={okrUpdate.isPending}
              className="rounded-md border border-[#E5E5E5] px-2 py-1 text-[11px] text-[#525252] focus:border-[#5E5CE6] focus:outline-none"
            >
              <option value="draft">Taslak</option>
              <option value="active">Aktif</option>
              <option value="on_track">Rayında</option>
              <option value="at_risk">Riskli</option>
              <option value="off_track">Saptı</option>
              <option value="completed">Tamamlandı</option>
              <option value="abandoned">İptal</option>
            </select>
          )}
          {closing && (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#FEF3C7] px-2 py-1 text-[11px] font-medium text-[#B45309]">
              <Lock className="h-3 w-3" /> Kapanışta
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#F5F5F5] px-5 pb-4 pt-3">
          {node.key_results && node.key_results.length > 0 ? (
            <ul className="space-y-3">
              {node.key_results.map((kr, idx) => (
                <li key={kr.id} className="flex items-start gap-3">
                  <span className="mt-1 w-8 shrink-0 text-[11px] font-semibold text-[#A3A3A3]">
                    KR{idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <KrProgressPopover okrId={node.id} kr={kr} cycleStatus={cycleStatus}>
                      <div className="rounded-md p-2 hover:bg-[#FAFAFA]">
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] text-[#525252]">{kr.title_tr}</span>
                          <span
                            className="shrink-0 text-[12px] font-semibold"
                            style={{ color: progressColor(kr.progress_pct) }}
                          >
                            %{kr.progress_pct}
                          </span>
                        </div>
                        <div className="mt-1">
                          <ProgressBar progress={kr.progress_pct} height={6} />
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-[11px] text-[#A3A3A3]">
                          <span>
                            Hedef: {kr.target_value}
                            {kr.unit ? ` ${kr.unit}` : ''}
                          </span>
                          <span>
                            Şimdiki: {kr.current_value}
                            {kr.unit ? ` ${kr.unit}` : ''}
                          </span>
                          {kr.confidence_score != null && (
                            <span>Güven %{kr.confidence_score}</span>
                          )}
                        </div>
                      </div>
                    </KrProgressPopover>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[12px] text-[#A3A3A3]">Bu OKR için henüz anahtar sonuç yok.</p>
          )}

          {node.children.length > 0 && (
            <div className="mt-4 space-y-3 border-l-2 border-dashed border-[#EDEDED] pl-3">
              {node.children.map((child) => (
                <OkrCard
                  key={child.id}
                  node={child}
                  cycleStatus={cycleStatus}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// New OKR form
// ============================================================================

const KrSchema = z.object({
  title_tr: z.string().min(3, 'KR başlığı en az 3 karakter olmalı').max(200),
  target_value: z.coerce
    .number({ invalid_type_error: 'Sayısal hedef girin' })
    .finite('Geçerli bir sayı girin'),
  start_value: z.coerce.number().finite().default(0),
  unit: z.string().max(20).optional(),
  metric_type: z.enum(['numeric', 'percentage', 'boolean', 'milestone', 'qualitative']),
});

const OkrFormSchema = z.object({
  cycle_id: z.string().uuid({ message: 'Geçerli bir dönem seçin' }),
  owner_type: z.enum(['company', 'department', 'team', 'individual']),
  owner_id: z.string().uuid({ message: 'Sahip seçin' }).optional().or(z.literal('')),
  parent_okr_id: z.string().uuid().optional().or(z.literal('')),
  objective_tr: z.string().min(3, 'Hedef başlığı en az 3 karakter olmalı').max(200),
  description: z.string().max(2000, 'Açıklama 2000 karakteri geçemez').optional().or(z.literal('')),
  quarter_label: z.string().max(10).optional().or(z.literal('')),
  key_results: z.array(KrSchema).min(1, 'En az 1 KR ekleyin').max(5, 'En fazla 5 KR eklenebilir'),
});

type OkrFormValues = z.infer<typeof OkrFormSchema>;

interface NewOkrDialogProps {
  open: boolean;
  onClose: () => void;
  cycles: PerformanceCycle[];
  activeCycleId: string;
  parentCandidates: OKRTreeNode[];
}

function flattenForParent(nodes: OKRTreeNode[], depth = 0): Array<{ id: string; label: string }> {
  const out: Array<{ id: string; label: string }> = [];
  for (const n of nodes) {
    out.push({
      id: n.id,
      label: `${'  '.repeat(depth)}${ownerTypeLabel[n.owner_type]} · ${n.objective_tr}`,
    });
    if (n.children.length) out.push(...flattenForParent(n.children, depth + 1));
  }
  return out;
}

const NewOkrDialog = ({
  open,
  onClose,
  cycles,
  activeCycleId,
  parentCandidates,
}: NewOkrDialogProps) => {
  const createOkr = useCreateOkr();
  const [ownerSearch, setOwnerSearch] = useState('');
  const debouncedOwnerSearch = useDebouncedValue(ownerSearch, 250);
  const { data: employees, isLoading: employeesLoading } = useEmployees({
    search: debouncedOwnerSearch || undefined,
    limit: 10,
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<OkrFormValues>({
    resolver: zodResolver(OkrFormSchema),
    defaultValues: {
      cycle_id: activeCycleId,
      owner_type: 'company',
      objective_tr: '',
      description: '',
      quarter_label: '',
      parent_okr_id: '',
      owner_id: '',
      key_results: [
        { title_tr: '', metric_type: 'numeric', start_value: 0, target_value: 100, unit: '' },
      ],
    },
  });

  React.useEffect(() => {
    if (open) {
      reset({
        cycle_id: activeCycleId,
        owner_type: 'company',
        objective_tr: '',
        description: '',
        quarter_label: '',
        parent_okr_id: '',
        owner_id: '',
        key_results: [
          { title_tr: '', metric_type: 'numeric', start_value: 0, target_value: 100, unit: '' },
        ],
      });
      setOwnerSearch('');
    }
  }, [open, activeCycleId, reset]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'key_results',
  });

  const ownerType = watch('owner_type');
  const ownerId = watch('owner_id');
  const selectedEmployee = employees?.items.find((e) => e.id === ownerId);

  const parentFlat = useMemo(() => flattenForParent(parentCandidates), [parentCandidates]);

  const onSubmit = async (values: OkrFormValues) => {
    try {
      const payload = {
        cycle_id: values.cycle_id,
        owner_type: values.owner_type,
        objective_tr: values.objective_tr.trim(),
        description: values.description?.trim() || undefined,
        quarter_label: values.quarter_label?.trim() || undefined,
        owner_id: values.owner_id || undefined,
        parent_okr_id: values.parent_okr_id || undefined,
        key_results: values.key_results.map((k, i) => ({
          title_tr: k.title_tr.trim(),
          metric_type: k.metric_type,
          start_value: Number(k.start_value ?? 0),
          target_value: Number(k.target_value),
          unit: k.unit?.trim() || undefined,
          order_index: i,
        })),
      };
      await createOkr.mutateAsync(payload);
      toast.success('OKR oluşturuldu');
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'OKR oluşturulamadı');
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="relative mt-10 w-full max-w-[640px] rounded-2xl border border-[#F0F0F0] bg-white shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-[#F0F0F0] px-6 py-4">
          <div>
            <h3 className="text-[15px] font-semibold text-[#0A0A0A]">Yeni OKR</h3>
            <p className="text-[12px] text-[#737373]">
              Bir hedef ve 1-5 arası ölçülebilir anahtar sonuç ekleyin.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-[#A3A3A3] hover:bg-[#F5F5F5] hover:text-[#525252]"
            aria-label="Kapat"
          >
            ×
          </button>
        </header>

        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-[12px] font-medium text-[#525252]">Dönem</label>
            <select
              {...register('cycle_id')}
              className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-[13px] focus:border-[#5E5CE6] focus:outline-none"
            >
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name_tr} · {cycleStatusLabel[c.status]}
                </option>
              ))}
            </select>
            {errors.cycle_id && (
              <p className="mt-1 text-[11px] text-[#DC2626]">{errors.cycle_id.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-medium text-[#525252]">Hedef</label>
            <input
              {...register('objective_tr')}
              placeholder="Ör: Müşteri memnuniyetini yükselt"
              className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-[13px] focus:border-[#5E5CE6] focus:outline-none"
            />
            {errors.objective_tr && (
              <p className="mt-1 text-[11px] text-[#DC2626]">{errors.objective_tr.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-[12px] font-medium text-[#525252]">
              Açıklama (opsiyonel)
            </label>
            <textarea
              {...register('description')}
              rows={2}
              placeholder="Neden önemli? Hangi stratejik temayı destekliyor?"
              className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-[13px] focus:border-[#5E5CE6] focus:outline-none"
            />
            {errors.description && (
              <p className="mt-1 text-[11px] text-[#DC2626]">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[#525252]">Seviye</label>
              <select
                {...register('owner_type')}
                className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-[13px] focus:border-[#5E5CE6] focus:outline-none"
              >
                <option value="company">Şirket</option>
                <option value="department">Departman</option>
                <option value="team">Takım</option>
                <option value="individual">Bireysel</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[#525252]">
                Üst OKR (opsiyonel)
              </label>
              <select
                {...register('parent_okr_id')}
                className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-[13px] focus:border-[#5E5CE6] focus:outline-none"
              >
                <option value="">— Yok —</option>
                {parentFlat.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {ownerType === 'individual' && (
            <div>
              <label className="mb-1 block text-[12px] font-medium text-[#525252]">
                Çalışan sahip
              </label>
              {selectedEmployee ? (
                <div className="flex items-center justify-between rounded-md border border-[#E5E5E5] bg-[#F9FAFB] px-3 py-2">
                  <div className="text-[13px] text-[#0A0A0A]">
                    {selectedEmployee.tamAd}
                    <span className="ml-2 text-[11px] text-[#737373]">
                      ({selectedEmployee.email})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setValue('owner_id', '');
                      setOwnerSearch('');
                    }}
                    className="text-[11px] text-[#5E5CE6] hover:underline"
                  >
                    Değiştir
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    value={ownerSearch}
                    onChange={(e) => setOwnerSearch(e.target.value)}
                    placeholder="Çalışan ara (ad / e-posta)"
                    aria-label="Çalışan ara"
                    className="w-full rounded-md border border-[#E5E5E5] px-3 py-2 text-[13px] focus:border-[#5E5CE6] focus:outline-none"
                  />
                  {debouncedOwnerSearch.length > 0 && (
                    <ul className="mt-1 max-h-40 overflow-y-auto rounded-md border border-[#E5E5E5] bg-white shadow-sm">
                      {employeesLoading && (
                        <li className="px-3 py-2 text-[12px] text-[#A3A3A3]">Aranıyor…</li>
                      )}
                      {!employeesLoading && (employees?.items ?? []).length === 0 && (
                        <li className="px-3 py-2 text-[12px] text-[#A3A3A3]">
                          Eşleşen çalışan yok
                        </li>
                      )}
                      {(employees?.items ?? []).map((e) => (
                        <li key={e.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setValue('owner_id', e.id, { shouldValidate: true });
                              setOwnerSearch('');
                            }}
                            className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-[#F5F5F5]"
                          >
                            <span className="text-[13px] text-[#0A0A0A]">{e.tamAd}</span>
                            <span className="text-[11px] text-[#737373]">{e.email}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {errors.owner_id && (
                <p className="mt-1 text-[11px] text-[#DC2626]">{errors.owner_id.message}</p>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-medium text-[#525252]">
                Anahtar Sonuçlar ({fields.length}/5)
              </label>
              {fields.length < 5 && (
                <button
                  type="button"
                  onClick={() =>
                    append({
                      title_tr: '',
                      metric_type: 'numeric',
                      start_value: 0,
                      target_value: 100,
                      unit: '',
                    })
                  }
                  className="inline-flex items-center gap-1 text-[12px] font-medium text-[#5E5CE6] hover:underline"
                >
                  <Plus className="h-3 w-3" /> KR ekle
                </button>
              )}
            </div>
            <div className="mt-2 space-y-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="rounded-md border border-[#E5E5E5] bg-[#FAFAFA] p-3"
                  data-testid={`kr-row-${index}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#A3A3A3]">KR{index + 1}</span>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="text-[#A3A3A3] hover:text-[#DC2626]"
                        aria-label="KR'yi sil"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <input
                    {...register(`key_results.${index}.title_tr`)}
                    placeholder="Ör: NPS skoru 45'ten 60'a çıksın"
                    className="mt-2 w-full rounded-md border border-[#E5E5E5] bg-white px-2 py-1.5 text-[12px] focus:border-[#5E5CE6] focus:outline-none"
                  />
                  {errors.key_results?.[index]?.title_tr && (
                    <p className="mt-1 text-[11px] text-[#DC2626]">
                      {errors.key_results[index]?.title_tr?.message}
                    </p>
                  )}
                  <div className="mt-2 grid grid-cols-4 gap-2">
                    <Controller
                      control={control}
                      name={`key_results.${index}.metric_type`}
                      render={({ field: f }) => (
                        <select
                          {...f}
                          className="rounded-md border border-[#E5E5E5] bg-white px-2 py-1.5 text-[11px] focus:border-[#5E5CE6] focus:outline-none"
                        >
                          <option value="numeric">Sayısal</option>
                          <option value="percentage">Yüzde</option>
                          <option value="boolean">Evet/Hayır</option>
                          <option value="milestone">Kilometre taşı</option>
                          <option value="qualitative">Nitel</option>
                        </select>
                      )}
                    />
                    <input
                      {...register(`key_results.${index}.start_value`)}
                      type="number"
                      step="any"
                      placeholder="Başl."
                      className="rounded-md border border-[#E5E5E5] bg-white px-2 py-1.5 text-[11px] focus:border-[#5E5CE6] focus:outline-none"
                    />
                    <input
                      {...register(`key_results.${index}.target_value`)}
                      type="number"
                      step="any"
                      placeholder="Hedef"
                      className="rounded-md border border-[#E5E5E5] bg-white px-2 py-1.5 text-[11px] focus:border-[#5E5CE6] focus:outline-none"
                    />
                    <input
                      {...register(`key_results.${index}.unit`)}
                      placeholder="Birim"
                      className="rounded-md border border-[#E5E5E5] bg-white px-2 py-1.5 text-[11px] focus:border-[#5E5CE6] focus:outline-none"
                    />
                  </div>
                  {errors.key_results?.[index]?.target_value && (
                    <p className="mt-1 text-[11px] text-[#DC2626]">
                      {errors.key_results[index]?.target_value?.message}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {errors.key_results?.message && (
              <p className="mt-1 text-[11px] text-[#DC2626]">{errors.key_results.message}</p>
            )}
          </div>
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-[#F0F0F0] px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[#E5E5E5] px-4 py-2 text-[13px] font-medium text-[#525252] hover:bg-[#F5F5F5]"
          >
            Vazgeç
          </button>
          <button
            type="submit"
            disabled={isSubmitting || createOkr.isPending}
            data-testid="submit-new-okr"
            className="rounded-md bg-[#5E5CE6] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#4B49B6] disabled:opacity-50"
          >
            {isSubmitting || createOkr.isPending ? 'Oluşturuluyor…' : 'Kaydet'}
          </button>
        </footer>
      </form>
    </div>
  );
};

// ============================================================================
// Main Tab
// ============================================================================

export const OkrTab = () => {
  const [cycleId, setCycleId] = useState<string>('');
  const [newDialog, setNewDialog] = useState(false);

  const cyclesQuery = usePerformanceCycles();
  const cycles = useMemo(() => cyclesQuery.data?.items ?? [], [cyclesQuery.data]);

  // Default to the first active / goal_setting / planning cycle.
  React.useEffect(() => {
    if (cycleId || cycles.length === 0) return;
    const pickOrder: PerformanceCycle['status'][] = [
      'active',
      'in_review',
      'calibration',
      'goal_setting',
      'planning',
      'closed',
      'archived',
    ];
    const picked = pickOrder
      .map((status) => cycles.find((c) => c.status === status))
      .find(Boolean);
    if (picked) setCycleId(picked.id);
  }, [cycles, cycleId]);

  const activeCycle = cycles.find((c) => c.id === cycleId);
  const treeQuery = useOkrTree(cycleId || null);
  const tree = useMemo<OKRTreeNode[]>(
    () => treeQuery.data?.items ?? [],
    [treeQuery.data],
  );
  const flat = useMemo(() => flattenTree(tree), [tree]);

  const avgProgress =
    flat.length === 0 ? 0 : Math.round(flat.reduce((s, n) => s + n.progress_pct, 0) / flat.length);
  const onTrackCount = flat.filter((n) => n.progress_pct >= 70).length;
  const atRiskCount = flat.filter((n) => n.progress_pct < 40).length;

  return (
    <div className="space-y-6" data-testid="okr-tab">
      {/* Header + cycle selector */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-[#0A0A0A]">OKR Yönetimi</h2>
          <p className="mt-0.5 text-[12px] text-[#737373]">
            Aktif dönemde şirket, departman ve bireysel hedefleri takip edin.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={cycleId}
            onChange={(e) => setCycleId(e.target.value)}
            disabled={cyclesQuery.isLoading || cycles.length === 0}
            className="rounded-md border border-[#E5E5E5] px-3 py-2 text-[13px] focus:border-[#5E5CE6] focus:outline-none"
            aria-label="Dönem seç"
            data-testid="cycle-selector"
          >
            {cycles.length === 0 && <option value="">Dönem yok</option>}
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name_tr} — {cycleStatusLabel[c.status]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => treeQuery.refetch()}
            disabled={!cycleId || treeQuery.isFetching}
            className="inline-flex items-center gap-1 rounded-md border border-[#E5E5E5] px-3 py-2 text-[12px] font-medium text-[#525252] hover:bg-[#FAFAFA] disabled:opacity-40"
            aria-label="Yenile"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${treeQuery.isFetching ? 'animate-spin' : ''}`}
            />
            Yenile
          </button>
          <button
            type="button"
            onClick={() => setNewDialog(true)}
            disabled={!activeCycle || !isCycleEditable(activeCycle.status)}
            data-testid="new-okr-btn"
            className="inline-flex items-center gap-2 rounded-md bg-[#5E5CE6] px-3 py-2 text-[13px] font-medium text-white hover:bg-[#4B49B6] disabled:opacity-40"
          >
            <Plus className="h-4 w-4" /> Yeni OKR
          </button>
        </div>
      </div>

      {/* Active cycle banner */}
      {activeCycle && (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-[#E5E5E5] bg-[#F9FAFB] px-4 py-3 text-[12px] text-[#525252]">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatDate(activeCycle.period_start)} — {formatDate(activeCycle.period_end)}
          </span>
          <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-[#525252] ring-1 ring-[#E5E5E5]">
            {cycleStatusLabel[activeCycle.status]}
          </span>
          {isCycleClosing(activeCycle.status) && (
            <span className="inline-flex items-center gap-1 rounded-md bg-[#FEF3C7] px-2 py-1 text-[11px] font-medium text-[#B45309]">
              <Lock className="h-3 w-3" />
              Çeyrek kapanış modu: KR düzenleme kapalı, skor + yorum zorunlu.
            </span>
          )}
        </div>
      )}

      {/* Metric cards */}
      {cycleId && treeQuery.isSuccess && flat.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[#F0F0F0] bg-white p-5">
            <div className="text-[12px] font-medium text-[#737373]">Ortalama İlerleme</div>
            <div className="mt-1 text-[24px] font-bold text-[#5E5CE6]">%{avgProgress}</div>
          </div>
          <div className="rounded-xl border border-[#F0F0F0] bg-white p-5">
            <div className="text-[12px] font-medium text-[#737373]">Hedefe Yakın (≥%70)</div>
            <div className="mt-1 text-[24px] font-bold text-[#059669]">{onTrackCount}</div>
          </div>
          <div className="rounded-xl border border-[#F0F0F0] bg-white p-5">
            <div className="text-[12px] font-medium text-[#737373]">Riskli (&lt;%40)</div>
            <div className="mt-1 text-[24px] font-bold text-[#DC2626]">{atRiskCount}</div>
          </div>
        </div>
      )}

      {/* Body */}
      {cyclesQuery.isLoading && <LoadingSkeleton />}
      {cyclesQuery.isError && (
        <ErrorState
          message={cyclesQuery.error?.message ?? 'Dönemler yüklenemedi'}
          onRetry={() => cyclesQuery.refetch()}
        />
      )}
      {cyclesQuery.isSuccess && cycles.length === 0 && (
        <EmptyCard
          icon={<Target className="h-5 w-5 text-[#A3A3A3]" />}
          title="Henüz dönem tanımlı değil"
          description="OKR kullanabilmek için önce Ayarlar → Performans'tan bir dönem oluşturun."
        />
      )}

      {cycleId && treeQuery.isLoading && <LoadingSkeleton />}
      {cycleId && treeQuery.isError && (
        <ErrorState
          message={treeQuery.error?.message ?? 'OKR ağacı yüklenemedi'}
          onRetry={() => treeQuery.refetch()}
        />
      )}
      {cycleId && treeQuery.isSuccess && flat.length === 0 && activeCycle && (
        <EmptyCard
          icon={<Target className="h-5 w-5 text-[#A3A3A3]" />}
          title="Bu dönemde henüz OKR yok"
          description="İlk OKR'nizi oluşturun ve takımınızı strateji etrafında hizalayın."
          action={
            <button
              type="button"
              onClick={() => setNewDialog(true)}
              disabled={!isCycleEditable(activeCycle.status)}
              className="inline-flex items-center gap-2 rounded-md bg-[#5E5CE6] px-3 py-2 text-[13px] font-medium text-white hover:bg-[#4B49B6] disabled:opacity-40"
            >
              <Plus className="h-4 w-4" /> Yeni OKR oluştur
            </button>
          }
        />
      )}

      {activeCycle && tree.length > 0 && (
        <div className="space-y-3" data-testid="okr-tree">
          {tree.map((node) => (
            <OkrCard
              key={node.id}
              node={node}
              cycleStatus={activeCycle.status}
              depth={0}
            />
          ))}
        </div>
      )}

      {activeCycle && (
        <NewOkrDialog
          open={newDialog}
          onClose={() => setNewDialog(false)}
          cycles={cycles.filter((c) => isCycleEditable(c.status))}
          activeCycleId={activeCycle.id}
          parentCandidates={tree}
        />
      )}
    </div>
  );
};

// ============================================================================
// Skeleton / Error / Empty
// ============================================================================

const LoadingSkeleton = () => (
  <div className="space-y-3" role="status" aria-live="polite">
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="animate-pulse rounded-xl border border-[#F0F0F0] bg-white p-5"
      >
        <div className="h-4 w-48 rounded bg-[#F5F5F5]" />
        <div className="mt-3 h-2 w-full rounded bg-[#F5F5F5]" />
        <div className="mt-4 space-y-2">
          <div className="h-3 w-2/3 rounded bg-[#F5F5F5]" />
          <div className="h-3 w-1/2 rounded bg-[#F5F5F5]" />
        </div>
      </div>
    ))}
  </div>
);

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

const ErrorState = ({ message, onRetry }: ErrorStateProps) => (
  <div
    role="alert"
    className="flex items-start gap-3 rounded-lg border border-[#FEE2E2] bg-[#FEF2F2] p-4"
  >
    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#DC2626]" />
    <div className="flex-1">
      <p className="text-[13px] font-medium text-[#991B1B]">Bir hata oluştu</p>
      <p className="mt-0.5 text-[12px] text-[#B91C1C]">{message}</p>
    </div>
    <button
      type="button"
      onClick={onRetry}
      className="inline-flex items-center gap-1 rounded-md border border-[#DC2626] px-3 py-1.5 text-[12px] font-medium text-[#DC2626] hover:bg-white"
    >
      <RefreshCw className="h-3 w-3" /> Tekrar dene
    </button>
  </div>
);

interface EmptyCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

const EmptyCard = ({ icon, title, description, action }: EmptyCardProps) => (
  <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-[#E5E5E5] bg-white px-6 py-12 text-center">
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F5F5F5]">
      {icon}
    </div>
    <div>
      <p className="text-[13px] font-semibold text-[#0A0A0A]">{title}</p>
      <p className="mt-1 text-[12px] text-[#737373]">{description}</p>
    </div>
    {action}
  </div>
);
