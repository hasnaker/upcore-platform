'use client';

/**
 * UpCap-TR sonuç kartı — composite skor + percentile + T + interpretation
 * + faktör kırılımı + açıklama bloğu + disclaimer.
 *
 * Sektör karşılaştırma alt component'i (NormComparison) ayrı dosyada;
 * ResultCard composite + factor breakdown + sabit açıklama metnini kapsar.
 */
import { Info, TrendingUp } from 'lucide-react';
import { FACTOR_LABELS, type UpCapScoreResponse } from './types';

interface ResultCardProps {
  result: UpCapScoreResponse;
  onRetake: () => void;
}

export function ResultCard({ result, onRetake }: ResultCardProps) {
  const composite = result.composite_score;
  const t = result.t_score;
  const pctl = result.percentile;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-line bg-bg p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-widest text-ink-40">
              <TrendingUp className="h-3.5 w-3.5" /> Toplam Skor
            </h2>
            <p className="mt-2 text-4xl font-semibold text-ink">
              {composite.toFixed(2)}
              <span className="ml-2 text-base font-normal text-ink-40">/ 6.00</span>
            </p>
            <p className="mt-1 text-[12px] text-ink-60">{result.interpretation}</p>
          </div>
          <button
            type="button"
            onClick={onRetake}
            className="rounded-md border border-line bg-bg-2 px-3 py-1.5 text-[12px] font-medium text-ink hover:border-accent"
          >
            Yeniden al
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
          <StatBlock label="Yüzdelik (Türkiye genel)" value={`%${pctl.toFixed(0)}`} hint="Percentile rank" />
          <StatBlock label="T-skor (M=50, SD=10)" value={t.toFixed(1)} hint="Klasik psikometri" />
          <StatBlock
            label="Versiyon"
            value={`${result.scale_code} v${result.scale_version}`}
            hint={result.validated ? 'Doğrulandı' : 'Provisional'}
          />
        </div>
      </section>

      <section className="rounded-xl border border-line bg-bg p-5">
        <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">
          Faktör kırılımı
        </h2>
        <div className="mt-4 flex flex-col gap-3">
          {result.factor_breakdown.map((f) => (
            <FactorBar key={f.factor} label={FACTOR_LABELS[f.factor] ?? f.factor} value={f.raw_mean} />
          ))}
        </div>
      </section>

      <ExplanationBlock />

      <div className="rounded-xl border border-accent/30 bg-accent-soft p-4 text-[12px] text-accent">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Disclaimer</p>
            <p className="mt-1 text-ink-80">{result.disclaimer}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function StatBlock({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-md bg-bg-2 p-3">
      <p className="text-[10px] uppercase tracking-widest text-ink-40">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-ink">{value}</p>
      {hint ? <p className="text-[10px] text-ink-40">{hint}</p> : null}
    </div>
  );
}

function FactorBar({ label, value }: { label: string; value: number }) {
  // 1-6 ölçek → yüzde dönüşümü; yıldızlı UI yerine bar tercih edildi
  // çünkü ölçek anchor'ları sayısal (yıldız semantik anlam katmaz).
  const pct = Math.min(100, Math.max(0, ((value - 1) / 5) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-medium text-ink">{label}</span>
        <span className="text-ink-60">{value.toFixed(2)} / 6</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-bg-2">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ExplanationBlock() {
  return (
    <section className="rounded-xl border border-line bg-bg p-5">
      <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">
        Skorun nasıl yorumlanır?
      </h2>
      <ul className="mt-3 flex flex-col gap-2 text-[12px] text-ink-80">
        <li>
          <span className="font-medium text-ink">Umut-İyimserlik:</span> İş hedeflerinize giden yolları görme ve
          olumlu sonuçları bekleme kapasiteniz. Yüksek skor, belirsizlikte yön bulmayı kolaylaştırır.
        </li>
        <li>
          <span className="font-medium text-ink">Dirençlilik:</span> Aksiliklerden toparlanma ve stresli durumlarla
          başa çıkma gücünüz. Tükenmişliğe karşı en güçlü korumalardan biri.
        </li>
        <li>
          <span className="font-medium text-ink">Öz-Yeterlik:</span> Zorlu görevleri üstlenme ve başarılı olacağınıza
          dair inancınız. Gelişim programlarıyla artırılabilir.
        </li>
        <li>
          <span className="font-medium text-ink">T-skor:</span> Referans grup ortalaması 50, standart sapma 10.
          55+ ortalamanın üzerinde, 45- ortalamanın altında.
        </li>
        <li>
          <span className="font-medium text-ink">Yüzdelik (percentile):</span> %75 değeri, referans grubun
          %75&apos;inden yüksek skora sahip olduğunuzu gösterir.
        </li>
      </ul>
    </section>
  );
}
