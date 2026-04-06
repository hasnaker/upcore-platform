'use client';

import { useEffect } from 'react';

export default function KariyerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[kariyer error]', {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FEE2E2]">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#DC2626"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>
      <h2 className="mt-4 text-lg font-semibold text-[#0A0A0A]">
        Kariyer verileri yuklenemedi
      </h2>
      <p className="mt-1 max-w-sm text-sm text-[#525252]">
        Beklenmeyen bir hata olustu. Lutfen tekrar deneyin.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex items-center gap-2 rounded-lg border border-[#EDEDED] bg-white px-4 py-2 text-sm font-medium text-[#0A0A0A] transition-colors hover:border-[#D4D4D4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E5CE6]"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
        Tekrar dene
      </button>
    </div>
  );
}
