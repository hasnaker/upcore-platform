'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/panel', label: 'Aksiyon Merkezi', icon: 'zap' },
  { href: '/executive', label: 'Yönetici Paneli', icon: 'bar-chart' },
  { href: '/calisanlar', label: 'Çalışanlar', icon: 'users' },
  { href: '/departmanlar', label: 'Departmanlar', icon: 'building' },
  { href: '/izinler', label: 'İzinler', icon: 'calendar' },
  { href: '/belgeler', label: 'Belgeler', icon: 'file' },
  { href: '/tukenmislik', label: 'Tükenmişlik', icon: 'activity' },
  { href: '/anketler', label: 'Anketler', icon: 'clipboard' },
  { href: '/degerlendirmeler', label: 'Değerlendirmeler', icon: 'target' },
  { href: '/analytics', label: 'Analitik', icon: 'trending-up' },
  { href: '/aksiyonlar', label: 'Aksiyonlar', icon: 'list' },
  { href: '/ayarlar', label: 'Ayarlar', icon: 'settings' },
];

const ICONS: Record<string, React.ReactNode> = {
  zap: <path strokeLinecap="round" strokeLinejoin="round" d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />,
  users: <><path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  building: <><path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1" /><path strokeLinecap="round" strokeLinejoin="round" d="M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16" /></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18" /></>,
  file: <><path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></>,
  activity: <path strokeLinecap="round" strokeLinejoin="round" d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  clipboard: <><path strokeLinecap="round" strokeLinejoin="round" d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /></>,
  target: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>,
  list: <><path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>,
  'bar-chart': <><path strokeLinecap="round" strokeLinejoin="round" d="M18 20V10M12 20V4M6 20v-6" /></>,
  'trending-up': <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></>,
};

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-[240px] shrink-0 flex-col border-r border-[#f0f0f0] bg-white">
      {/* Logo */}
      <div className="flex h-14 items-center gap-2.5 border-b border-[#f0f0f0] px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#111]">
          <span className="text-[11px] font-extrabold text-white">U</span>
        </div>
        <span className="text-[15px] font-bold text-[#111]">Upcore</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                active
                  ? 'bg-[#f0f0ff] text-[#5E5CE6]'
                  : 'text-[#666] hover:bg-[#f8f8f8] hover:text-[#111]'
              }`}
            >
              <svg
                className={`h-[16px] w-[16px] shrink-0 ${active ? 'text-[#5E5CE6]' : 'text-[#999]'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                {ICONS[item.icon]}
              </svg>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-[#f0f0f0] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f0f0ff] text-[11px] font-bold text-[#5E5CE6]">
            HA
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-[#111]">Hasan Aker</div>
            <div className="truncate text-[11px] text-[#999]">İK Direktörü</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
