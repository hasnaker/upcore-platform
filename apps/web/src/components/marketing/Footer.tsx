import Link from 'next/link';
import Image from 'next/image';
import { siteConfig } from '@/config/site';

const COL_MODULES = [
  { href: '/moduller/kazanim', label: 'Kazanım' },
  { href: '/moduller/surdurme', label: 'Sürdürme' },
  { href: '/moduller/gelistirme', label: 'Geliştirme' },
  { href: '/moduller/yerlestirme', label: 'Yerleştirme' },
  { href: '/moduller/koruma', label: 'Koruma' },
];

const COL_SOLUTIONS = [
  { href: '/cozumler/kobi', label: 'KOBİ · 1-10 Çalışan' },
  { href: '/cozumler/belediye', label: 'Kamu & Belediye' },
  { href: '/cozumler/holding', label: 'Holding / 4000+' },
  { href: '/cozumler/ats', label: '300K+ Başvuru Şirketi' },
  { href: '/musteriler', label: 'Vaka Çalışmaları' },
];

const COL_COMPANY = [
  { href: '/bilimsel-temel', label: 'Bilimsel Temel' },
  { href: '/hakkimizda', label: 'Hakkımızda' },
  { href: '/iletisim', label: 'İletişim' },
  { href: '/entegrasyonlar', label: 'Entegrasyonlar' },
];

const COL_LEGAL = [
  { href: '/gizlilik', label: 'Gizlilik & KVKK' },
  { href: '/sartlar', label: 'Kullanım Şartları' },
  { href: '/cerez-politikasi', label: 'Çerez Politikası' },
  { href: '/kvkk', label: 'KVKK Aydınlatma (v0)' },
  { href: 'mailto:kvkk@upcore.io', label: 'Veri Sahibi Başvuru', external: true },
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[#E5E7EB] bg-[#F9FAFB]">
      <div className="mx-auto w-full max-w-[1200px] px-6 py-16">
        <div className="grid gap-10 md:grid-cols-5">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link href="/" className="inline-flex items-center" aria-label="UpCore anasayfa">
              <Image src="/upcore-logo.svg" alt="UpCore" width={440} height={112} className="h-24 w-auto" />
            </Link>
            <p className="mt-5 text-[12.5px] leading-relaxed text-[#4B5563]">
              {siteConfig.tagline}
            </p>
            <div className="mt-5 flex flex-col gap-1.5">
              <span className="inline-flex w-fit items-center gap-1.5 border border-[#E5E7EB] bg-white px-2 py-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[#4B5563]">
                <span className="h-1 w-1 bg-[#059669]" />
                KVKK Uyumlu
              </span>
              <span className="inline-flex w-fit items-center border border-[#E5E7EB] bg-white px-2 py-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[#4B5563]">
                ISO 27001 Hazırlık
              </span>
              <span className="inline-flex w-fit items-center border border-[#E5E7EB] bg-white px-2 py-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[#4B5563]">
                Azure North Europe
              </span>
            </div>
          </div>

          <FooterCol title="Modüller" items={COL_MODULES} />
          <FooterCol title="Çözümler" items={COL_SOLUTIONS} />
          <FooterCol title="Şirket" items={COL_COMPANY} />
          <FooterCol title="Yasal" items={COL_LEGAL} />
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-3 border-t border-[#E5E7EB] pt-6 text-[11px] text-[#6B7280] sm:flex-row sm:items-center">
          <div className="flex flex-col gap-1">
            <span className="font-mono font-semibold uppercase tracking-[0.08em]">
              © {year} UpCore Teknoloji Anonim Şirketi
            </span>
            <span className="text-[10px] text-[#9CA3AF]">
              Maslak, Sarıyer / İstanbul · VKN: 8950000000 · Mersis: 0895-0000-0000-0000
            </span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <a href="mailto:satis@upcore.io" className="text-[#4B5563] hover:text-[#FF5400]">
              satis@upcore.io
            </a>
            <a href="mailto:kvkk@upcore.io" className="text-[#4B5563] hover:text-[#FF5400]">
              kvkk@upcore.io
            </a>
            <a href="https://status.upcore.io" target="_blank" rel="noreferrer" className="text-[#4B5563] hover:text-[#FF5400]">
              status.upcore.io
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

const FooterCol = ({
  title,
  items,
}: {
  title: string;
  items: Array<{ href: string; label: string; external?: boolean }>;
}) => (
  <div>
    <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">{title}</h3>
    <ul className="mt-4 flex flex-col gap-2.5 text-[12.5px]">
      {items.map((item) =>
        item.external ? (
          <li key={item.href}>
            <a href={item.href} className="text-[#374151] hover:text-[#FF5400]">
              {item.label}
            </a>
          </li>
        ) : (
          <li key={item.href}>
            <Link href={item.href} className="text-[#374151] hover:text-[#FF5400]">
              {item.label}
            </Link>
          </li>
        ),
      )}
    </ul>
  </div>
);
