'use client';

import { useMemo } from 'react';
import { Greeting } from './_components/Greeting';
import { PriorityActions } from './_components/PriorityActions';
import { WeeklyRecap } from './_components/WeeklyRecap';
import { ModuleOverview } from './_components/ModuleOverview';
import { FirstPulseCTA } from './_components/FirstPulseCTA';
import { usePriorityActions, type RankedAction } from '@/hooks/useActions';

type Urgency = 'critical' | 'warning' | 'info';
type ActionCategory = 'tukenmislik' | 'ise-alim' | 'izin' | 'gelisim';

interface ActionItem {
  id: string;
  urgency: Urgency;
  title: string;
  description: string;
  department: string;
  affectedCount: number;
  suggestedAction: string;
  reasoning: string[];
  status: 'pending' | 'approved' | 'rejected' | 'deferred';
  category: ActionCategory;
  impactBefore: number;
  impactAfter: number;
  impactLabel: string;
}

const urgencyFromScore = (urgency: number): Urgency => {
  if (urgency >= 0.75) return 'critical';
  if (urgency >= 0.45) return 'warning';
  return 'info';
};

const categoryFromType = (type: string): ActionCategory => {
  const t = type.toLowerCase();
  if (t.includes('burn') || t.includes('tukenmislik') || t.includes('coaching')) return 'tukenmislik';
  if (t.includes('hire') || t.includes('recruit') || t.includes('candidate')) return 'ise-alim';
  if (t.includes('leave') || t.includes('izin')) return 'izin';
  return 'gelisim';
};

const mapRankedAction = (a: RankedAction): ActionItem => {
  const urgency = urgencyFromScore(a.urgency);
  const impactBefore = Math.round(a.impact * 100);
  const impactAfter = Math.max(5, impactBefore - Math.round(a.actionability * 45));
  return {
    id: a.action_id,
    urgency,
    title: a.title_tr,
    description: a.rationale_tr,
    department: a.target.name_masked || '—',
    affectedCount: a.target.employee_id ? 1 : 0,
    suggestedAction: a.cta.label_tr ?? 'İncele',
    reasoning: a.supporting_signals.length
      ? a.supporting_signals
      : [a.rationale_tr],
    status: 'pending',
    category: categoryFromType(a.type),
    impactBefore,
    impactAfter,
    impactLabel: 'risk skoru',
  };
};

export default function PanelPage() {
  const { data, isLoading, isError, error, refetch } = usePriorityActions();

  const actions: ActionItem[] = useMemo(
    () => (data?.actions ?? []).map(mapRankedAction),
    [data],
  );

  return (
    <div className="flex flex-col gap-12">
      <Greeting pendingActionCount={actions.length} />

      {/* Priority Actions — gerçek action-center verisi */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-[#A3A3A3]">
            Öncelikli Aksiyonlar
          </h2>
          {data?.generated_at && (
            <span className="text-[11px] text-[#A3A3A3]">
              {new Date(data.generated_at).toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>

        {isLoading && (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-lg border border-[#EDEDED] bg-white"
              />
            ))}
          </div>
        )}

        {isError && (
          <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-5 py-6 text-sm text-[#B91C1C]">
            <p className="font-medium">Aksiyonlar yüklenemedi.</p>
            <p className="mt-1 text-[12px] text-[#7F1D1D]">
              {error?.message ?? 'Bilinmeyen hata'}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 rounded-md bg-[#B91C1C] px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-[#991B1B]"
            >
              Yeniden dene
            </button>
          </div>
        )}

        {!isLoading && !isError && actions.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-[#EDEDED] bg-white px-6 py-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#D1FAE5]">
              <svg
                className="h-6 w-6 text-[#059669]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-medium text-[#0A0A0A]">Harika — şu an bekleyen aksiyon yok</p>
            <p className="max-w-md text-center text-xs text-[#A3A3A3]">
              Yeni sinyaller geldiğinde Action Center size öncelikli aksiyonları burada gösterecek.
              Otomatik güncelleme her 2 dakikada bir yapılır.
            </p>
          </div>
        )}

        {!isLoading && !isError && actions.length > 0 && (
          <PriorityActions actions={actions} />
        )}
      </section>

      <section>
        <h2 className="mb-5 text-[13px] font-semibold uppercase tracking-widest text-[#A3A3A3]">
          Bu Hafta
        </h2>
        <WeeklyRecap />
      </section>

      <section>
        <h2 className="mb-5 text-[13px] font-semibold uppercase tracking-widest text-[#A3A3A3]">
          Modüller
        </h2>
        <ModuleOverview />
      </section>

      {/* Onboarding CTA — sadece hiç pulse göndermediyse görünür. */}
      <section>
        <FirstPulseCTA />
      </section>
    </div>
  );
}
