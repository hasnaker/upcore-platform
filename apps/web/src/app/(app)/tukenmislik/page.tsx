import type { Metadata } from 'next';
import { TukenmislikDashboard } from './_components/TukenmislikDashboard';

export const metadata: Metadata = {
  title: 'Tükenmişlik İzleme',
  description:
    'BAT-12-TR ölçümleri, departman × hafta ısı haritası ve erken uyarı sinyalleri.',
};

export default function TukenmislikPage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          Tükenmişlik İzleme
        </h1>
        <p className="mt-1 text-sm text-ink-60">
          BAT-12-TR ölçümleri, departman × hafta ısı haritası ve kritik çalışan uyarıları
          — canlı API üzerinden.
        </p>
      </div>

      <TukenmislikDashboard />
    </div>
  );
}
