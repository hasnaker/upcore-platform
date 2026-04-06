'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FEE2E2]">
        <svg className="h-6 w-6 text-[#DC2626]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <h2 className="text-[16px] font-semibold text-[#111]">Bir hata olustu</h2>
      <p className="max-w-md text-center text-[13px] text-[#888]">
        {error.message || 'Beklenmeyen bir hata meydana geldi. Lutfen tekrar deneyin.'}
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-[#5E5CE6] px-5 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#4B49B6]"
      >
        Tekrar Dene
      </button>
    </div>
  );
}
