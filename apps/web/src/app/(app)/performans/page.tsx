'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
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
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  const handleExport = (type: string) => {
    window.open(`/api/export?type=${type}`, '_blank');
    setExportMenuOpen(false);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
            Performans Yonetimi
          </h1>
          <p className="mt-1 text-sm text-[#525252]">
            OKR takibi, 360 geri bildirim ve calisan degerlendirmeleri.
          </p>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setExportMenuOpen((prev) => !prev)}
            className="inline-flex items-center gap-2 rounded-lg border border-[#EDEDED] px-3 py-2 text-xs font-medium text-[#525252] transition-colors hover:bg-[#FAFAFA]"
          >
            <Download className="h-3.5 w-3.5" />
            CSV Indir
          </button>
          {exportMenuOpen && (
            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-[#EDEDED] bg-white py-1 shadow-lg">
              <button
                type="button"
                onClick={() => handleExport('performance')}
                className="w-full px-4 py-2 text-left text-xs text-[#525252] hover:bg-[#FAFAFA]"
              >
                Performans (CSV)
              </button>
              <button
                type="button"
                onClick={() => handleExport('okr')}
                className="w-full px-4 py-2 text-left text-xs text-[#525252] hover:bg-[#FAFAFA]"
              >
                OKR (CSV)
              </button>
            </div>
          )}
        </div>
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
