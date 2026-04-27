'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser, useClerk } from '@clerk/nextjs';
import {
  LayoutDashboard,
  Building2,
  Users,
  Flag,
  Activity,
  AlertOctagon,
  FileSearch,
  LogOut,
  Plug,
  Shield,
  Receipt,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  desc: string;
}

const NAV: NavItem[] = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard, desc: 'Platform durumu' },
  { href: '/tenants', label: 'Tenantlar', icon: Building2, desc: 'Müşteri yönetimi' },
  { href: '/billing', label: 'Billing', icon: Receipt, desc: 'MRR, fatura, Stripe' },
  { href: '/users', label: 'Kullanıcılar', icon: Users, desc: 'Global arama' },
  { href: '/flags', label: 'Feature Flags', icon: Flag, desc: 'Özellik aç/kapat' },
  { href: '/integrations/slack', label: 'Slack', icon: Plug, desc: 'OAuth + slash + DM' },
  { href: '/monitoring', label: 'Monitoring', icon: Activity, desc: 'Servis sağlığı' },
  { href: '/status', label: 'Status Page', icon: AlertOctagon, desc: 'Incident + bakım' },
  { href: '/audit', label: 'Audit Log', icon: FileSearch, desc: 'Denetim kayıtları' },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useUser();
  const clerk = useClerk();

  const signOut = async () => {
    await clerk.signOut();
    window.location.href = '/giris';
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-line bg-bg">
        <div className="flex h-14 items-center gap-2 border-b border-line px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#0A0A0A]">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold text-ink">UpCore</span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-accent">
              Admin
            </span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Ana menü">
          {NAV.map((item) => {
            const active =
              item.href === '/'
                ? pathname === '/'
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mb-0.5 flex items-start gap-2.5 rounded-md px-3 py-2.5 text-[13px] transition-colors ${
                  active
                    ? 'bg-accent-soft text-accent'
                    : 'text-ink-60 hover:bg-bg-2 hover:text-ink'
                }`}
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p
                    className={`text-[10px] ${active ? 'text-accent/70' : 'text-ink-40'}`}
                  >
                    {item.desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-line p-3">
          <div className="flex items-center gap-2 rounded-md bg-bg-2 p-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-[10px] font-semibold text-accent">
              {(user?.firstName?.[0] ?? '?').toUpperCase()}
              {(user?.lastName?.[0] ?? '?').toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-ink">
                {user?.fullName ?? user?.primaryEmailAddress?.emailAddress}
              </p>
              <p className="text-[10px] text-ink-40">UpCore Staff</p>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="rounded p-1 text-ink-40 hover:bg-bg-3 hover:text-red"
              aria-label="Çıkış"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-x-hidden">
        <div className="sticky top-0 z-10 border-b border-line bg-bg/95 px-8 py-3 backdrop-blur">
          <p className="text-[11px] font-medium uppercase tracking-widest text-amber">
            🔒 Internal Tool · Production Data
          </p>
        </div>
        <div className="px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
