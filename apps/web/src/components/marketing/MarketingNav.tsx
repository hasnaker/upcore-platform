import Link from 'next/link';

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#EDEDED] bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0A0A0A]">
            <span className="text-sm font-extrabold text-white">U</span>
          </div>
          <span className="text-[17px] font-bold tracking-tight text-[#0A0A0A]">
            Upcore
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-8 md:flex" aria-label="Ana menü">
          <Link href="/fiyatlandirma" className="text-[13px] font-medium text-[#525252] transition-colors hover:text-[#0A0A0A]">
            Fiyatlandırma
          </Link>
          <Link href="/bilimsel-temel" className="text-[13px] font-medium text-[#525252] transition-colors hover:text-[#0A0A0A]">
            Bilimsel Temel
          </Link>
          <Link href="/hakkimizda" className="text-[13px] font-medium text-[#525252] transition-colors hover:text-[#0A0A0A]">
            Hakkımızda
          </Link>
          <Link href="/iletisim" className="text-[13px] font-medium text-[#525252] transition-colors hover:text-[#0A0A0A]">
            İletişim
          </Link>
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <Link
            href="/giris"
            className="text-[13px] font-medium text-[#525252] transition-colors hover:text-[#0A0A0A]"
          >
            Giriş Yap
          </Link>
          <Link
            href="/kayit"
            className="inline-flex h-9 items-center justify-center rounded-lg bg-[#0A0A0A] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[#262626]"
          >
            Ücretsiz Başla
          </Link>
        </div>
      </div>
    </header>
  );
}
