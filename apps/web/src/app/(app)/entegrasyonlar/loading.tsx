export default function EntegrasyonlarLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="h-8 w-44 animate-pulse rounded-lg bg-[#F5F5F5]" />
        <div className="mt-2 h-4 w-80 animate-pulse rounded bg-[#F5F5F5]" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-0 border-b border-[#f0f0f0]">
        {[120, 130, 130].map((w, i) => (
          <div key={i} className="h-10 animate-pulse rounded bg-[#F5F5F5]" style={{ width: w }} />
        ))}
      </div>

      {/* Action button skeleton */}
      <div className="flex justify-end">
        <div className="h-10 w-36 animate-pulse rounded-lg bg-[#F5F5F5]" />
      </div>

      {/* Cards skeleton */}
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[140px] animate-pulse rounded-xl border border-[#EDEDED] bg-[#F5F5F5]" />
        ))}
      </div>
    </div>
  );
}
