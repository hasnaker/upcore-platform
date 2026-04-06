'use client';

import { Users, CheckCircle, AlertCircle } from 'lucide-react';

interface OnboardingSummaryProps {
  activeCount: number;
  completionRate: number;
  overdueTasks: number;
}

export const OnboardingSummary = ({ activeCount, completionRate, overdueTasks }: OnboardingSummaryProps) => {
  const cards = [
    {
      label: 'Aktif Onboarding',
      icon: Users,
      value: `${activeCount}`,
      subtext: 'Devam eden surecler',
      color: 'text-[#5E5CE6]',
      bg: 'bg-[#EEF2FF]',
    },
    {
      label: 'Tamamlanma Orani',
      icon: CheckCircle,
      value: `%${completionRate}`,
      subtext: 'Genel ilerleme',
      color: 'text-[#10B981]',
      bg: 'bg-[#ECFDF5]',
    },
    {
      label: 'Geciken Gorevler',
      icon: AlertCircle,
      value: `${overdueTasks}`,
      subtext: 'Suresi gecmis gorevler',
      color: overdueTasks > 0 ? 'text-[#DC2626]' : 'text-[#A3A3A3]',
      bg: overdueTasks > 0 ? 'bg-[#FEF2F2]' : 'bg-[#F5F5F5]',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
