export default function DegerlendirmelerLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="h-8 w-48 animate-pulse rounded-lg bg-[#F5F5F5]" />
          <div className="mt-2 h-4 w-72 animate-pulse rounded bg-[#F5F5F5]" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-32 animate-pulse rounded-lg bg-[#F5F5F5]" />
          <div className="h-9 w-36 animate-pulse rounded-lg bg-[#F5F5F5]" />
        </div>
      </div>
      <div className="flex gap-3 overflow-hidden">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="min-w-[240px] flex-shrink-0">
            <div className="h-10 w-full animate-pulse rounded-t-lg bg-[#F5F5F5]" />
            <div className="flex flex-col gap-2 rounded-b-lg border border-t-0 border-[#EDEDED] p-2">
              {[0, 1].map((j) => (
                <div key={j} className="h-[100px] animate-pulse rounded-lg bg-[#F5F5F5]" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
