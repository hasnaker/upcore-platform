'use client';

import { useState } from 'react';
import { BookOpen, Check, Clock, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  useAssignIntervention,
  useInterventionCatalog,
  CATEGORY_LABEL,
  TIER_LABEL,
  type CatalogItem,
  type EvidenceTier,
} from '@/hooks/useInterventions';

interface Props {
  employeeId: string;
  employeeName: string;
  onClose: () => void;
}

const TIER_COLOR: Record<EvidenceTier, string> = {
  A: 'bg-green-soft text-green',
  B: 'bg-accent-soft text-accent',
  C: 'bg-amber-soft text-amber',
};

/**
 * Modal — kritik çalışana evidence-based müdahale atama akışı.
 * Backend akışı: POST /api/v1/interventions/assignments
 * Consent akışı ayrıca çalışana e-posta gider (notification service).
 */
export function AssignInterventionModal({ employeeId, employeeName, onClose }: Props) {
  const { data: catalog = [], isLoading } = useInterventionCatalog();
  const assign = useAssignIntervention();
  const [selected, setSelected] = useState<CatalogItem | null>(null);
  const [notes, setNotes] = useState('');

  const onAssign = async () => {
    if (!selected) return;
    try {
      await assign.mutateAsync({
        intervention_id: selected.id,
        employee_id: employeeId,
        notes: notes || undefined,
        trigger_source: 'burnout_dashboard',
      });
      toast.success(`${selected.title_tr} önerildi`, {
        description: `${employeeName} için bilim-temelli consent e-postası gönderildi. Çalışan portal/muhadale sayfasında kararı verecek.`,
        icon: <Check className="h-4 w-4" />,
      });
      onClose();
    } catch (err: unknown) {
      toast.error('Atama başarısız', {
        description: err instanceof Error ? err.message : 'Bilinmeyen hata',
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-line bg-bg shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-line p-5">
          <div>
            <h2 className="text-lg font-semibold text-ink">Koçluk / Müdahale Öner</h2>
            <p className="mt-0.5 text-[12px] text-ink-60">
              {employeeName} için evidence-based müdahale seçin.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-ink-40 hover:bg-bg-2 hover:text-ink"
            aria-label="Kapat"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Catalog list */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading && (
            <div className="flex flex-col gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-lg border border-line bg-bg-2"
                />
              ))}
            </div>
          )}

          {!isLoading && catalog.length === 0 && (
            <div className="rounded-lg border border-line bg-bg-2 p-6 text-center text-sm text-ink-60">
              Aktif müdahale kataloğunda henüz öğe yok. İK ekibiyle katalog
              doldurulmasını isteyin.
            </div>
          )}

          {!isLoading && catalog.length > 0 && (
            <div className="flex flex-col gap-2">
              {catalog.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item)}
                  className={`flex flex-col gap-2 rounded-lg border p-4 text-left transition-all ${
                    selected?.id === item.id
                      ? 'border-accent bg-accent-soft'
                      : 'border-line bg-bg hover:border-ink-20'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-bg-2">
                      {selected?.id === item.id ? (
                        <Check className="h-4 w-4 text-accent" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-ink-40" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-medium text-ink">{item.title_tr}</h3>
                        <span
                          className={`inline-flex h-5 items-center rounded px-1.5 text-[10px] font-semibold ${TIER_COLOR[item.evidence_tier]}`}
                        >
                          {TIER_LABEL[item.evidence_tier]}
                        </span>
                        <span className="inline-flex h-5 items-center rounded bg-bg-3 px-1.5 text-[10px] font-medium text-ink-60">
                          {CATEGORY_LABEL[item.category]}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[12px] text-ink-60">
                        {item.description_tr}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-ink-40">
                        {item.duration_weeks && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {item.duration_weeks} hafta süre
                          </span>
                        )}
                        {item.time_to_effect_weeks && (
                          <span>Etki: {item.time_to_effect_weeks} haftada görünür</span>
                        )}
                        {item.expected_effect_size != null && (
                          <span>
                            d = {item.expected_effect_size.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notes + submit */}
        {selected && (
          <div className="border-t border-line bg-bg-2 p-5">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-widest text-ink-40">
                Not (opsiyonel — {employeeName} görmeyecek)
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Örn: Yoğun Q4 dönemi öncesi proaktif koçluk."
                rows={2}
                className="rounded-md border border-line bg-bg p-2 text-sm text-ink placeholder:text-ink-40 focus:border-accent focus:outline-none"
              />
            </label>

            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-[11px] text-ink-40">
                Çalışan consent e-postası alacak, kabul ederse başlar.
              </p>
              <button
                type="button"
                onClick={onAssign}
                disabled={assign.isPending}
                className="inline-flex items-center gap-1.5 rounded-md bg-accent px-5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-50"
              >
                <BookOpen className="h-3.5 w-3.5" />
                {assign.isPending ? 'Atanıyor…' : 'Müdahaleyi Öner'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
