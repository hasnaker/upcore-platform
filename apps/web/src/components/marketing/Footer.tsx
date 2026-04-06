import Link from 'next/link';
import { siteConfig } from '@/config/site';
import { marketingNavigation } from '@/config/navigation';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-line bg-bg-2">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-12">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="text-lg font-semibold text-ink">{siteConfig.name}</div>
            <p className="mt-2 max-w-md text-sm text-ink-60">{siteConfig.description}</p>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-60">Ürün</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-80">
              {marketingNavigation.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-accent">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-60">Hesap</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-80">
              <li>
                <Link href="/giris" className="hover:text-accent">
                  Giriş Yap
                </Link>
              </li>
              <li>
                <Link href="/kayit" className="hover:text-accent">
                  Ücretsiz Başla
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 flex items-center justify-between border-t border-line pt-6 text-xs text-ink-60">
          <span>
            © {year} {siteConfig.name}. Tüm hakları saklıdır.
          </span>
          <span>Türkiye · KVKK uyumlu</span>
        </div>
      </div>
    </footer>
  );
}
