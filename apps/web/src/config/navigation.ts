import {
  LayoutDashboard,
  Users,
  Network,
  CalendarDays,
  FileText,
  ClipboardCheck,
  BarChart3,
  Flame,
  Target,
  Compass,
  Briefcase,
  Settings,
  LogOut,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const appNavigation: NavSection[] = [
  {
    items: [
      { href: '/panel', label: 'Panel', icon: LayoutDashboard },
      { href: '/aksiyonlar', label: 'Aksiyonlar', icon: Target },
    ],
  },
  {
    title: 'Organizasyon',
    items: [
      { href: '/calisanlar', label: 'Çalışanlar', icon: Users },
      { href: '/departmanlar', label: 'Departmanlar', icon: Network },
      { href: '/izinler', label: 'İzinler', icon: CalendarDays },
      { href: '/belgeler', label: 'Belgeler', icon: FileText },
    ],
  },
  {
    title: 'Kazanım',
    items: [
      { href: '/ats', label: 'ATS · İşe Alım', icon: Briefcase },
      { href: '/degerlendirmeler', label: 'Değerlendirmeler', icon: ClipboardCheck },
    ],
  },
  {
    title: 'Gelisim',
    items: [
      { href: '/kariyer', label: 'Kariyer', icon: Compass },
    ],
  },
  {
    title: 'Ölçüm',
    items: [
      { href: '/anketler', label: 'Anketler', icon: BarChart3 },
      { href: '/tukenmislik', label: 'Tükenmişlik', icon: Flame },
    ],
  },
  {
    title: 'Sistem',
    items: [
      { href: '/cikis-yonetimi', label: 'Cikis Yonetimi', icon: LogOut },
      { href: '/ayarlar', label: 'Ayarlar', icon: Settings },
    ],
  },
];

export const marketingNavigation: { href: string; label: string }[] = [
  { href: '/hakkimizda', label: 'Hakkımızda' },
  { href: '/fiyatlandirma', label: 'Fiyatlandırma' },
  { href: '/bilimsel-temel', label: 'Bilimsel Temel' },
  { href: '/iletisim', label: 'İletişim' },
];
