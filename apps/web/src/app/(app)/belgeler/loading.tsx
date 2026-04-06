export default function BelgelerLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="h-8 w-32 animate-pulse rounded-lg bg-[#F5F5F5]" />
          <div className="mt-2 h-4 w-72 animate-pulse rounded bg-[#F5F5F5]" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded-lg bg-[#F5F5F5]" />
      </div>
      <div className="h-10 w-full max-w-sm animate-pulse rounded-lg bg-[#F5F5F5]" />
      <div className="flex gap-2">
        {[80, 72, 60, 56, 64, 72, 80].map((w, i) => (
          <div key={i} className="h-8 animate-pulse rounded-full bg-[#F5F5F5]" style={{ width: w }} />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-[200px] animate-pulse rounded-lg border border-[#EDEDED] bg-[#F5F5F5]" />
        ))}
      </div>
    </div>
  );
}
