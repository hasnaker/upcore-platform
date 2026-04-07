export default function CikisYonetimiLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="h-8 w-48 animate-pulse rounded-lg bg-[#F5F5F5]" />
          <div className="mt-2 h-4 w-80 animate-pulse rounded bg-[#F5F5F5]" />
        </div>
        <div className="h-10 w-44 animate-pulse rounded-lg bg-[#F5F5F5]" />
      </div>

      {/* Summary cards skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[120px] animate-pulse rounded-xl border border-[#EDEDED] bg-[#F5F5F5]" />
        ))}
      </div>

      {/* Section label */}
      <div className="h-4 w-36 animate-pulse rounded bg-[#F5F5F5]" />

      {/* Process cards skeleton */}
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[130px] animate-pulse rounded-xl border border-[#EDEDED] bg-[#F5F5F5]" />
        ))}
      </div>
    </div>
  );
}
