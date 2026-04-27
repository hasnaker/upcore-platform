'use client';

/**
 * Sektör + yaş bandı norm karşılaştırma görselleri.
 *
 * İki kullanım modu var:
 *   - Cevaplama öncesi: norms endpoint'inden gelen sektör ortalama özeti
 *     (kullanıcıya hangi sektörlerin referans olduğunu önceden gösterir).
 *   - Skor sonrası: gerçek sektör karşılaştırma metrikleri
 *     (sector_mean, sector_sd, sector_percentile, delta).
 */
import { Activity, ShieldCheck } from 'lucide-react';
import type { NormsResponse, Sector, SectorComparison } from './types';
import { SECTOR_LABELS } from './types';
import { StatBlock } from './ResultCard';

interface SectorPreviewProps {
  norms: NormsResponse | undefined;
}

/**
 * Cevaplama ekranında gösterilen sektör ortalamaları kartı.
 * Norms data yoksa veya sektör listesi boşsa hiçbir şey render etmez.
 */
export function SectorReferencePreview({ norms }: SectorPreviewProps) {
  const sectorEntries = Object.entries(norms?.sectors ?? {}) as Array<
    [Sector, { mean_score: number }]
  >;
  if (sectorEntries.length === 0) return null;
  return (
    <section className="rounded-xl border border-line bg-bg p-5">
      <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-widest text-ink-40">
        <Activity className="h-3.5 w-3.5" /> Sektör referans ortalamaları
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-5">
        {sectorEntries.map(([key, v]) => (
          <div key={key} className="rounded-md bg-bg-2 p-3">
            <p className="text-[10px] uppercase tracking-widest text-ink-40">
              {SECTOR_LABELS[key] ?? key}
            </p>
            <p className="mt-0.5 text-base font-semibold text-ink">
              {Number(v.mean_score).toFixed(2)}
            </p>
            <p className="text-[10px] text-ink-40">1-6 ölçeği ortalaması</p>
          </div>
        ))}
      </div>
    </section>
  );
}

interface SectorComparisonViewProps {
  comparison: SectorComparison;
  sectorLabel: string | null;
}

/**
 * Skor sonrası gösterilen sektör karşılaştırması — delta + percentile.
 */
export function SectorComparisonView({ comparison, sectorLabel }: SectorComparisonViewProps) {
  return (
    <section className="rounded-xl border border-line bg-bg p-5">
      <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-widest text-ink-40">
        <ShieldCheck className="h-3.5 w-3.5" />
        Sektör karşılaştırması · {sectorLabel ?? comparison.sector}
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatBlock label="Sektör ortalaması" value={comparison.sector_mean.toFixed(2)} hint="1-6" />
        <StatBlock label="Sektör SD" value={comparison.sector_sd.toFixed(2)} hint="Standart sapma" />
        <StatBlock
          label="Sektör percentile"
          value={`%${comparison.sector_percentile.toFixed(0)}`}
          hint="Sektöre göre sırana"
        />
        <StatBlock
          label="Sektör ortalamasından fark"
          value={
            (comparison.delta_from_sector_mean >= 0 ? '+' : '') +
            comparison.delta_from_sector_mean.toFixed(2)
          }
          hint={comparison.delta_from_sector_mean >= 0 ? 'Üzerinde' : 'Altında'}
        />
      </div>
    </section>
  );
}
