'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  MessageSquare,
  ClipboardCheck,
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useWeeklyRecap, type RecapMetric } from '@/hooks/useActions';

const iconByKey: Record<string, React.ReactNode> = {
  completed_actions: <CheckCircle2 className="h-4 w-4" />,
  suggested_coaching: <MessageSquare className="h-4 w-4" />,
  assessments: <ClipboardCheck className="h-4 w-4" />,
  internal_rotations: <ArrowLeftRight className="h-4 w-4" />,
};

// Breakdown item için accent seçim sırası (Nordic minimal rotasyon).
const breakdownColors = ['#059669', '#DC2626', '#D97706', '#5E5CE6', '#0D9488'];

export const WeeklyRecap = () => {
  const { data, isLoading, isError, refetch } = useWeeklyRecap('7d');
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-lg border border-[#EDEDED] bg-white"
          />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-5 py-4 text-sm text-[#B91C1C]">
        Haftalık özet yüklenemedi.
        <button
          type="button"
          onClick={() => refetch()}
          className="ml-2 text-[12px] font-semibold underline"
        >
          Yeniden dene
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {data.metrics.map((metric, idx) => (
        <MetricCard
          key={metric.key}
          metric={metric}
          expanded={expandedIdx === idx}
          onToggle={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
        />
      ))}
    </div>
  );
};

const MetricCard = ({
  metric,
  expanded,
  onToggle,
}: {
  metric: RecapMetric;
  expanded: boolean;
  onToggle: () => void;
}) => {
  const isPositive = metric.change_vs_prev > 0;
  const isNegative = metric.change_vs_prev < 0;
  const deltaColor = isPositive
    ? 'text-[#059669]'
    : isNegative
      ? 'text-[#DC2626]'
      : 'text-[#525252]';
  const deltaLabel =
    metric.change_vs_prev === 0
      ? 'değişim yok'
      : `${isPositive ? '+' : ''}${metric.change_vs_prev}`;

  return (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={onToggle}
        className="flex flex-col gap-3 rounded-lg border border-[#EDEDED] bg-white p-5 text-left transition-colors hover:border-[#D4D4D4]"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-[#A3A3A3]">{metric.label_tr}</span>
          <div className="flex items-center gap-1.5">
            <span className="text-[#A3A3A3]">
              {iconByKey[metric.key] ?? <CheckCircle2 className="h-4 w-4" />}
            </span>
            {expanded ? (
              <ChevronUp className="h-3 w-3 text-[#A3A3A3]" />
            ) : (
              <ChevronDown className="h-3 w-3 text-[#A3A3A3]" />
            )}
          </div>
        </div>
        <div className="flex items-end justify-between">
          <span className="text-3xl font-semibold tabular-nums text-[#0A0A0A]">
            {metric.value}
          </span>
          <span className={`text-xs font-medium ${deltaColor}`}>{deltaLabel}</span>
        </div>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ${
          expanded ? 'mt-2 max-h-[200px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        {metric.breakdown.length > 0 && (
          <div className="rounded-lg border border-[#EDEDED] bg-white p-3">
            <div className="flex flex-col gap-2">
              {metric.breakdown.map((item, i) => {
                const color = breakdownColors[i % breakdownColors.length];
                return (
                  <div key={item.label_tr} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-[11px] text-[#525252]">{item.label_tr}</span>
                    </div>
                    <span
                      className="text-[12px] font-semibold tabular-nums"
                      style={{ color }}
                    >
                      {item.value}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
