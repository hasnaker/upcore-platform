'use client';

import { useEffect } from 'react';

export default function BelgelerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[belgeler error]', { message: error.message, digest: error.digest });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FEF2F2]">
        <svg className="h-6 w-6 text-[#DC2626]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <h2 className="mt-4 text-[16px] font-semibold text-[#111]">Bir hata olustu</h2>
      <p className="mt-1 max-w-md text-[14px] text-[#888]">
        Belgeler yuklenirken bir sorun olustu. Lutfen tekrar deneyin.
      </p>
      <button
        type="button"
        className="mt-6 rounded-lg border border-[#f0f0f0] bg-white px-4 py-2 text-[13px] font-semibold text-[#111] hover:bg-[#fafafa]"
        onClick={reset}
      >
        Tekrar Dene
      </button>
    </div>
  );
}
