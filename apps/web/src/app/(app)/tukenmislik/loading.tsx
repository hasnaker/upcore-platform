export default function TukenmislikLoading() {
  return (
    <div className="flex flex-col gap-12">
      {/* Header skeleton */}
      <div>
        <div className="h-7 w-52 animate-pulse rounded-md bg-[#F5F5F5]" />
        <div className="mt-2 h-4 w-80 animate-pulse rounded-md bg-[#F5F5F5]" />
      </div>

      {/* Heatmap + Sidebar skeleton */}
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="h-80 animate-pulse rounded-lg border border-[#EDEDED] bg-[#FAFAFA]" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[76px] animate-pulse rounded-lg border border-[#EDEDED] bg-[#FAFAFA]"
            />
          ))}
        </div>
      </div>

      {/* Critical employees skeleton */}
      <div className="overflow-hidden rounded-lg border border-[#EDEDED]">
        <div className="border-b border-[#EDEDED] bg-[#FAFAFA] px-5 py-4">
          <div className="h-5 w-40 animate-pulse rounded bg-[#F5F5F5]" />
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-[#EDEDED] px-5 py-3.5 last:border-b-0"
          >
            <div className="h-9 w-9 animate-pulse rounded-full bg-[#F5F5F5]" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-32 animate-pulse rounded bg-[#F5F5F5]" />
              <div className="h-3 w-20 animate-pulse rounded bg-[#F5F5F5]" />
            </div>
            <div className="h-4 w-12 animate-pulse rounded bg-[#F5F5F5]" />
          </div>
        ))}
      </div>
    </div>
  );
}
