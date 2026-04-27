'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthMe } from '@/hooks/useAuthMe';
import { useT } from '@/hooks/useLocale';

// Canlı endpoints: gateway üzerinden gerçek Go+ML servislerine bağlı
// yeni nesil sayfalar. Eski mock sayfalar /performans, /bordro vb. altlarda
// halen erişilebilir — sidebar default olarak canlı versiyona yönlendirir.
//
// Rol bazlı görünürlük:
//   - admin/hr_admin/cxo/hr_director: hepsi
//   - manager/team_lead: çalışan & operasyonel modüller (yönetim panelleri yok)
//   - employee (self-service): yalnız /portal altı
type NavRole = 'all' | 'management' | 'manager' | 'employee_portal';

const NAV_ITEMS: { href: string; labelKey: string; icon: string; visibleIn?: NavRole[] }[] = [
  { href: '/panel', labelKey: 'nav.action_center', icon: 'zap' },
  { href: '/executive/canli', labelKey: 'nav.executive', icon: 'bar-chart', visibleIn: ['all'] },
  { href: '/calisanlar', labelKey: 'nav.employees', icon: 'users' },
  { href: '/departmanlar', labelKey: 'nav.departments', icon: 'building', visibleIn: ['all'] },
  { href: '/izinler', labelKey: 'nav.leave', icon: 'calendar' },
  { href: '/belgeler', labelKey: 'nav.documents', icon: 'file' },
  { href: '/tukenmislik', labelKey: 'nav.burnout', icon: 'activity' },
  { href: '/anketler', labelKey: 'nav.surveys', icon: 'clipboard' },
  { href: '/degerlendirmeler/canli', labelKey: 'nav.assessments', icon: 'target' },
  { href: '/guclu-yonler', labelKey: 'nav.strengths', icon: 'star' },
  { href: '/performans/canli', labelKey: 'nav.performance', icon: 'award' },
  { href: '/kariyer/canli', labelKey: 'nav.career', icon: 'compass' },
  { href: '/ucretlendirme', labelKey: 'nav.compensation', icon: 'dollar', visibleIn: ['all'] },
  { href: '/egitim', labelKey: 'nav.training', icon: 'book' },
  { href: '/baglilik', labelKey: 'nav.engagement', icon: 'heart' },
  { href: '/is-akislari', labelKey: 'nav.workflows', icon: 'workflow', visibleIn: ['all'] },
  { href: '/risk-sentez', labelKey: 'nav.risk_synth', icon: 'shield', visibleIn: ['all'] },
  { href: '/tahminler', labelKey: 'nav.predictions', icon: 'brain', visibleIn: ['all'] },
  { href: '/onboarding-yonetimi', labelKey: 'nav.onboarding', icon: 'rocket', visibleIn: ['all'] },
  { href: '/organizasyon', labelKey: 'nav.organization', icon: 'org' },
  { href: '/raporlar', labelKey: 'nav.reports', icon: 'report', visibleIn: ['all'] },
  { href: '/mesai', labelKey: 'nav.shifts', icon: 'clock' },
  { href: '/bordro/canli', labelKey: 'nav.payroll', icon: 'wallet', visibleIn: ['all'] },
  { href: '/cikis-yonetimi', labelKey: 'nav.offboarding', icon: 'door', visibleIn: ['all'] },
  { href: '/entegrasyonlar', labelKey: 'nav.integrations', icon: 'plug', visibleIn: ['all'] },
  { href: '/analytics', labelKey: 'nav.analytics', icon: 'trending-up', visibleIn: ['all'] },
  { href: '/aksiyonlar/canli', labelKey: 'nav.actions', icon: 'list' },
  { href: '/bildirimler', labelKey: 'nav.notifications', icon: 'bell' },
  { href: '/denetim', labelKey: 'nav.audit', icon: 'shield', visibleIn: ['all'] },
  { href: '/ayarlar/canli', labelKey: 'nav.settings', icon: 'settings', visibleIn: ['all'] },
];

const PORTAL_NAV_ITEMS: { href: string; labelKey: string; icon: string }[] = [
  { href: '/portal', labelKey: 'nav.portal_profile', icon: 'users' },
  { href: '/portal/bordrolar', labelKey: 'nav.portal_slips', icon: 'wallet' },
  { href: '/portal/izin', labelKey: 'nav.portal_leave', icon: 'calendar' },
  { href: '/portal/degerlendirme', labelKey: 'nav.portal_assessments', icon: 'target' },
  { href: '/portal/belgeler', labelKey: 'nav.portal_documents', icon: 'file' },
  { href: '/portal/kvkk-consent-manager', labelKey: 'nav.portal_consents', icon: 'shield' },
  { href: '/bildirimler', labelKey: 'nav.notifications', icon: 'bell' },
];

function resolveRole(roles: string[]): NavRole {
  const r = roles.map((x) => x.toLowerCase());
  if (r.some((x) => ['admin', 'hr_admin', 'hr_director', 'cxo', 'payroll_admin'].includes(x))) {
    return 'all';
  }
  if (r.some((x) => ['manager', 'team_lead'].includes(x))) return 'manager';
  if (r.includes('employee')) return 'employee_portal';
  return 'manager'; // safe default — not full admin
}

function filterItems(role: NavRole) {
  if (role === 'employee_portal') return PORTAL_NAV_ITEMS.map((i) => ({ ...i, visibleIn: undefined }));
  return NAV_ITEMS.filter((item) => {
    if (!item.visibleIn) return true; // default visible everywhere non-portal
    return item.visibleIn.includes(role) || item.visibleIn.includes('all') && role === 'all';
  });
}


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
  star: <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></>,
  award: <><circle cx="12" cy="8" r="7" /><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" /></>,
  compass: <><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></>,
  dollar: <><path strokeLinecap="round" strokeLinejoin="round" d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" /></>,
  book: <><path strokeLinecap="round" strokeLinejoin="round" d="M4 19.5A2.5 2.5 0 016.5 17H20" /><path strokeLinecap="round" strokeLinejoin="round" d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" /></>,
  heart: <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />,
  workflow: <><path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M3 12h18M3 18h18" /><circle cx="6" cy="6" r="2" fill="currentColor" /><circle cx="12" cy="12" r="2" fill="currentColor" /><circle cx="18" cy="18" r="2" fill="currentColor" /></>,
  shield: <><path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></>,
  bell: <><path strokeLinecap="round" strokeLinejoin="round" d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.73 21a2 2 0 0 1-3.46 0" /></>,
  brain: <><path strokeLinecap="round" strokeLinejoin="round" d="M12 2a7 7 0 017 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 01-1 1H9a1 1 0 01-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 017-7z" /><path strokeLinecap="round" d="M9 21h6" /></>,
  rocket: <><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 00-2.91-.09z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 15l-3-3a22 22 0 012-3.95A12.88 12.88 0 0122 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 01-4 2z" /></>,
  org: <><circle cx="12" cy="5" r="3" /><path strokeLinecap="round" d="M12 8v4M6 16a2 2 0 100-4 2 2 0 000 4zM18 16a2 2 0 100-4 2 2 0 000 4zM12 12l-6 2M12 12l6 2" /></>,
  report: <><path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path strokeLinecap="round" d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" d="M12 6v6l4 2" /></>,
  wallet: <><path strokeLinecap="round" strokeLinejoin="round" d="M21 12V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2v-5z" /><path strokeLinecap="round" d="M16 12a1 1 0 102 0 1 1 0 00-2 0z" /></>,
  door: <><path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" /></>,
  plug: <><path strokeLinecap="round" strokeLinejoin="round" d="M12 22V18M7 18h10M8 14V8M16 14V8M6 8h12" /></>,
};

export function AppSidebar() {
  const pathname = usePathname();
  const me = useAuthMe();
  const t = useT();
  const role = me.isLoading ? 'all' : resolveRole(me.roles ?? []);
  const items = filterItems(role);

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
        {items.map((item) => {
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
              {t(item.labelKey)}
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
