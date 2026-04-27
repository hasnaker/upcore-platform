import type { ComponentStatus, IncidentImpact, IncidentStatus } from './api';

export const statusLabelTR: Record<ComponentStatus, string> = {
  operational: 'Çalışıyor',
  degraded: 'Performans düşük',
  partial_outage: 'Kısmi kesinti',
  major_outage: 'Büyük kesinti',
  maintenance: 'Planlı bakım',
};

export const statusColorClass: Record<ComponentStatus, string> = {
  operational: 'bg-green',
  degraded: 'bg-amber',
  partial_outage: 'bg-amber',
  major_outage: 'bg-red',
  maintenance: 'bg-accent',
};

export const bannerStyles: Record<ComponentStatus, { bg: string; border: string; text: string }> = {
  operational: { bg: 'bg-green-soft', border: 'border-green/30', text: 'text-green' },
  degraded: { bg: 'bg-amber-soft', border: 'border-amber/30', text: 'text-amber' },
  partial_outage: { bg: 'bg-amber-soft', border: 'border-amber/30', text: 'text-amber' },
  major_outage: { bg: 'bg-red-soft', border: 'border-red/30', text: 'text-red' },
  maintenance: { bg: 'bg-accent-soft', border: 'border-accent/30', text: 'text-accent' },
};

export const bannerMessageTR: Record<ComponentStatus, string> = {
  operational: 'Tüm sistemler çalışıyor',
  degraded: 'Bazı bileşenler yavaş — izleniyor',
  partial_outage: 'Kısmi kesinti yaşanıyor',
  major_outage: 'Büyük kesinti — ekibimiz müdahale ediyor',
  maintenance: 'Planlı bakım sürüyor',
};

export const incidentStatusLabelTR: Record<IncidentStatus, string> = {
  investigating: 'Araştırılıyor',
  identified: 'Tespit edildi',
  monitoring: 'İzleniyor',
  resolved: 'Çözüldü',
  postmortem: 'Post-mortem',
};

export const incidentImpactLabelTR: Record<IncidentImpact, string> = {
  none: 'Etki yok',
  minor: 'Hafif',
  major: 'Orta',
  critical: 'Kritik',
};

export const categoryLabelTR: Record<string, string> = {
  core: 'Temel Platform',
  service: 'Servisler',
  ml: 'ML Servisleri',
  integration: 'Entegrasyonlar',
};

export function formatDateTR(iso: string): string {
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function formatDayTR(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
}

/**
 * Aylık uptime yüzdesi (30 günün toplamı). Hiç veri yoksa 100 döner.
 */
export function monthlyUptimePct(history: { total_probes: number; failed_probes: number }[]): number {
  const last30 = history.slice(-30);
  let total = 0;
  let failed = 0;
  for (const d of last30) {
    total += d.total_probes;
    failed += d.failed_probes;
  }
  if (total === 0) return 100;
  return Math.max(0, Math.min(100, ((total - failed) / total) * 100));
}
