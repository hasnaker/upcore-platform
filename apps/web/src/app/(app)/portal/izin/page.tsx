'use client';

import Link from 'next/link';
import { Calendar } from 'lucide-react';

export default function MyLeavePage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/portal" className="text-[12px] text-ink-40 hover:underline">← Portal</Link>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold text-ink">
          <Calendar className="h-5 w-5" />
          İzin Talebim
        </h1>
      </div>

      <section className="rounded-xl border border-line bg-bg p-6">
        <p className="text-sm text-ink-60">
          Bu sayfada izin bakiyen, talep geçmişin ve onay bekleyen başvuruların görünür.
          Mevcut <code>/izinler</code> modülü IK ekibi için; çalışan self-service versiyonu
          aynı veriyi senin üzerinden filtrelenmiş gösterir.
        </p>
        <p className="mt-3 text-[12px] text-ink-40">
          Entegrasyon: <code>leave</code> servisi · filter <code>employee_id=me</code>
        </p>
        <Link
          href="/izinler"
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#0A0A0A] px-3 py-2 text-[12px] font-medium text-white hover:bg-[#333]"
        >
          Tam izin modülüne git →
        </Link>
      </section>
    </div>
  );
}
