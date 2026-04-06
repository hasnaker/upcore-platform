export default function Loading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f0f0f0] border-t-[#5E5CE6]" />
        <span className="text-[13px] text-[#888]">Yukleniyor...</span>
      </div>
    </div>
  );
}
