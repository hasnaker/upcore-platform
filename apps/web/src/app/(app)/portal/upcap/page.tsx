'use client';

/**
 * UpCap-TR psikolojik sermaye self-servis sayfası — shell.
 *
 * Modüller (`_components/`):
 *   - types.ts          → Item bank, sektör enum'u, response/score tipleri
 *   - hooks.ts          → useUpcapNorms, useScoreUpcap
 *   - QuestionList.tsx  → 12 madde Likert + ilerleme + submit
 *   - ResultCard.tsx    → composite skor + faktör barı + açıklama
 *   - NormComparison.tsx → sektör preview + post-score sektör karşılaştırma
 *
 * Shell sadece state + scientific disclaimer banner. Hedef <250 satır.
 */

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Brain, CheckCircle2 } from 'lucide-react';

import type { Sector, UpCapScoreResponse } from './_components/types';
import { SECTOR_LABELS } from './_components/types';
import { useScoreUpcap, useUpcapNorms } from './_components/hooks';
import { QuestionList } from './_components/QuestionList';
import { ResultCard } from './_components/ResultCard';
import { SectorComparisonView, SectorReferencePreview } from './_components/NormComparison';

export default function UpCapPortalPage() {
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [sector, setSector] = useState<Sector | ''>('');
  const [result, setResult] = useState<UpCapScoreResponse | null>(null);

  const norms = useUpcapNorms();
  const scoreMutation = useScoreUpcap((data) => setResult(data));

  const setItem = (code: string, value: number) =>
    setResponses((prev) => ({ ...prev, [code]: value }));

  const resetAll = () => {
    setResponses({});
    setResult(null);
  };

  const validated = norms.data?.validated ?? false;
  const overallDisclaimer = norms.data?.disclaimer ?? '';

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/portal" className="text-[12px] text-ink-40 hover:underline">
          ← Portal
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold text-ink">
          <Brain className="h-5 w-5" />
          UpCap-TR · Psikolojik Sermaye Ölçeğim
        </h1>
        <p className="mt-1 text-sm text-ink-60">
          12 maddelik bilimsel değerlendirme · Umut-İyimserlik, Dirençlilik, Öz-Yeterlik
          boyutlarında kendi skorunu, Türkiye ortalamasıyla karşılaştırmalı percentile ve T-skor
          çıktısıyla birlikte görürsün.
        </p>
      </div>

      <DisclaimerBanner validated={validated} text={overallDisclaimer} />

      {!result ? (
        <>
          <section className="rounded-xl border border-line bg-bg p-5">
            <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">
              Kıyas grubu (isteğe bağlı)
            </h2>
            <p className="mt-1 text-[12px] text-ink-60">
              Skorun hangi sektör normu ile karşılaştırılacağını seçebilirsin.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <SectorChip active={!sector} onClick={() => setSector('')}>
                Genel
              </SectorChip>
              {(Object.keys(SECTOR_LABELS) as Sector[]).map((s) => (
                <SectorChip key={s} active={sector === s} onClick={() => setSector(s)}>
                  {SECTOR_LABELS[s]}
                </SectorChip>
              ))}
            </div>
          </section>

          <QuestionList
            responses={responses}
            onItemChange={setItem}
            onReset={resetAll}
            onSubmit={() => scoreMutation.mutate({ responses, sector })}
            submitting={scoreMutation.isPending}
            errorMessage={scoreMutation.isError ? scoreMutation.error.message : null}
          />

          <SectorReferencePreview norms={norms.data} />
        </>
      ) : (
        <>
          <ResultCard result={result} onRetake={resetAll} />
          {result.sector_comparison ? (
            <SectorComparisonView
              comparison={result.sector_comparison}
              sectorLabel={sector ? SECTOR_LABELS[sector] : null}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function SectorChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-full border px-3 py-1 text-[12px] font-medium transition-colors',
        active
          ? 'border-accent bg-accent text-white'
          : 'border-line bg-bg text-ink-60 hover:border-accent/60',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function DisclaimerBanner({ validated, text }: { validated: boolean; text: string }) {
  if (validated) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-green-500/30 bg-green-500/10 p-4 text-[12px] text-green-700 dark:text-green-300">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-semibold">UpCap-TR v1.0 · Türkiye&apos;de doğrulanmış</p>
          <p className="mt-1">
            {text || 'Peer-reviewed yayına atıf için ölçek sayfasını ziyaret et.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-[12px] text-amber-800 dark:text-amber-200">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-semibold">
          Bilimsel doğrulama sürecinde (UpCap-TR v1.0 · provisional)
        </p>
        <p className="mt-1">
          {text ||
            'Türkiye pilot çalışması devam — CFA + Cronbach α >= 0.85 hedefi. Sonuçlar gelişim amaçlı yönlendiricidir; performans kararlarında belirleyici olarak kullanılamaz.'}
        </p>
      </div>
    </div>
  );
}
