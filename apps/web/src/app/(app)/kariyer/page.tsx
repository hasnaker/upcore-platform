'use client';

import { useState } from 'react';
import { InternalPositions } from './_components/InternalPositions';
import { CareerPath } from './_components/CareerPath';
import { JobCrafting } from './_components/JobCrafting';

type Tab = 'positions' | 'career' | 'crafting';

const TABS: { key: Tab; label: string; description: string }[] = [
  { key: 'positions', label: 'Ic Pozisyonlar', description: 'Ic is pazari' },
  { key: 'career', label: 'Kariyer Yolu', description: 'Kariyer haritaniz' },
  { key: 'crafting', label: 'Job Crafting', description: 'AI destekli oneriler' },
];

export default function KariyerPage() {
  const [tab, setTab] = useState<Tab>('positions');

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111' }}>Kariyer & Mobilite</h1>
        <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>
          Ic pozisyonlar, kariyer yolu haritaniz ve AI destekli job crafting onerileri.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #f0f0f0' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? '#5E5CE6' : '#888',
              borderBottom: tab === t.key ? '2px solid #5E5CE6' : '2px solid transparent',
              background: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'positions' && <InternalPositions />}
      {tab === 'career' && <CareerPath />}
      {tab === 'crafting' && <JobCrafting />}
    </div>
  );
}
