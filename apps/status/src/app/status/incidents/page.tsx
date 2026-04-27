import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getIncidents, getUnresolvedIncidents } from '@/lib/api';
import { IncidentList } from '@/components/IncidentList';

export const revalidate = 60;
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Incident Geçmişi',
  description: 'Son 90 günün incident akışı, çözüm süreleri ve post-mortem bağlantıları.',
};

export default async function IncidentsPage() {
  const [active, all] = await Promise.all([getUnresolvedIncidents(), getIncidents(90)]);
  const history = all.filter((i) => i.status === 'resolved' || i.status === 'postmortem');

  return (
    <main className="mx-auto max-w-4xl p-6 md:p-10">
      <Link
        href="/status"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-ink-60 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Status sayfasına dön
      </Link>
      <h1 className="text-2xl font-semibold tracking-tight text-ink">Incident Geçmişi</h1>
      <p className="mt-1 text-sm text-ink-60">Son 90 gün · aktif ve çözülmüş olaylar.</p>

      <div className="mt-6 flex flex-col gap-6">
        <IncidentList
          title="Aktif incident"
          emptyLabel="Şu anda aktif bir incident yok."
          incidents={active}
        />
        <IncidentList
          title="Geçmiş incidentlar"
          emptyLabel="Son 90 günde çözülmüş incident bulunmuyor."
          incidents={history}
        />
      </div>
    </main>
  );
}
