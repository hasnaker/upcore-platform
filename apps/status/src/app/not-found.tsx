import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center justify-center p-12 text-center">
      <h1 className="text-3xl font-semibold text-ink">Sayfa bulunamadı</h1>
      <p className="mt-2 text-sm text-ink-60">
        Aradığınız incident veya kayıt kaldırılmış olabilir. Güncel platform durumu için status
        sayfasına dönün.
      </p>
      <Link
        href="/status"
        className="mt-6 rounded-md bg-accent px-4 py-2 text-[13px] font-semibold text-white hover:bg-accent/90"
      >
        Status sayfasına dön
      </Link>
    </main>
  );
}
