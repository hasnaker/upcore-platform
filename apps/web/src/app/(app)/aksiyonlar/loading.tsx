export default function AksiyonlarLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="h-8 w-44 animate-pulse rounded-lg bg-[#F5F5F5]" />
        <div className="mt-2 h-4 w-80 animate-pulse rounded bg-[#F5F5F5]" />
      </div>
      <div className="flex gap-2">
        <div className="h-9 w-20 animate-pulse rounded-lg bg-[#F5F5F5]" />
        <div className="h-9 w-24 animate-pulse rounded-lg bg-[#F5F5F5]" />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="h-10 w-full max-w-sm animate-pulse rounded-lg bg-[#F5F5F5]" />
        <div className="flex gap-2">
          {[80, 88, 64, 56, 96].map((w, i) => (
            <div key={i} className="h-8 animate-pulse rounded-full bg-[#F5F5F5]" style={{ width: w }} />
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-[120px] animate-pulse rounded-lg border border-[#EDEDED] bg-[#F5F5F5]" />
        ))}
      </div>
    </div>
  );
}
