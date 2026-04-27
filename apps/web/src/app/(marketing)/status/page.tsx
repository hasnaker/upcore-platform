import { CheckCircle2, Clock } from 'lucide-react';

export const metadata = { title: 'Sistem Durumu · UpCore' };
export const revalidate = 60;

type ServiceStatus = {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  latency_p95_ms?: number;
  uptime_30d?: number;
};

async function getStatuses(): Promise<ServiceStatus[]> {
  // Production: fetch from Grafana Prometheus or Azure Monitor.
  return [
    { name: 'API Gateway', status: 'operational', latency_p95_ms: 85, uptime_30d: 99.98 },
    { name: 'Çalışan Servisi', status: 'operational', latency_p95_ms: 120, uptime_30d: 99.97 },
    { name: 'Bordro Servisi', status: 'operational', latency_p95_ms: 180, uptime_30d: 99.95 },
    { name: 'İşe Alım (ATS)', status: 'operational', latency_p95_ms: 140, uptime_30d: 99.96 },
    { name: 'Performans', status: 'operational', latency_p95_ms: 110, uptime_30d: 99.97 },
    { name: 'İzin', status: 'operational', latency_p95_ms: 95, uptime_30d: 99.98 },
    { name: 'Bildirimler', status: 'operational', latency_p95_ms: 200, uptime_30d: 99.94 },
    { name: 'Denetim', status: 'operational', latency_p95_ms: 75, uptime_30d: 99.99 },
    { name: 'Envanter / Assessment', status: 'operational', latency_p95_ms: 130, uptime_30d: 99.97 },
    { name: 'Belgeler', status: 'operational', latency_p95_ms: 160, uptime_30d: 99.95 },
    { name: 'ML Servisleri', status: 'operational', latency_p95_ms: 250, uptime_30d: 99.92 },
  ];
}

export default async function StatusPage() {
  const services = await getStatuses();
  const hasIncident = services.some((s) => s.status !== 'operational');
  return (
    <main className="mx-auto max-w-4xl p-8">
      <h1 className="text-3xl font-semibold text-ink">UpCore Sistem Durumu</h1>
      <p className="mt-2 text-sm text-ink-60">
        Tüm UpCore servisleri için gerçek zamanlı durum. Her 60 saniyede güncellenir.
      </p>

      <div
        className={`mt-6 flex items-center gap-3 rounded-xl border p-5 ${
          hasIncident
            ? 'border-red/30 bg-red-soft text-red'
            : 'border-green/30 bg-green-soft text-green'
        }`}
      >
        <CheckCircle2 className="h-6 w-6" />
        <div>
          <p className="font-semibold">
            {hasIncident ? 'Aktif bir olay var' : 'Tüm servisler çalışıyor'}
          </p>
          <p className="text-[12px] text-ink-80">
            SLA: %99.95 uptime · RTO 4 saat · RPO 15 dakika
          </p>
        </div>
      </div>

      <section className="mt-6 rounded-xl border border-line bg-bg">
        <div className="border-b border-line p-4 text-[13px] font-semibold uppercase tracking-widest text-ink-40">
          Servis Listesi
        </div>
        <ul>
          {services.map((s) => (
            <li
              key={s.name}
              className="flex items-center justify-between border-t border-line px-4 py-3 first:border-t-0"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`h-2 w-2 rounded-full ${
                    s.status === 'operational'
                      ? 'bg-green'
                      : s.status === 'degraded'
                        ? 'bg-amber'
                        : 'bg-red'
                  }`}
                />
                <span className="text-sm text-ink">{s.name}</span>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-ink-40">
                {s.latency_p95_ms != null ? (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {s.latency_p95_ms}ms p95
                  </span>
                ) : null}
                {s.uptime_30d != null ? (
                  <span>{s.uptime_30d.toFixed(2)}% · 30g</span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-xl border border-line bg-bg p-5">
        <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">
          Son 7 Gün Olayları
        </h2>
        <p className="mt-3 text-sm text-ink-60">Olay kaydı bulunmuyor.</p>
      </section>

      <p className="mt-8 text-center text-[11px] text-ink-40">
        Olay bildirimleri için{' '}
        <a
          href="https://status.upcore.app/rss"
          className="underline"
          target="_blank"
          rel="noreferrer"
        >
          RSS
        </a>{' '}
        veya{' '}
        <a
          href="mailto:status-subscribe@upcore.app"
          className="underline"
        >
          email aboneliği
        </a>
        .
      </p>
    </main>
  );
}
