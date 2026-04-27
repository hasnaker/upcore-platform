'use client';

import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface PulseStatus {
  has_sent_pulse: boolean;
  total_sent: number;
}

/**
 * FirstPulseCTA — onboarding kartı.
 * Tenant hiç pulse göndermediyse (has_sent_pulse = false) görünür.
 * Satış sonrası aktivasyon: "İlk pulse anketini başlat" sürtünmesini azaltır.
 */
export const FirstPulseCTA = () => {
  const { data, isLoading } = useQuery<PulseStatus>({
    queryKey: ['pulse-status'],
    queryFn: async () => {
      const res = await fetch('/api/v1/surveys/pulse/status');
      if (!res.ok) {
        // Default: varsayım yaparak kartı gösterme.
        return { has_sent_pulse: true, total_sent: 0 };
      }
      return res.json();
    },
    staleTime: 60_000,
  });

  if (isLoading || !data || data.has_sent_pulse) {
    return null;
  }

  return (
    <div className="relative overflow-hidden rounded-lg border border-[#5E5CE6] bg-gradient-to-br from-[#F5F4FF] to-white p-6">
      <div className="absolute right-4 top-4 hidden opacity-10 sm:block">
        <Sparkles className="h-20 w-20 text-[#5E5CE6]" />
      </div>
      <div className="relative flex flex-col gap-3 sm:max-w-xl">
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[#5E5CE6] px-2.5 py-1 text-[11px] font-medium text-white">
          <Sparkles className="h-3 w-3" />
          Yeni tenant
        </span>
        <h3 className="text-lg font-semibold text-[#0A0A0A]">
          İlk pulse anketinizi başlatın
        </h3>
        <p className="text-[13px] text-[#525252]">
          12 soruluk BAT-TR pulse anketi tükenmişlik, bağlılık ve motivasyon skorlarınızı bilimsel
          temelle ölçer. 2 dakikada şablondan başlatabilirsiniz — ilk raporunuz 48 saat içinde
          hazır olur.
        </p>
        <Link
          href="/anketler?template=bat12"
          className="mt-1 inline-flex w-fit items-center gap-2 rounded-md bg-[#0A0A0A] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-[#262626]"
        >
          Şablondan başlat
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
};
