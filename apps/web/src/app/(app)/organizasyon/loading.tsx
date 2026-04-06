export default function OrganizasyonLoading() {
  return (
    <div className="flex flex-col gap-8">
      {/* Page header skeleton */}
      <div>
        <div className="h-8 w-56 animate-pulse rounded-lg bg-[#F5F5F5]" />
        <div className="mt-2 h-4 w-80 animate-pulse rounded bg-[#F5F5F5]" />
      </div>

      {/* Metric cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[#EDEDED] bg-white p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-lg bg-[#F5F5F5]" />
              <div>
                <div className="h-3 w-20 animate-pulse rounded bg-[#F5F5F5]" />
                <div className="mt-2 h-5 w-16 animate-pulse rounded bg-[#F5F5F5]" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-2">
        <div className="h-9 w-44 animate-pulse rounded-lg bg-[#F5F5F5]" />
        <div className="h-9 w-36 animate-pulse rounded-lg bg-[#F5F5F5]" />
        <div className="h-9 w-40 animate-pulse rounded-lg bg-[#F5F5F5]" />
      </div>

      {/* Content skeleton */}
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[#EDEDED] bg-white p-5">
            <div className="h-5 w-32 animate-pulse rounded bg-[#F5F5F5]" />
            <div className="mt-2 h-3 w-48 animate-pulse rounded bg-[#F5F5F5]" />
            <div className="mt-5 h-2 w-full animate-pulse rounded-full bg-[#F5F5F5]" />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="h-14 animate-pulse rounded-lg bg-[#F5F5F5]" />
              <div className="h-14 animate-pulse rounded-lg bg-[#F5F5F5]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
