'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function PanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[panel error]', { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FEE2E2]">
        <AlertTriangle className="h-6 w-6 text-[#DC2626]" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-[#0A0A0A]">
        Panel yuklenemedi
      </h2>
      <p className="mt-1 max-w-sm text-sm text-[#525252]">
        Beklenmeyen bir hata olustu. Lutfen tekrar deneyin.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[#EDEDED] bg-white px-4 py-2 text-sm font-medium text-[#0A0A0A] transition-colors hover:border-[#D4D4D4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E5CE6]"
      >
        <RotateCcw className="h-4 w-4" />
        Tekrar dene
      </button>
    </div>
  );
}
