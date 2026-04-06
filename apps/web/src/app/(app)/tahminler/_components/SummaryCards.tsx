'use client';

import { AlertTriangle, TrendingUp, Flame, Award } from 'lucide-react';

interface PredictionSummary {
  attritionRisk: { high: number; medium: number; low: number };
  avgPerformancePrediction: number;
  burnoutRiskCount: number;
  promotionReady: number;
}

interface SummaryCardsProps {
  summary: PredictionSummary;
}

export const SummaryCards = ({ summary }: SummaryCardsProps) => {
  const cards = [
    {
      label: 'Isten Ayrilma Riski',
      icon: AlertTriangle,
      value: `${summary.attritionRisk.high} Yuksek`,
      subtext: `${summary.attritionRisk.medium} orta, ${summary.attritionRisk.low} dusuk`,
      color: 'text-[#DC2626]',
      bg: 'bg-[#FEF2F2]',
    },
    {
      label: 'Ort. Performans Tahmini',
      icon: TrendingUp,
      value: `%${summary.avgPerformancePrediction}`,
      subtext: 'Gelecek ceyrek tahmini',
      color: 'text-[#5E5CE6]',
      bg: 'bg-[#EEF2FF]',
    },
    {
      label: 'Tukenmislik Riski',
      icon: Flame,
      value: `${summary.burnoutRiskCount} Calisan`,
      subtext: 'Yuksek risk grubunda',
      color: 'text-[#F59E0B]',
      bg: 'bg-[#FFFBEB]',
    },
    {
      label: 'Terfi Hazir',
      icon: Award,
      value: `${summary.promotionReady} Calisan`,
      subtext: 'Terfi icin uygun goruluyor',
      color: 'text-[#10B981]',
      bg: 'bg-[#ECFDF5]',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-[#EDEDED] bg-white p-5 transition-shadow hover:shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.bg}`}>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <span className="text-xs font-medium text-[#737373]">{card.label}</span>
          </div>
          <p className="mt-3 text-xl font-semibold text-[#0A0A0A]">{card.value}</p>
          <p className="mt-0.5 text-xs text-[#A3A3A3]">{card.subtext}</p>
        </div>
      ))}
    </div>
  );
};
