export default function AnketlerLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="h-8 w-32 animate-pulse rounded-lg bg-[#F5F5F5]" />
          <div className="mt-2 h-4 w-80 animate-pulse rounded bg-[#F5F5F5]" />
        </div>
        <div className="h-9 w-40 animate-pulse rounded-lg bg-[#F5F5F5]" />
      </div>
      <div className="flex gap-2">
        <div className="h-9 w-32 animate-pulse rounded-lg bg-[#F5F5F5]" />
        <div className="h-9 w-28 animate-pulse rounded-lg bg-[#F5F5F5]" />
      </div>
      <div className="flex flex-col gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-[140px] animate-pulse rounded-lg border border-[#EDEDED] bg-[#F5F5F5]" />
        ))}
      </div>
    </div>
  );
}
