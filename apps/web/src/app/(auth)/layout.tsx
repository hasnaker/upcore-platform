import Link from 'next/link';
import { siteConfig } from '@/config/site';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-bg-2">
      <header className="border-b border-line bg-bg">
        <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center px-6">
          <Link href="/" className="text-lg font-semibold text-ink">
            {siteConfig.name}
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
