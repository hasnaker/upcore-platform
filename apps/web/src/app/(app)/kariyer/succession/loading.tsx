export default function SuccessionLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header skeleton */}
      <div>
        <div className="h-7 w-48 animate-pulse rounded-md bg-[#F5F5F5]" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded-md bg-[#F5F5F5]" />
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[80px] animate-pulse rounded-xl border border-[#EDEDED] bg-[#FAFAFA]"
          />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="overflow-hidden rounded-xl border border-[#EDEDED]">
        <div className="border-b border-[#EDEDED] bg-[#FAFAFA] px-6 py-4">
          <div className="h-5 w-60 animate-pulse rounded bg-[#F5F5F5]" />
        </div>
        <div className="border-b border-[#EDEDED] bg-[#FAFAFA] px-6 py-3">
          <div className="grid grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-3 w-full animate-pulse rounded bg-[#F5F5F5]" />
            ))}
          </div>
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-[#EDEDED] px-6 py-4 last:border-b-0"
          >
            <div className="h-4 w-40 animate-pulse rounded bg-[#F5F5F5]" />
            <div className="h-4 w-24 animate-pulse rounded bg-[#F5F5F5]" />
            <div className="h-4 w-24 animate-pulse rounded bg-[#F5F5F5]" />
            <div className="h-4 w-24 animate-pulse rounded bg-[#F5F5F5]" />
            <div className="h-4 w-24 animate-pulse rounded bg-[#F5F5F5]" />
          </div>
        ))}
      </div>
    </div>
  );
}
