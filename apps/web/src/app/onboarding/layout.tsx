import Link from 'next/link';
import { siteConfig } from '@/config/site';

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-bg-2">
      <header className="border-b border-line bg-bg">
        <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center justify-between px-6">
          <Link href="/" className="text-lg font-semibold text-ink">
            {siteConfig.name}
          </Link>
          <span className="text-xs text-ink-60">Kurulum sihirbazı</span>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1280px] flex-1 px-6 py-10">
        {children}
      </main>
    </div>
  );
}
