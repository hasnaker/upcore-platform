import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg-2 px-6 text-center">
      <div className="text-sm font-semibold uppercase tracking-wide text-accent">404</div>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink">
        Sayfa bulunamadı
      </h1>
      <p className="mt-2 max-w-md text-sm text-ink-60">
        Aradığınız sayfa taşınmış veya hiç var olmamış olabilir.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex h-10 items-center justify-center rounded-md bg-accent px-5 text-sm font-medium text-bg transition-colors hover:bg-accent/90"
      >
        Ana sayfaya dön
      </Link>
    </div>
  );
}
