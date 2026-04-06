export default function CalisanlarLoading() {
  return (
    <div className="flex flex-col gap-8">
      {/* Header skeleton */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="h-7 w-32 animate-pulse rounded-md bg-[#F5F5F5]" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded-md bg-[#F5F5F5]" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded-lg bg-[#F5F5F5]" />
      </div>

      {/* Stats bar skeleton */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-8 w-24 animate-pulse rounded-full bg-[#F5F5F5]"
          />
        ))}
      </div>

      {/* Search skeleton */}
      <div className="h-10 w-full animate-pulse rounded-lg bg-[#F5F5F5]" />

      {/* Table skeleton */}
      <div className="overflow-hidden rounded-lg border border-[#EDEDED]">
        <div className="h-10 border-b border-[#EDEDED] bg-[#FAFAFA]" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-[#EDEDED] px-4 py-3 last:border-b-0"
          >
            <div className="h-9 w-9 animate-pulse rounded-full bg-[#F5F5F5]" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-40 animate-pulse rounded bg-[#F5F5F5]" />
              <div className="h-3 w-24 animate-pulse rounded bg-[#F5F5F5]" />
            </div>
            <div className="h-5 w-16 animate-pulse rounded-full bg-[#F5F5F5]" />
          </div>
        ))}
      </div>
    </div>
  );
}
