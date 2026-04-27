'use client';

import type { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  accent?: 'green';
}

export function StatCard({ icon, label, value, accent }: StatCardProps) {
  return (
    <div className="rounded-lg border border-line bg-bg p-4">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-ink-40">
        {icon}
        {label}
      </div>
      <p
        className={`mt-2 text-2xl font-semibold tabular-nums ${
          accent === 'green' ? 'text-green' : 'text-ink'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
