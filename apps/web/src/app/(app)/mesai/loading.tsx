export default function MesaiLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="h-8 w-56 animate-pulse rounded-lg bg-[#F5F5F5]" />
          <div className="mt-2 h-4 w-80 animate-pulse rounded bg-[#F5F5F5]" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 animate-pulse rounded-lg bg-[#F5F5F5]" />
          <div className="h-9 w-28 animate-pulse rounded-lg bg-[#F5F5F5]" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[100px] animate-pulse rounded-lg border border-[#EDEDED] bg-[#F5F5F5]" />
        ))}
      </div>
      <div className="flex gap-2">
        <div className="h-9 w-32 animate-pulse rounded-lg bg-[#F5F5F5]" />
        <div className="h-9 w-32 animate-pulse rounded-lg bg-[#F5F5F5]" />
        <div className="h-9 w-36 animate-pulse rounded-lg bg-[#F5F5F5]" />
      </div>
      <div className="rounded-lg border border-[#EDEDED] bg-white">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="border-b border-[#EDEDED] px-4 py-4">
            <div className="h-4 w-full animate-pulse rounded bg-[#F5F5F5]" />
          </div>
        ))}
      </div>
    </div>
  );
}
