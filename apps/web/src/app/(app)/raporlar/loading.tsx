export default function RaporlarLoading() {
  return (
    <div className="flex flex-col gap-8">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 animate-pulse rounded-lg bg-[#F5F5F5]" />
          <div className="mt-2 h-4 w-72 animate-pulse rounded bg-[#F5F5F5]" />
        </div>
        <div className="h-9 w-32 animate-pulse rounded-lg bg-[#F5F5F5]" />
      </div>

      {/* Report types skeleton */}
      <div>
        <div className="h-5 w-28 animate-pulse rounded bg-[#F5F5F5]" />
        <div className="mt-1 h-3 w-48 animate-pulse rounded bg-[#F5F5F5]" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[#EDEDED] bg-white p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 animate-pulse rounded-lg bg-[#F5F5F5]" />
                <div className="flex-1">
                  <div className="h-4 w-32 animate-pulse rounded bg-[#F5F5F5]" />
                  <div className="mt-2 h-3 w-full animate-pulse rounded bg-[#F5F5F5]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Saved reports skeleton */}
      <div>
        <div className="h-5 w-32 animate-pulse rounded bg-[#F5F5F5]" />
        <div className="mt-1 h-3 w-56 animate-pulse rounded bg-[#F5F5F5]" />
        <div className="mt-4 rounded-xl border border-[#EDEDED] bg-white p-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3">
              <div className="h-7 w-7 animate-pulse rounded-md bg-[#F5F5F5]" />
              <div className="h-4 w-40 animate-pulse rounded bg-[#F5F5F5]" />
              <div className="h-4 w-24 animate-pulse rounded bg-[#F5F5F5]" />
              <div className="ml-auto h-6 w-16 animate-pulse rounded bg-[#F5F5F5]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
