export default function AyarlarLoading() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <div className="h-8 w-28 animate-pulse rounded-lg bg-[#F5F5F5]" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-[#F5F5F5]" />
      </div>
      <div className="flex gap-2">
        {[64, 56, 72, 80, 72].map((w, i) => (
          <div key={i} className="h-9 animate-pulse rounded-lg bg-[#F5F5F5]" style={{ width: w }} />
        ))}
      </div>
      <div className="rounded-lg border border-[#EDEDED] bg-white p-5">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 animate-pulse rounded-full bg-[#F5F5F5]" />
          <div>
            <div className="h-5 w-32 animate-pulse rounded bg-[#F5F5F5]" />
            <div className="mt-2 h-4 w-48 animate-pulse rounded bg-[#F5F5F5]" />
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-[#F5F5F5]" />
          ))}
        </div>
      </div>
    </div>
  );
}
