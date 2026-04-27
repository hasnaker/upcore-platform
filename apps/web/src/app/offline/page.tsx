export const metadata = { title: 'Offline · UpCore' };

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-ink">Bağlantı yok</h1>
        <p className="mt-3 text-sm text-ink-60">
          İnternet bağlantın yok görünüyor. Önceden ziyaret ettiğin sayfaları hâlâ
          görebilirsin; tam işlevsellik için internete bağlan.
        </p>
        <p className="mt-6 text-[11px] text-ink-40">
          UpCore uygulamasını telefonuna ekle — Add to Home Screen ile hızlı erişim.
        </p>
      </div>
    </main>
  );
}
