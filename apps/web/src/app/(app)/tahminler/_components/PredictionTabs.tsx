'use client';

import { useState } from 'react';
import { PredictionList } from './PredictionList';

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

interface PredictionTabsProps {
  predictions: Prediction[];
}

type TabKey = 'attrition' | 'performance' | 'burnout';

const TABS: { key: TabKey; label: string; type: string }[] = [
  { key: 'attrition', label: 'Isten Ayrilma Riski', type: 'attrition' },
  { key: 'performance', label: 'Performans Tahmini', type: 'performance' },
  { key: 'burnout', label: 'Tukenmislik Tahmini', type: 'burnout' },
];

export const PredictionTabs = ({ predictions }: PredictionTabsProps) => {
  const [activeTab, setActiveTab] = useState<TabKey>('attrition');

  const filtered = predictions.filter(
    (p) => p.type === TABS.find((t) => t.key === activeTab)?.type
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-[#F0F0F0] bg-[#FAFAFA] p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-[13px] font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-white text-[#0A0A0A] shadow-sm'
                : 'text-[#737373] hover:text-[#0A0A0A]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <PredictionList predictions={filtered} />
    </div>
  );
};
