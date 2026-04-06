'use client';

import { useState, useEffect } from 'react';
import { Greeting } from './_components/Greeting';
import { PriorityActions } from './_components/PriorityActions';
import { WeeklyRecap } from './_components/WeeklyRecap';
import { ModuleOverview } from './_components/ModuleOverview';

interface BurnoutApiData {
  heatmap?: Array<{ department_name: string; week_start: string; avg_score: number; respondent_count: number }>;
  critical?: Array<{ id: number; ad: string; soyad: string; department_name: string; score: number }>;
  jdr?: Array<{ department_name: string; demands: number; resources: number }>;
  stats?: { avg_total: number; red_count: number; total_employees: number };
}

export default function PanelPage() {
  const [burnoutData, setBurnoutData] = useState<BurnoutApiData | null>(null);
  const [actionData, setActionData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    // Fetch burnout heatmap data
    fetch('/api/burnout/heatmap')
      .then((r) => r.json())
      .then((data) => {
        if (data && (data.stats || data.critical)) setBurnoutData(data);
      })
      .catch(() => {});

    // Fetch ML action center data
    fetch('/api/actions')
      .then((r) => r.json())
      .then((data) => {
        if (data && (data.ml_actions || data.critical_employees)) setActionData(data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-12">
      {/* Greeting */}
      <Greeting />

      {/* Priority Actions */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-[#A3A3A3]">
            Oncelikli Aksiyonlar
          </h2>
        </div>
        <PriorityActions burnoutData={burnoutData} />
      </section>

      {/* Weekly Recap */}
      <section>
        <h2 className="mb-5 text-[13px] font-semibold uppercase tracking-widest text-[#A3A3A3]">
          Bu Hafta
        </h2>
        <WeeklyRecap />
      </section>

      {/* Module Overview */}
      <section>
        <h2 className="mb-5 text-[13px] font-semibold uppercase tracking-widest text-[#A3A3A3]">
          Moduller
        </h2>
        <ModuleOverview />
      </section>
    </div>
  );
}
