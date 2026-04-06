'use client';

import { useState } from 'react';
import { CheckCircle2, MessageSquare, ClipboardCheck, ArrowLeftRight, ChevronDown, ChevronUp } from 'lucide-react';

interface RecapBreakdownItem {
  label: string;
  value: string;
  color: string;
}

interface RecapMetric {
  label: string;
  value: string;
  change: string;
  changeType: 'positive' | 'neutral';
  icon: React.ReactNode;
  breakdown: RecapBreakdownItem[];
}

const metrics: RecapMetric[] = [
  {
    label: 'Tamamlanan',
    value: '12',
    change: '+3',
    changeType: 'positive',
    icon: <CheckCircle2 className="h-4 w-4" />,
    breakdown: [
      { label: 'Onaylanan', value: '8', color: '#059669' },
      { label: 'Reddedilen', value: '2', color: '#DC2626' },
      { label: 'Ertelenen', value: '2', color: '#D97706' },
    ],
  },
  {
    label: 'Kocluk',
    value: '8',
    change: '6 kabul',
    changeType: 'neutral',
    icon: <MessageSquare className="h-4 w-4" />,
    breakdown: [
      { label: 'Kabul edilen', value: '6', color: '#059669' },
      { label: 'Bekleyen', value: '2', color: '#D97706' },
      { label: 'Etkinlik orani', value: '%72', color: '#5E5CE6' },
    ],
  },
  {
    label: 'Assessment',
    value: '34',
    change: '+%18',
    changeType: 'positive',
    icon: <ClipboardCheck className="h-4 w-4" />,
    breakdown: [
      { label: 'Tamamlanan', value: '12', color: '#059669' },
      { label: 'Yuksek uyum', value: '8', color: '#5E5CE6' },
      { label: 'Devam eden', value: '14', color: '#D97706' },
    ],
  },
  {
    label: 'Rotasyon',
    value: '2',
    change: 'bu hafta',
    changeType: 'neutral',
    icon: <ArrowLeftRight className="h-4 w-4" />,
    breakdown: [
      { label: 'Departman ici', value: '1', color: '#5E5CE6' },
      { label: 'Departmanlar arasi', value: '1', color: '#059669' },
      { label: 'Bekleyen talep', value: '3', color: '#D97706' },
    ],
  },
];

export const WeeklyRecap = () => {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, idx) => {
        const isExpanded = expandedIdx === idx;
        return (
          <div key={metric.label} className="flex flex-col">
            <button
              type="button"
              onClick={() => setExpandedIdx(isExpanded ? null : idx)}
              className="flex flex-col gap-3 rounded-lg border border-[#EDEDED] bg-white p-5 text-left transition-colors hover:border-[#D4D4D4]"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#A3A3A3]">
                  {metric.label}
                </span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[#A3A3A3]">{metric.icon}</span>
                  {isExpanded ? (
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
                <span
                  className={`text-xs font-medium ${
                    metric.changeType === 'positive'
                      ? 'text-[#059669]'
                      : 'text-[#525252]'
                  }`}
                >
                  {metric.change}
                </span>
              </div>
            </button>

            {/* Expanded breakdown */}
            <div
              className={`overflow-hidden transition-all duration-300 ${
                isExpanded ? 'mt-2 max-h-[200px] opacity-100' : 'max-h-0 opacity-0'
              }`}
            >
              <div className="rounded-lg border border-[#EDEDED] bg-white p-3">
                <div className="flex flex-col gap-2">
                  {metric.breakdown.map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-[11px] text-[#525252]">{item.label}</span>
                      </div>
                      <span
                        className="text-[12px] font-semibold tabular-nums"
                        style={{ color: item.color }}
                      >
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
