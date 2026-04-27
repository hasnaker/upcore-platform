'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Structured log + Sentry capture. digest Next.js'in hata redaction
    // ID'si — kullanıcıya gösterilen hata ile Sentry kaydı arasında
    // korelasyon kurulur (support workflow).
    console.error('[app error]', { message: error.message, digest: error.digest });
    Sentry.captureException(error, {
      tags: { source: 'app-root-error-boundary' },
      extra: { digest: error.digest },
    });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-2 px-6 text-center">
      <div className="text-sm font-semibold uppercase tracking-wide text-red">Hata</div>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink">
        Bir şeyler ters gitti
      </h1>
      <p className="mt-2 max-w-md text-sm text-ink-60">
        Beklenmeyen bir hata oluştu. Sorun devam ederse lütfen destek ekibiyle iletişime geçin.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 inline-flex h-10 items-center justify-center rounded-md bg-accent px-5 text-sm font-medium text-bg transition-colors hover:bg-accent/90"
      >
        Tekrar dene
      </button>
    </div>
  );
}
