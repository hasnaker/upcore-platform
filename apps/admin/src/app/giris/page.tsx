'use client';

import { Suspense } from 'react';
import { SignIn } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, Shield } from 'lucide-react';

export default function GirisPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-2 p-6">
      <div className="mb-8 flex items-center gap-2.5">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#0A0A0A]">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-lg font-bold text-ink">UpCore</p>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-accent">
            Admin Panel
          </p>
        </div>
      </div>

      <Suspense fallback={null}>
        <ErrorBanner />
      </Suspense>

      <SignIn
        appearance={{
          elements: {
            formButtonPrimary:
              'bg-[#5e5ce6] hover:bg-[#4B4AC5] text-sm normal-case rounded-md',
            card: 'shadow-sm border border-[#EDEDED]',
          },
        }}
      />

      <p className="mt-6 max-w-sm text-center text-[11px] text-ink-40">
        Bu panel UpCore internal kullanım içindir. Tüm aksiyonlar audit log&apos;a kayıt
        edilir.
      </p>
    </div>
  );
}

function ErrorBanner() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  if (error !== 'unauthorized') return null;

  return (
    <div className="mb-4 flex max-w-sm items-start gap-2 rounded-md border border-red/30 bg-red-soft p-3 text-[12px] text-red">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-semibold">Yetkisiz erişim</p>
        <p className="mt-1 text-[11px]">
          Admin paneline yalnızca UpCore staff üyeleri girebilir. Müşteri iseniz{' '}
          <a href="https://upcore.app/panel" className="underline">
            app.upcore.app
          </a>{' '}
          adresini kullanın.
        </p>
      </div>
    </div>
  );
}
