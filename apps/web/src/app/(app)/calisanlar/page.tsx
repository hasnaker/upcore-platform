import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchEmployees } from '@/lib/employee-mapper';
import { EmployeeListClient } from './_components/EmployeeListClient';

export const metadata: Metadata = {
  title: 'Çalışanlar',
  description: 'Şirketinizdeki tüm çalışanları yönetin.',
};

export default async function CalisanlarPage() {
  const data = await fetchEmployees({ limit: 50 });

  const stats = {
    toplam: data.total,
    aktif: data.items.filter((e) => e.durum === 'active').length,
    izinde: data.items.filter((e) => e.durum === 'on_leave').length,
    ayrilan: data.items.filter((e) => e.durum === 'terminated').length,
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Çalışanlar</h1>
          <p className="mt-1 text-sm text-ink-60">
            {stats.toplam} çalışan · {stats.aktif} aktif · {stats.izinde} izinde · {stats.ayrilan} ayrılmış
          </p>
        </div>
        <Link
          href="/calisanlar/yeni"
          className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-medium text-white transition-colors hover:bg-accent/90"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Yeni Çalışan
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Toplam" value={stats.toplam} color="ink" />
        <StatCard label="Aktif" value={stats.aktif} color="green" />
        <StatCard label="İzinde" value={stats.izinde} color="amber" />
        <StatCard label="Ayrılmış" value={stats.ayrilan} color="red" />
      </div>

      {/* Employee List */}
      <EmployeeListClient employees={data.items} />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const dotColors: Record<string, string> = {
    ink: 'bg-ink',
    green: 'bg-green',
    amber: 'bg-amber',
    red: 'bg-red',
  };

  return (
    <div className="rounded-lg border border-line bg-bg p-4">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dotColors[color] ?? 'bg-ink-40'}`} />
        <span className="text-xs font-medium text-ink-60">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-ink">{value}</div>
    </div>
  );
}
