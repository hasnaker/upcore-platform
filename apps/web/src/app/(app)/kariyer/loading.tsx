export default function KariyerLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header skeleton */}
      <div>
        <div className="h-7 w-52 animate-pulse rounded-md bg-[#F5F5F5]" />
        <div className="mt-2 h-4 w-80 animate-pulse rounded-md bg-[#F5F5F5]" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-4 border-b border-[#f0f0f0] pb-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-5 w-28 animate-pulse rounded bg-[#F5F5F5]" />
        ))}
      </div>

      {/* Privacy banner skeleton */}
      <div className="h-12 animate-pulse rounded-lg border border-[#EDEDED] bg-[#FAFAFA]" />

      {/* Position cards skeleton */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-[140px] animate-pulse rounded-xl border border-[#EDEDED] bg-[#FAFAFA]"
        />
      ))}
    </div>
  );
}
