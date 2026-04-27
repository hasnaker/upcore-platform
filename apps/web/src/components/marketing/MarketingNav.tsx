'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, Menu, X } from 'lucide-react';

interface NavGroup {
  label: string;
  items: Array<{ href: string; title: string; desc: string }>;
}

const MODULES: NavGroup = {
  label: 'Modüller',
  items: [
    {
      href: '/moduller/kazanim',
      title: 'Kazanım · İşe Alım',
      desc: 'Kariyer.net + LinkedIn başvuruları · aday kişilik testi · iş-aday uyumu',
    },
    {
      href: '/moduller/surdurme',
      title: 'Sürdürme · Tükenmişlik Ölçümü',
      desc: 'Haftada 1 dakikalık anonim anket · istifa 6 ay öncesinden uyarısı',
    },
    {
      href: '/moduller/gelistirme',
      title: 'Geliştirme · Güçlü Yanlar',
      desc: '24 karakter gücü · kişisel gelişim planı · psikolojik dayanıklılık',
    },
    {
      href: '/moduller/yerlestirme',
      title: 'Yerleştirme · Kariyer Yolu',
      desc: 'İç ilanlar · yedek havuzu · kritik pozisyon succession',
    },
    {
      href: '/moduller/koruma',
      title: 'Koruma · Müdahale',
      desc: 'Tükenmişliğe karşı 20+ bilimsel müdahale · etki ölçümü',
    },
  ],
};

const SOLUTIONS: NavGroup = {
  label: 'Çözümler',
  items: [
    {
      href: '/cozumler/kobi',
      title: 'KOBİ · 1-10 Çalışan',
      desc: 'Yıllık ₺1.900 sabit · özlük + izin + bordro + SGK · 5 dakikada kurulum',
    },
    {
      href: '/cozumler/belediye',
      title: 'Belediye & Kamu',
      desc: '657 memur + 4857 işçi + 4/B sözleşmeli · Sayıştay raporu · zabıta/temizlik tükenmişlik',
    },
    {
      href: '/cozumler/holding',
      title: 'Holding · 4000+ Çalışan',
      desc: 'Çoklu şirket yapısı · CHRO yönetici paneli · 18 şirket tek platformda',
    },
    {
      href: '/cozumler/ats',
      title: '300K+ Başvurulu Şirket',
      desc: 'Kariyer.net + LinkedIn otomatik · toplu psikometrik değerlendirme · recruiter 3 kat kapasite',
    },
  ],
};

export function MarketingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-[#E5E7EB] bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-32 w-full max-w-[1200px] items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3" aria-label="UpCore anasayfa">
          <Image
            src="/upcore-logo.svg"
            alt="UpCore"
            width={480}
            height={128}
            priority
            className="h-28 w-auto"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 md:flex" aria-label="Ana menü">
          <NavDropdown group={MODULES} />
          <NavDropdown group={SOLUTIONS} />
          <NavLink href="/bilimsel-temel">Bilimsel Temel</NavLink>
          <NavLink href="/blog">Blog</NavLink>
          <NavLink href="/fiyatlandirma">Fiyatlandırma</NavLink>
          <NavLink href="/hakkimizda">Hakkımızda</NavLink>
          <NavLink href="/guven">Güven Merkezi</NavLink>
        </nav>

        {/* Desktop CTA */}
        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/giris"
            className="text-[12.5px] font-medium text-[#374151] transition-colors hover:text-[#0F1419]"
          >
            Müşteri Girişi
          </Link>
          <Link
            href="/demo"
            className="inline-flex h-8 items-center justify-center rounded-md bg-[#0F1419] px-3.5 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#FF5400]"
          >
            Demo Talep Et
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md md:hidden"
          aria-label="Menüyü aç"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-t border-[#EDEDED] bg-white md:hidden">
          <div className="flex flex-col gap-1 p-4">
            <MobileSection label="Modüller" items={MODULES.items} onClose={() => setMobileOpen(false)} />
            <MobileSection label="Çözümler" items={SOLUTIONS.items} onClose={() => setMobileOpen(false)} />
            <Link
              href="/bilimsel-temel"
              className="rounded-md px-3 py-2 text-sm font-medium text-[#111] hover:bg-[#fafafa]"
              onClick={() => setMobileOpen(false)}
            >
              Bilimsel Temel
            </Link>
            <Link
              href="/blog"
              className="rounded-md px-3 py-2 text-sm font-medium text-[#111] hover:bg-[#fafafa]"
              onClick={() => setMobileOpen(false)}
            >
              Blog
            </Link>
            <Link
              href="/fiyatlandirma"
              className="rounded-md px-3 py-2 text-sm font-medium text-[#111] hover:bg-[#fafafa]"
              onClick={() => setMobileOpen(false)}
            >
              Fiyatlandırma
            </Link>
            <Link
              href="/hakkimizda"
              className="rounded-md px-3 py-2 text-sm font-medium text-[#111] hover:bg-[#fafafa]"
              onClick={() => setMobileOpen(false)}
            >
              Hakkımızda
            </Link>
            <div className="mt-3 flex flex-col gap-2 border-t border-[#E5E7EB] pt-3">
              <Link
                href="/giris"
                className="rounded-md border border-[#D1D5DB] bg-white px-3 py-2 text-center text-sm font-medium text-[#374151]"
                onClick={() => setMobileOpen(false)}
              >
                Müşteri Girişi
              </Link>
              <Link
                href="/demo"
                className="rounded-md bg-[#0F1419] px-3 py-2 text-center text-sm font-semibold text-white"
                onClick={() => setMobileOpen(false)}
              >
                Demo Talep Et
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link
    href={href}
    className="text-[12.5px] font-medium text-[#374151] transition-colors hover:text-[#0F1419]"
  >
    {children}
  </Link>
);

const NavDropdown = ({ group }: { group: NavGroup }) => {
  return (
    <div className="group relative">
      <button
        type="button"
        className="flex items-center gap-1 text-[12.5px] font-medium text-[#374151] transition-colors hover:text-[#0F1419]"
        aria-haspopup="true"
      >
        {group.label}
        <ChevronDown className="h-3 w-3 transition-transform group-hover:rotate-180" strokeWidth={2} />
      </button>
      <div className="invisible absolute left-0 top-full z-50 min-w-[400px] opacity-0 transition-opacity group-hover:visible group-hover:opacity-100">
        <div className="mt-2 border border-[#E5E7EB] bg-white shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)]">
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col gap-0.5 border-b border-[#F3F4F6] px-4 py-3 transition-colors last:border-b-0 hover:bg-[#F9FAFB]"
            >
              <span className="text-[12.5px] font-semibold text-[#0F1419]">{item.title}</span>
              <span className="text-[11px] leading-snug text-[#6B7280]">{item.desc}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

const MobileSection = ({
  label,
  items,
  onClose,
}: {
  label: string;
  items: NavGroup['items'];
  onClose: () => void;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium text-[#111] hover:bg-[#fafafa]"
      >
        {label}
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="mt-1 ml-3 flex flex-col gap-0.5">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="rounded-md px-3 py-2 text-[13px] text-[#525252] hover:bg-[#fafafa] hover:text-[#0A0A0A]"
            >
              {item.title}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
