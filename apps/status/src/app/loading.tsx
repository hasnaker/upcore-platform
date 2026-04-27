export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl p-6 md:p-10">
      <div className="h-8 w-64 animate-pulse rounded bg-bg-3" />
      <div className="mt-6 h-20 animate-pulse rounded-xl bg-bg-3" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <div className="h-40 animate-pulse rounded-xl bg-bg-3" />
          <div className="h-40 animate-pulse rounded-xl bg-bg-3" />
          <div className="h-40 animate-pulse rounded-xl bg-bg-3" />
        </div>
        <div className="flex flex-col gap-6">
          <div className="h-40 animate-pulse rounded-xl bg-bg-3" />
          <div className="h-40 animate-pulse rounded-xl bg-bg-3" />
        </div>
      </div>
    </main>
  );
}
