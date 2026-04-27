'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export default function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[status]', error);
  }, [error]);
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center justify-center p-12 text-center">
      <h1 className="text-3xl font-semibold text-ink">Beklenmeyen bir hata oluştu</h1>
      <p className="mt-2 text-sm text-ink-60">
        Status servisi kısa süreli ulaşılamaz olabilir. Sayfayı yenilemeyi deneyin; sorun devam
        ederse destek hattına ulaşın.
      </p>
      <div className="mt-6 flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-white hover:bg-accent/90"
        >
          Tekrar dene
        </button>
        <Link
          href="/status"
          className="rounded-md border border-line bg-bg px-4 py-2 text-[13px] font-semibold text-ink hover:border-accent"
        >
          Status sayfası
        </Link>
      </div>
    </main>
  );
}
