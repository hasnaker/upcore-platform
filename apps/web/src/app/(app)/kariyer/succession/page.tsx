'use client';

/**
 * /kariyer/succession — legacy IK yedekleme sayfası.
 *
 * Yeni canlı UI artık /admin/succession altında:
 *   - /admin/succession/pozisyonlar     → kritik pozisyon haritası
 *   - /admin/succession/havuz/[planId]  → ready_now / 1y / 2y havuz kolonları
 *
 * Bu sayfa sadece sekmeleri yeniden yönlendirir — hardcoded veri kalmadı.
 */

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useCriticalPositions } from '@/hooks/useSuccession';

export default function SuccessionPage() {
  const router = useRouter();
  const { data, isLoading, isError } = useCriticalPositions();

  // Auto-redirect to the new admin URL when mounted — keeps deep-links alive.
  useEffect(() => {
    const t = setTimeout(() => {
      router.replace('/admin/succession/pozisyonlar');
    }, 300);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111]">Yedekleme Planlama</h1>
        <p className="mt-1 text-sm text-[#888]">
          Bu sayfa{' '}
          <Link
            href="/admin/succession/pozisyonlar"
            className="text-[#5E5CE6] underline"
          >
            /admin/succession/pozisyonlar
          </Link>{' '}
          adresine taşındı — yönlendiriliyor...
        </p>
      </div>

      {isLoading && (
        <div className="h-20 animate-pulse rounded-xl border border-[#EDEDED] bg-[#FAFAFA]" />
      )}
      {isError && (
        <div className="rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-4 py-3 text-sm text-[#991B1B]">
          Kritik pozisyon listesi alınamadı — lütfen yeniden deneyin.
        </div>
      )}
      {!isLoading && !isError && (
        <div className="rounded-xl border border-[#EDEDED] bg-white p-6 text-sm text-[#555]">
          {data?.items?.length
            ? `${data.items.length} kritik pozisyon mevcut. Yeni panele geçiş yapılıyor...`
            : 'Henüz kritik pozisyon tanımlı değil.'}
        </div>
      )}

      <Link
        href="/admin/succession/pozisyonlar"
        className="w-fit rounded-md bg-[#5E5CE6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4F4DD1]"
      >
        Yeni panele git →
      </Link>
    </div>
  );
}
