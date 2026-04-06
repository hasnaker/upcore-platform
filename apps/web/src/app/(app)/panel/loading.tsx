export default function PanelLoading() {
  return (
    <div className="flex flex-col gap-12">
      {/* Greeting skeleton */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="h-7 w-56 animate-pulse rounded-md bg-[#F5F5F5]" />
          <div className="mt-2 h-4 w-72 animate-pulse rounded-md bg-[#F5F5F5]" />
        </div>
        <div className="h-4 w-40 animate-pulse rounded-md bg-[#F5F5F5]" />
      </div>

      {/* Priority Actions skeleton */}
      <section>
        <div className="mb-5 h-4 w-44 animate-pulse rounded-md bg-[#F5F5F5]" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg border border-[#EDEDED] bg-[#FAFAFA]"
            />
          ))}
        </div>
      </section>

      {/* Weekly Recap skeleton */}
      <section>
        <div className="mb-5 h-4 w-24 animate-pulse rounded-md bg-[#F5F5F5]" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-lg border border-[#EDEDED] bg-[#FAFAFA]"
            />
          ))}
        </div>
      </section>

      {/* Modules skeleton */}
      <section>
        <div className="mb-5 h-4 w-20 animate-pulse rounded-md bg-[#F5F5F5]" />
        <div className="grid gap-3 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg border border-[#EDEDED] bg-[#FAFAFA]"
            />
          ))}
        </div>
      </section>
    </div>
  );
}
