'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Zap } from 'lucide-react';

interface Prediction {
  employeeId: string;
  name: string;
  department: string;
  type: string;
  probability: number;
  confidence: number;
  riskFactors: string[];
  recommendedActions: string[];
  predictedAt: string;
}

interface PredictionListProps {
  predictions: Prediction[];
}

const getProbabilityColor = (value: number): string => {
  if (value >= 70) return 'bg-[#DC2626]';
  if (value >= 40) return 'bg-[#F59E0B]';
  return 'bg-[#10B981]';
};

const getProbabilityTextColor = (value: number): string => {
  if (value >= 70) return 'text-[#DC2626]';
  if (value >= 40) return 'text-[#F59E0B]';
  return 'text-[#10B981]';
};

const getConfidenceBadge = (confidence: number): { label: string; className: string } => {
  if (confidence >= 80) return { label: 'Yuksek Guven', className: 'bg-[#ECFDF5] text-[#10B981]' };
  if (confidence >= 50) return { label: 'Orta Guven', className: 'bg-[#FFFBEB] text-[#F59E0B]' };
  return { label: 'Dusuk Guven', className: 'bg-[#FEF2F2] text-[#DC2626]' };
};

export const PredictionList = ({ predictions }: PredictionListProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionOpenId, setActionOpenId] = useState<string | null>(null);

  if (predictions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-[#EDEDED] bg-white py-16 text-center">
        <p className="text-sm text-[#737373]">Bu kategori icin tahmin verisi bulunamadi.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {predictions.map((prediction) => {
        const isExpanded = expandedId === prediction.employeeId;
        const isActionOpen = actionOpenId === prediction.employeeId;
        const confidenceBadge = getConfidenceBadge(prediction.confidence);

        return (
          <div
            key={`${prediction.employeeId}-${prediction.type}`}
            className="overflow-hidden rounded-xl border border-[#EDEDED] bg-white transition-shadow hover:shadow-sm"
          >
            {/* Main row */}
            <button
              type="button"
              onClick={() => setExpandedId(isExpanded ? null : prediction.employeeId)}
              className="flex w-full items-center gap-4 p-5 text-left"
            >
              {/* Avatar placeholder */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F5F5F5] text-sm font-medium text-[#525252]">
                {prediction.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>

              {/* Name + department */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#0A0A0A] truncate">{prediction.name}</p>
                <p className="text-xs text-[#A3A3A3]">{prediction.department}</p>
              </div>

              {/* Probability gauge */}
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-lg font-semibold ${getProbabilityTextColor(prediction.probability)}`}>
                    %{prediction.probability}
                  </span>
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-[#F5F5F5]">
                    <div
                      className={`h-full rounded-full transition-all ${getProbabilityColor(prediction.probability)}`}
                      style={{ width: `${prediction.probability}%` }}
                    />
                  </div>
                </div>

                {/* Confidence badge */}
                <span className={`rounded-md px-2 py-1 text-[11px] font-medium ${confidenceBadge.className}`}>
                  {confidenceBadge.label}
                </span>

                {/* Expand toggle */}
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-[#A3A3A3]" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[#A3A3A3]" />
                )}
              </div>
            </button>

            {/* Expanded details */}
            {isExpanded && (
              <div className="border-t border-[#EDEDED] bg-[#FAFAFA] px-5 py-4">
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Risk factors */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
                      Risk Faktorleri
                    </h4>
                    {prediction.riskFactors.length > 0 ? (
                      <ul className="mt-2 flex flex-col gap-1.5">
                        {prediction.riskFactors.map((factor, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-[#525252]">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#DC2626]" />
                            {factor}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-xs text-[#A3A3A3]">Risk faktoru bulunamadi.</p>
                    )}
                  </div>

                  {/* Recommended actions */}
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#737373]">
                      Onerilen Aksiyonlar
                    </h4>
                    {prediction.recommendedActions.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {prediction.recommendedActions.map((action, i) => (
                          <span
                            key={i}
                            className="inline-flex rounded-lg bg-[#EEF2FF] px-2.5 py-1 text-xs font-medium text-[#5E5CE6]"
                          >
                            {action}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-[#A3A3A3]">Onerilen aksiyon yok.</p>
                    )}
                  </div>
                </div>

                {/* Action button */}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-[#A3A3A3]">
                    Tahmin tarihi: {new Date(prediction.predictedAt).toLocaleDateString('tr-TR')}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActionOpenId(isActionOpen ? null : prediction.employeeId);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#5E5CE6] px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-[#4B49BF]"
                  >
                    <Zap className="h-3.5 w-3.5" />
                    Aksiyon Al
                  </button>
                </div>

                {/* Action recommendations panel */}
                {isActionOpen && (
                  <div className="mt-3 rounded-xl border border-[#5E5CE6]/20 bg-white p-4">
                    <h5 className="text-xs font-semibold text-[#5E5CE6]">Aksiyon Onerileri</h5>
                    <div className="mt-2 flex flex-col gap-2">
                      {prediction.recommendedActions.length > 0 ? (
                        prediction.recommendedActions.map((action, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between rounded-lg border border-[#EDEDED] bg-[#FAFAFA] px-3 py-2"
                          >
                            <span className="text-sm text-[#525252]">{action}</span>
                            <button
                              type="button"
                              className="rounded-md bg-[#5E5CE6]/10 px-2.5 py-1 text-[11px] font-medium text-[#5E5CE6] transition-colors hover:bg-[#5E5CE6]/20"
                            >
                              Uygula
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-[#A3A3A3]">Henuz aksiyon onerisi bulunmuyor.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
