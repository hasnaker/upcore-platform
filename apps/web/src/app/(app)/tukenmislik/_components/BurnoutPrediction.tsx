'use client';

import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface PredictionRow {
  department: string;
  current: number;
  predicted: number;
  direction: 'up' | 'down';
  confidence: number;
}

const predictions: PredictionRow[] = [
  { department: 'Satis', current: 52, predicted: 58, direction: 'up', confidence: 82 },
  { department: 'Muhendislik', current: 19, predicted: 17, direction: 'down', confidence: 74 },
  { department: 'Musteri Hizmetleri', current: 47, predicted: 51, direction: 'up', confidence: 78 },
  { department: 'Urun', current: 38, predicted: 35, direction: 'down', confidence: 69 },
  { department: 'IK', current: 24, predicted: 22, direction: 'down', confidence: 71 },
  { department: 'Pazarlama', current: 15, predicted: 14, direction: 'down', confidence: 65 },
];

const getBarColor = (score: number): string => {
  if (score >= 55) return '#DC2626';
  if (score >= 45) return '#EA580C';
  if (score >= 30) return '#D97706';
  return '#059669';
};

export const BurnoutPrediction = () => {
  const worsening = predictions.filter((p) => p.direction === 'up');
  const improving = predictions.filter((p) => p.direction === 'down');

  return (
    <div className="rounded-lg border border-[#EDEDED] bg-white" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="flex items-center justify-between border-b border-[#EDEDED] px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#5E5CE6]" />
            <h2 className="text-base font-semibold text-[#0A0A0A]">
              30 Gunluk Tukenmislik Tahmini
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-[#A3A3A3]">
            ML trend analizi + mevsimsel faktorler &middot; Guncelleme: bugun
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3 text-[#DC2626]" />
            <span className="text-[11px] font-medium text-[#DC2626]">{worsening.length} kotulesen</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingDown className="h-3 w-3 text-[#059669]" />
            <span className="text-[11px] font-medium text-[#059669]">{improving.length} iyilesen</span>
          </div>
        </div>
      </div>

      <div className="divide-y divide-[#EDEDED]">
        {predictions.map((row) => {
          const diff = row.predicted - row.current;
          const isUp = row.direction === 'up';
          const arrowColor = isUp ? 'text-[#DC2626]' : 'text-[#059669]';
          const barWidthCurrent = Math.min(100, row.current);
          const barWidthPredicted = Math.min(100, row.predicted);

          return (
            <div key={row.department} className="flex items-center gap-4 px-5 py-3.5">
              {/* Department name */}
              <div className="w-36 shrink-0">
                <p className="text-[13px] font-medium text-[#0A0A0A]">{row.department}</p>
              </div>

              {/* Current score */}
              <div className="w-16 shrink-0 text-right">
                <span className="text-[13px] font-semibold tabular-nums text-[#0A0A0A]">%{row.current}</span>
              </div>

              {/* Arrow */}
              <div className={`flex w-10 shrink-0 items-center justify-center ${arrowColor}`}>
                <span className="text-[13px] font-bold">{'\u2192'}</span>
              </div>

              {/* Predicted score */}
              <div className="w-16 shrink-0 text-left">
                <span
                  className="text-[13px] font-semibold tabular-nums"
                  style={{ color: getBarColor(row.predicted) }}
                >
                  %{row.predicted}
                </span>
              </div>

              {/* Change */}
              <div className={`flex w-14 shrink-0 items-center gap-1 ${arrowColor}`}>
                {isUp ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span className="text-[12px] font-semibold tabular-nums">
                  {diff > 0 ? '+' : ''}{diff}
                </span>
              </div>

              {/* Visual bar comparison */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-10 text-[9px] text-[#A3A3A3]">Simdi</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F5F5F5]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${barWidthCurrent}%`, backgroundColor: getBarColor(row.current) }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-10 text-[9px] text-[#A3A3A3]">30 gun</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#F5F5F5]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${barWidthPredicted}%`, backgroundColor: getBarColor(row.predicted), opacity: 0.6 }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Confidence */}
              <div className="w-16 shrink-0 text-right">
                <span className="text-[10px] text-[#A3A3A3]">Guven</span>
                <p className="text-[12px] font-semibold tabular-nums text-[#525252]">%{row.confidence}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <div className="border-t border-[#EDEDED] px-5 py-3">
        <p className="text-[10px] leading-relaxed text-[#A3A3A3]">
          Tahminler son 12 haftalik BAT-12-TR trendi, mevsimsel faktorler ve JD-R denge degisimleri baz alinarak olusturulmustur. Guven araligi: %65-85. Model: ARIMA + Random Forest ensemble.
        </p>
      </div>
    </div>
  );
};
