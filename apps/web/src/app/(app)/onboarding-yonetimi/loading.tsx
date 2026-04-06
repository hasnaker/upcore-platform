export default function OnboardingYonetimiLoading() {
  return (
    <div className="flex flex-col gap-8">
      {/* Header skeleton */}
      <div>
        <div className="h-7 w-56 animate-pulse rounded-md bg-[#F5F5F5]" />
        <div className="mt-2 h-4 w-80 animate-pulse rounded-md bg-[#F5F5F5]" />
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-[120px] animate-pulse rounded-xl border border-[#EDEDED] bg-[#FAFAFA]"
          />
        ))}
      </div>

      {/* Action bar skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-5 w-40 animate-pulse rounded bg-[#F5F5F5]" />
        <div className="h-9 w-36 animate-pulse rounded-lg bg-[#F5F5F5]" />
      </div>

      {/* Plan cards skeleton */}
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[#EDEDED] bg-[#FAFAFA]"
          >
            <div className="flex items-center gap-4 p-5">
              <div className="h-10 w-10 animate-pulse rounded-full bg-[#F5F5F5]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-36 animate-pulse rounded bg-[#F5F5F5]" />
                <div className="h-3 w-48 animate-pulse rounded bg-[#F5F5F5]" />
              </div>
              <div className="h-6 w-20 animate-pulse rounded bg-[#F5F5F5]" />
            </div>
            <div className="border-t border-[#EDEDED] px-5 py-3">
              <div className="flex items-center justify-between">
                {Array.from({ length: 5 }).map((_, j) => (
                  <div key={j} className="flex items-center">
                    <div className="h-3 w-3 animate-pulse rounded-full bg-[#F5F5F5]" />
                    {j < 4 && <div className="mx-2 h-0.5 w-12 bg-[#F5F5F5]" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
