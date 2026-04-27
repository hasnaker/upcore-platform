'use client';

import Link from 'next/link';
import { Target } from 'lucide-react';

export default function MyAssessmentsPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link href="/portal" className="text-[12px] text-ink-40 hover:underline">← Portal</Link>
        <h1 className="mt-2 flex items-center gap-2 text-xl font-semibold text-ink">
          <Target className="h-5 w-5" />
          Değerlendirmelerim
        </h1>
        <p className="mt-1 text-sm text-ink-60">
          Sana atanmış anketler (BAT-TR / COPSOQ / UWES / UpCap / VIA) ve performans döngüsü
          review sonuçların burada.
        </p>
      </div>

      <section className="rounded-xl border border-line bg-bg p-6">
        <p className="text-sm text-ink-60">
          KVKK uyumu gereği ham yanıtlar anonim olarak işlenir — yöneticin yalnız agregat sonucu
          görür. Kendi T-skor ve yüzdelik sıralamana bu sayfadan ulaşabilirsin.
        </p>
        <Link
          href="/degerlendirmeler/canli"
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#0A0A0A] px-3 py-2 text-[12px] font-medium text-white hover:bg-[#333]"
        >
          Değerlendirme panelime git →
        </Link>
      </section>
    </div>
  );
}
