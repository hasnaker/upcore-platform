'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, AlertCircle, Calendar, Mail, Hash, CreditCard, Edit, Power } from 'lucide-react';
import { useEmployee, useDeleteEmployee } from '@/hooks/useEmployees';
import { useDepartments } from '@/hooks/useDepartments';
import { toast } from 'sonner';
import { EmployeeBurnoutTab } from './EmployeeBurnoutTab';

interface Props {
  id: string;
}

type Tab = 'genel' | 'tukenmislik' | 'guclu' | 'izinler' | 'belgeler' | 'gecmis';

const TABS: { key: Tab; label: string }[] = [
  { key: 'genel', label: 'Genel' },
  { key: 'tukenmislik', label: 'Tükenmişlik' },
  { key: 'guclu', label: 'Güçlü Yönler' },
  { key: 'izinler', label: 'İzinler' },
  { key: 'belgeler', label: 'Belgeler' },
  { key: 'gecmis', label: 'Geçmiş' },
];

const renkToPill: Record<string, string> = {
  green: 'bg-green-soft text-green',
  amber: 'bg-amber-soft text-amber',
  red: 'bg-red-soft text-red',
  gray: 'bg-bg-3 text-ink-40',
};

export function EmployeeDetailClient({ id }: Props) {
  const router = useRouter();
  const { data: employee, isLoading, isError, error } = useEmployee(id);
  const { data: departments = [] } = useDepartments();
  const deleteMutation = useDeleteEmployee();
  const [activeTab, setActiveTab] = useState<Tab>('genel');

  const dept = departments.find((d) => d.id === employee?.departmanId);

  const maskTCKN = (tckn: string | null) => {
    if (!tckn || tckn.length !== 11) return '—';
    return `${tckn.slice(0, 3)} ** *** **${tckn.slice(-2)}`;
  };

  const handleDeactivate = async () => {
    if (!employee) return;
    if (!confirm(`${employee.tamAd} devre dışı bırakılacak. Emin misiniz?`)) return;
    try {
      await deleteMutation.mutateAsync(employee.id);
      toast.success(`${employee.tamAd} devre dışı bırakıldı`);
      router.push('/calisanlar');
    } catch (err: unknown) {
      toast.error('İşlem başarısız', {
        description: err instanceof Error ? err.message : 'Bilinmeyen hata',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-6 w-48 animate-pulse rounded bg-bg-3" />
        <div className="h-32 animate-pulse rounded-xl border border-line bg-bg" />
        <div className="h-96 animate-pulse rounded-xl border border-line bg-bg" />
      </div>
    );
  }

  if (isError || !employee) {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/calisanlar" className="inline-flex items-center gap-1 text-sm text-ink-60">
          <ArrowLeft className="h-4 w-4" /> Çalışanlara dön
        </Link>
        <div className="flex items-start gap-3 rounded-lg border border-red/30 bg-red-soft p-4 text-sm text-red">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Çalışan bulunamadı</p>
            <p className="mt-1 text-[12px]">{error?.message ?? 'Kayıt silinmiş veya yetkiniz yok olabilir.'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-[12px] text-ink-40">
        <Link href="/calisanlar" className="hover:text-ink-60">
          Çalışanlar
        </Link>
        <span>›</span>
        <span className="text-ink-60">{employee.tamAd}</span>
      </nav>

      {/* Header kart */}
      <div className="rounded-xl border border-line bg-bg p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xl font-semibold text-accent">
              {employee.initials}
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-ink">{employee.tamAd}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-60">
                <span>{dept?.name_tr ?? 'Departman atanmamış'}</span>
                <span className="text-ink-20">·</span>
                <span
                  className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] font-medium ${renkToPill[employee.durumRenk]}`}
                >
                  {employee.durumLabel}
                </span>
                <span className="text-ink-20">·</span>
                <span className="text-ink-40">Sicil: {employee.sicilNo || '—'}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/calisanlar/${employee.id}/duzenle`}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-bg px-3 text-[13px] font-medium text-ink-60 transition-colors hover:border-ink-20"
            >
              <Edit className="h-3.5 w-3.5" />
              Düzenle
            </Link>
            {employee.durum === 'active' && (
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={deleteMutation.isPending}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-red/30 bg-red-soft px-3 text-[13px] font-medium text-red transition-colors hover:bg-red-soft/80 disabled:opacity-50"
              >
                <Power className="h-3.5 w-3.5" />
                Devre dışı bırak
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-line bg-bg">
        <div className="border-b border-line">
          <nav className="flex gap-1 overflow-x-auto px-2">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`relative whitespace-nowrap px-4 py-3 text-[13px] font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'text-accent'
                    : 'text-ink-60 hover:text-ink-80'
                }`}
              >
                {tab.label}
                {activeTab === tab.key && (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-t bg-accent" />
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'genel' && (
            <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
              <InfoRow label="E-posta" icon={<Mail className="h-4 w-4" />} value={employee.email || '—'} />
              <InfoRow label="Sicil No" icon={<Hash className="h-4 w-4" />} value={employee.sicilNo || '—'} />
              <InfoRow label="TCKN" icon={<CreditCard className="h-4 w-4" />} value={maskTCKN(employee.tckn)} />
              <InfoRow
                label="Doğum Tarihi"
                icon={<Calendar className="h-4 w-4" />}
                value={
                  employee.dogumTarihi
                    ? new Date(employee.dogumTarihi).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : '—'
                }
              />
              <InfoRow
                label="İşe Başlama"
                icon={<Calendar className="h-4 w-4" />}
                value={
                  employee.iseBaslama
                    ? new Date(employee.iseBaslama).toLocaleDateString('tr-TR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    : '—'
                }
              />
              <InfoRow
                label="Kıdem"
                icon={<Calendar className="h-4 w-4" />}
                value={
                  employee.kidemAy > 0
                    ? `${Math.floor(employee.kidemAy / 12)} yıl ${employee.kidemAy % 12} ay`
                    : 'Yeni'
                }
              />
            </div>
          )}

          {activeTab === 'tukenmislik' && <EmployeeBurnoutTab employeeId={employee.id} />}

          {activeTab !== 'genel' && activeTab !== 'tukenmislik' && (
            <EmptyTab tab={activeTab} employeeId={employee.id} />
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

const InfoRow = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) => (
  <div>
    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-ink-40">
      {icon}
      {label}
    </div>
    <p className="mt-1 text-sm text-ink">{value}</p>
  </div>
);

const EmptyTab = ({ tab, employeeId }: { tab: Tab; employeeId: string }) => {
  const messages: Record<Exclude<Tab, 'genel'>, { title: string; desc: string; cta?: { label: string; href: string } }> = {
    tukenmislik: {
      title: 'Tükenmişlik verisi yok',
      desc: 'Çalışan henüz BAT-12-TR pulse anketi yanıtlamadı. Faz 3 (Tükenmişlik Modülü) aktif olunca buradan skorları göreceksiniz.',
      cta: { label: 'Tükenmişlik modülüne git', href: '/tukenmislik' },
    },
    guclu: {
      title: 'Güçlü yönler henüz ölçülmedi',
      desc: 'VIA 24 karakter gücü + JCS assessmentları Faz 4\'te canlı olacak.',
      cta: { label: 'Güçlü yönleri keşfet', href: '/guclu-yonler' },
    },
    izinler: {
      title: 'İzin geçmişi',
      desc: 'Çalışanın izin talepleri ve bakiyesi Faz 5\'te bu sekmede görünecek.',
      cta: { label: 'İzin modülüne git', href: '/izinler' },
    },
    belgeler: {
      title: 'Belgeler',
      desc: 'Sözleşme, kimlik, sertifikalar Faz 5\'te burada listelenecek.',
      cta: { label: 'Belge modülüne git', href: '/belgeler' },
    },
    gecmis: {
      title: 'Pozisyon geçmişi',
      desc: 'Terfi, departman değişimi ve rotasyon geçmişi employee-service history endpoint\'ine bağlanacak (Faz 2 devamı).',
    },
  };
  const m = messages[tab as Exclude<Tab, 'genel'>];
  void employeeId;
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-line bg-bg-2 py-12 text-center">
      <p className="text-sm font-medium text-ink">{m.title}</p>
      <p className="max-w-md text-xs text-ink-60">{m.desc}</p>
      {m.cta && (
        <Link
          href={m.cta.href}
          className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline"
        >
          {m.cta.label} →
        </Link>
      )}
    </div>
  );
};
