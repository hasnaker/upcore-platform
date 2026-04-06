export default function CandidateDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-7 w-48 animate-pulse rounded bg-bg-3" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-64 animate-pulse rounded-lg border border-line bg-bg-3" />
        <div className="h-80 animate-pulse rounded-lg border border-line bg-bg-3 lg:col-span-2" />
      </div>
    </div>
  );
}
