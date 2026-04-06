export default function DepartmanlarLoading() {
  return (
    <div className="flex flex-col gap-8">
      {/* Page header skeleton */}
      <div className="flex items-start justify-between">
        <div>
          <div className="h-8 w-48 animate-pulse rounded-lg bg-[#F5F5F5]" />
          <div className="mt-2 h-4 w-80 animate-pulse rounded bg-[#F5F5F5]" />
        </div>
        <div className="h-9 w-36 animate-pulse rounded-lg bg-[#F5F5F5]" />
      </div>

      {/* Tabs skeleton */}
      <div className="flex gap-2">
        <div className="h-9 w-40 animate-pulse rounded-lg bg-[#F5F5F5]" />
        <div className="h-9 w-32 animate-pulse rounded-lg bg-[#F5F5F5]" />
        <div className="h-9 w-36 animate-pulse rounded-lg bg-[#F5F5F5]" />
      </div>

      {/* Tree skeleton */}
      <div className="rounded-lg border border-[#EDEDED] bg-white p-5">
        <div className="h-5 w-40 animate-pulse rounded bg-[#F5F5F5]" />
        <div className="mt-6 flex flex-col gap-3">
          <div className="h-10 w-full animate-pulse rounded bg-[#F5F5F5]" />
          <div className="ml-6 h-10 w-[calc(100%-24px)] animate-pulse rounded bg-[#F5F5F5]" />
          <div className="ml-12 h-10 w-[calc(100%-48px)] animate-pulse rounded bg-[#F5F5F5]" />
          <div className="ml-12 h-10 w-[calc(100%-48px)] animate-pulse rounded bg-[#F5F5F5]" />
          <div className="ml-6 h-10 w-[calc(100%-24px)] animate-pulse rounded bg-[#F5F5F5]" />
          <div className="ml-6 h-10 w-[calc(100%-24px)] animate-pulse rounded bg-[#F5F5F5]" />
        </div>
      </div>
    </div>
  );
}
