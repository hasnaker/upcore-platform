'use client';

import { useState } from 'react';
import { OkrTab } from './_components/OkrTab';
import { Feedback360Tab } from './_components/Feedback360Tab';
import { DegerlendirmeTab } from './_components/DegerlendirmeTab';

/* ─────────────────────────────────────────────────────────────
 * Performance Management — /performans
 * 3 Tabs: OKR | 360° | Değerlendirme
 * All data: static, realistic, Turkish — clearly marked.
 * ───────────────────────────────────────────────────────────── */

type PerformansTab = 'okr' | '360' | 'degerlendirme';

const TABS: { key: PerformansTab; label: string }[] = [
  { key: 'okr', label: 'OKR' },
  { key: '360', label: '360° Geri Bildirim' },
  { key: 'degerlendirme', label: 'Degerlendirme' },
];

export default function PerformansPage() {
  const [activeTab, setActiveTab] = useState<PerformansTab>('okr');

  return (
    <div className="flex flex-col gap-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
          Performans Yonetimi
        </h1>
        <p className="mt-1 text-sm text-[#525252]">
          OKR takibi, 360 geri bildirim ve calisan degerlendirmeleri.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-[#f0f0f0] bg-[#fafafa] p-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
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

      {/* Tab Content */}
      {activeTab === 'okr' && <OkrTab />}
      {activeTab === '360' && <Feedback360Tab />}
      {activeTab === 'degerlendirme' && <DegerlendirmeTab />}
    </div>
  );
}
