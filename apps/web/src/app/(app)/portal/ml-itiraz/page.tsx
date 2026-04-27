'use client';

// ML-itiraz portal page — KVKK Madde 22 objection flow.
//
// Previously a 406-line god-component. Split into focused parts under
// ./_components to keep the shell focused on state wiring:
//
//   - PredictionCard.tsx   — renders a single prediction + SHAP drivers.
//   - ObjectionDialog.tsx  — modal dialog for filing the objection.
//   - hooks.ts             — React Query hooks.
//   - types.ts             — shared types + helpers (bandFor, formatDate).

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Brain, Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

import { useAuthMe } from '@/hooks/useAuthMe';

import { ObjectionDialog } from './_components/ObjectionDialog';
import { PredictionCard } from './_components/PredictionCard';
import { useFileObjection, useMyPredictions } from './_components/hooks';
import type { UserPrediction } from './_components/types';

export default function MlItirazPage() {
  const me = useAuthMe();
  const tenantId = me.tenantId ?? null;
  const userId = me.data?.id ?? null;

  const predictionsQuery = useMyPredictions(tenantId, userId);
  const objection = useFileObjection();

  const [selectedPrediction, setSelectedPrediction] =
    useState<UserPrediction | null>(null);

  const predictions = useMemo(
    () => predictionsQuery.data ?? [],
    [predictionsQuery.data],
  );
  const hasPredictions = predictions.length > 0;

  const pendingObjections = useMemo(
    () => predictions.filter((p) => p.objected_at !== null),
    [predictions],
  );

  const handleSubmitObjection = (reason: string) => {
    if (!selectedPrediction || !tenantId || !userId) return;
    if (reason.length < 5) {
      toast.error('Lütfen en az 5 karakter bir itiraz gerekçesi yazın.');
      return;
    }
    objection.mutate(
      {
        predictionId: selectedPrediction.prediction_id,
        tenantId,
        userId,
        reason,
      },
      {
        onSuccess: (data) => {
          toast.success(data.message);
          setSelectedPrediction(null);
        },
        onError: (err) => {
          toast.error(`İtiraz gönderilemedi: ${err.message}`);
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Link
          href="/portal"
          className="flex h-8 w-8 items-center justify-center rounded-md border border-line text-ink-60 hover:text-ink"
          aria-label="Portala dön"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-ink">
            ML Tahmin Geçmişim + İtiraz
          </h1>
          <p className="text-sm text-ink-60">
            KVKK Madde 22 kapsamında AI tabanlı tükenmişlik tahminlerini görüp
            itiraz edebilirsin.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-accent/30 bg-accent-soft p-4 text-[13px] text-accent">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-1 text-ink-80">
          <p className="font-semibold text-accent">
            Karar-destek, karar değil
          </p>
          <p>
            Bu tahminler yalnızca İK/yöneticine karar-destek amacıyla gösterilir.
            Hiçbir otomatik eylem tetiklenmez. İtiraz ettiğin tahminler 30 gün
            içinde İK + veri bilimi ekibi tarafından manuel incelenir.
          </p>
        </div>
      </div>

      {pendingObjections.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-900">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <p className="font-semibold">
              {pendingObjections.length} itirazın inceleme aşamasında
            </p>
          </div>
          <p className="mt-1 text-amber-900/80">
            İK ekibi değerlendirmeyi tamamladığında e-posta ile
            bilgilendirileceksin.
          </p>
        </div>
      )}

      {predictionsQuery.isLoading && (
        <div className="flex items-center gap-2 rounded-xl border border-line bg-bg p-5 text-sm text-ink-60">
          <Loader2 className="h-4 w-4 animate-spin" />
          Tahmin geçmişin yükleniyor...
        </div>
      )}

      {predictionsQuery.isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-800">
          Tahmin geçmişi alınamadı: {predictionsQuery.error?.message}
        </div>
      )}

      {!predictionsQuery.isLoading && !hasPredictions && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-bg p-10 text-center text-ink-60">
          <Brain className="h-8 w-8 text-ink-40" />
          <p className="text-sm">
            Henüz senin için üretilmiş bir ML tahmini yok.
          </p>
          <p className="text-[12px] text-ink-40">
            BAT-TR / COPSOQ anketlerini doldurdukça burada geçmiş tahminler
            görünecek.
          </p>
        </div>
      )}

      {hasPredictions && (
        <div className="flex flex-col gap-3">
          {predictions.map((p) => (
            <PredictionCard
              key={p.prediction_id}
              prediction={p}
              onObject={() => setSelectedPrediction(p)}
            />
          ))}
        </div>
      )}

      <ObjectionDialog
        prediction={selectedPrediction}
        pending={objection.isPending}
        onCancel={() => setSelectedPrediction(null)}
        onSubmit={handleSubmitObjection}
      />
    </div>
  );
}
