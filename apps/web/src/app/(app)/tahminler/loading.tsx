export default function TahminlerLoading() {
  return (
    <div className="flex flex-col gap-8">
      {/* Header skeleton */}
      <div>
        <div className="h-7 w-44 animate-pulse rounded-md bg-[#F5F5F5]" />
        <div className="mt-2 h-4 w-96 animate-pulse rounded-md bg-[#F5F5F5]" />
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-[120px] animate-pulse rounded-xl border border-[#EDEDED] bg-[#FAFAFA]"
          />
        ))}
      </div>

      {/* Tab bar skeleton */}
      <div className="h-12 animate-pulse rounded-xl border border-[#EDEDED] bg-[#FAFAFA]" />

      {/* List skeleton */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-5"
          >
            <div className="h-10 w-10 animate-pulse rounded-full bg-[#F5F5F5]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-36 animate-pulse rounded bg-[#F5F5F5]" />
              <div className="h-3 w-24 animate-pulse rounded bg-[#F5F5F5]" />
            </div>
            <div className="h-6 w-16 animate-pulse rounded bg-[#F5F5F5]" />
          </div>
        ))}
      </div>
    </div>
  );
}
