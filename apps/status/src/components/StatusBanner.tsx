import { AlertTriangle, CheckCircle2, Wrench } from 'lucide-react';
import type { ComponentStatus } from '@/lib/api';
import { bannerMessageTR, bannerStyles } from '@/lib/labels';

interface StatusBannerProps {
  status: ComponentStatus;
  lastCheckedAt?: string;
}

export function StatusBanner({ status, lastCheckedAt }: StatusBannerProps) {
  const s = bannerStyles[status];
  const Icon = status === 'operational' ? CheckCircle2 : status === 'maintenance' ? Wrench : AlertTriangle;
  return (
    <div
      className={`flex items-center gap-4 rounded-xl border p-5 ${s.border} ${s.bg} ${s.text}`}
      role="status"
      aria-live="polite"
    >
      <Icon className="h-7 w-7 shrink-0" aria-hidden />
      <div className="flex-1">
        <p className="text-lg font-semibold">{bannerMessageTR[status]}</p>
        <p className="text-[12px] text-ink-60">
          SLA: Enterprise %99.9 · Pro %99.5 · KOBİ %99.0 · RTO 4 saat · RPO 15 dakika
          {lastCheckedAt ? ` · Son kontrol ${new Date(lastCheckedAt).toLocaleTimeString('tr-TR')}` : ''}
        </p>
      </div>
    </div>
  );
}
