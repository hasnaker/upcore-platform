'use client';

import Link from 'next/link';
import {
  Users,
  Flame,
  ArrowLeftRight,
  Sparkles,
  Shield,
  Briefcase,
  type LucideIcon,
} from 'lucide-react';
import { useTenantModules, type ProductModule } from '@/hooks/useTenantModules';

// UpCore'un 5 kategorisine eşleşen ikonlar (Asena modelinin sütunları).
const iconByCategory: Record<ProductModule['category'], LucideIcon> = {
  kazanim: Briefcase,
  surdurme: Flame,
  gelistirme: Sparkles,
  yerlestirme: ArrowLeftRight,
  koruma: Shield,
};

// Pasif modül için tıklanabilir "detayları incele" target'ları.
const catalogHrefByCategory: Record<ProductModule['category'], string> = {
  kazanim: '/moduller/kazanim',
  surdurme: '/moduller/surdurme',
  gelistirme: '/moduller/gelistirme',
  yerlestirme: '/moduller/yerlestirme',
  koruma: '/moduller/koruma',
};

export const ModuleOverview = () => {
  const { data, isLoading, isError, refetch } = useTenantModules();

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-20 animate-pulse rounded-lg border border-[#EDEDED] bg-white"
          />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-[#FECACA] bg-[#FEF2F2] px-5 py-4 text-sm text-[#B91C1C]">
        Modüller yüklenemedi.
        <button
          type="button"
          onClick={() => refetch()}
          className="ml-2 text-[12px] font-semibold underline"
        >
          Yeniden dene
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="mb-3 flex items-center gap-2 text-[11px] text-[#A3A3A3]">
        <Users className="h-3.5 w-3.5" />
        <span>
          {data.plan_tier.toUpperCase()} planı · {data.active_count}/{data.modules.length} modül
          aktif
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {data.modules.map((mod) => {
          const Icon = iconByCategory[mod.category] ?? Users;
          const href = mod.active
            ? `/moduller/${mod.category}`
            : catalogHrefByCategory[mod.category];
          return (
            <Link
              key={mod.id}
              href={href}
              className={`flex items-start gap-4 rounded-lg border bg-white p-5 transition-colors ${
                mod.active
                  ? 'border-[#EDEDED] hover:border-[#D4D4D4]'
                  : 'border-[#EDEDED] opacity-70 hover:opacity-100 hover:border-[#5E5CE6]'
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FAFAFA]">
                <Icon className="h-5 w-5 text-[#525252]" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-[#0A0A0A]">{mod.name_tr}</span>
                  {mod.active ? (
                    <span className="inline-flex h-5 items-center rounded-full bg-[#D1FAE5] px-2 text-[11px] font-medium text-[#059669]">
                      Aktif
                    </span>
                  ) : (
                    <span className="inline-flex h-5 items-center rounded-full bg-[#F5F5F5] px-2 text-[11px] font-medium text-[#A3A3A3]">
                      Aktifleştir →
                    </span>
                  )}
                </div>
                <p className="mt-0.5 line-clamp-2 text-[13px] text-[#525252]">
                  {mod.description_tr}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
};
