import { CheckCircle2, MessageSquare, ClipboardCheck, ArrowLeftRight } from 'lucide-react';

interface RecapMetric {
  label: string;
  value: string;
  change: string;
  changeType: 'positive' | 'neutral';
  icon: React.ReactNode;
}

const metrics: RecapMetric[] = [
  {
    label: 'Tamamlanan',
    value: '12',
    change: '+3',
    changeType: 'positive',
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  {
    label: 'Kocluk',
    value: '8',
    change: '6 kabul',
    changeType: 'neutral',
    icon: <MessageSquare className="h-4 w-4" />,
  },
  {
    label: 'Assessment',
    value: '34',
    change: '+%18',
    changeType: 'positive',
    icon: <ClipboardCheck className="h-4 w-4" />,
  },
  {
    label: 'Rotasyon',
    value: '2',
    change: 'bu hafta',
    changeType: 'neutral',
    icon: <ArrowLeftRight className="h-4 w-4" />,
  },
];

export const WeeklyRecap = () => {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="flex flex-col gap-3 rounded-lg border border-[#EDEDED] bg-white p-5 transition-colors hover:border-[#D4D4D4]"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#A3A3A3]">
              {metric.label}
            </span>
            <span className="text-[#A3A3A3]">{metric.icon}</span>
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
        </div>
      ))}
    </div>
  );
};
