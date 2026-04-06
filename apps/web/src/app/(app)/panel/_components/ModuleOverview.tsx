import {
  Users,
  Flame,
  ClipboardCheck,
  ArrowLeftRight,
  type LucideIcon,
} from 'lucide-react';

interface ModuleItem {
  name: string;
  description: string;
  icon: LucideIcon;
  active: boolean;
  stat: string;
}

const modules: ModuleItem[] = [
  {
    name: 'Calisanlar',
    description: 'HRIS yonetimi',
    icon: Users,
    active: true,
    stat: '48 aktif calisan',
  },
  {
    name: 'Tukenmislik',
    description: 'BAT-12-TR izleme',
    icon: Flame,
    active: true,
    stat: 'Ort. skor: 32',
  },
  {
    name: 'Degerlendirme',
    description: '360 & OKR',
    icon: ClipboardCheck,
    active: true,
    stat: '5 bekleyen',
  },
  {
    name: 'Rotasyon',
    description: 'Ic mobilite',
    icon: ArrowLeftRight,
    active: false,
    stat: 'Yakin zamanda',
  },
];

export const ModuleOverview = () => {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {modules.map((mod) => {
        const Icon = mod.icon;
        return (
          <div
            key={mod.name}
            className="flex items-center gap-4 rounded-lg border border-[#EDEDED] bg-white p-5 transition-colors hover:border-[#D4D4D4]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FAFAFA]">
              <Icon className="h-5 w-5 text-[#525252]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-[#0A0A0A]">
                  {mod.name}
                </span>
                {mod.active ? (
                  <span className="inline-flex h-5 items-center rounded-full bg-[#D1FAE5] px-2 text-[11px] font-medium text-[#059669]">
                    Aktif
                  </span>
                ) : (
                  <span className="inline-flex h-5 items-center rounded-full bg-[#F5F5F5] px-2 text-[11px] font-medium text-[#A3A3A3]">
                    Pasif
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[13px] text-[#525252]">
                {mod.description}
              </p>
            </div>
            <span className="text-xs tabular-nums text-[#A3A3A3]">
              {mod.stat}
            </span>
          </div>
        );
      })}
    </div>
  );
};
