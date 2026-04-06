import type { LucideIcon } from 'lucide-react';

interface PagePlaceholderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: React.ReactNode;
}

export function PagePlaceholder({
  icon: Icon,
  title,
  description,
  children,
}: PagePlaceholderProps) {
  return (
    <div>
      <header className="flex items-start justify-between gap-6 border-b border-line pb-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-60">{description}</p>
        </div>
      </header>
      <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed border-line bg-bg p-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-accent-soft text-accent">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <h2 className="mt-4 text-base font-semibold text-ink">Bu modül yakında hazır olacak</h2>
        <p className="mt-1 max-w-md text-sm text-ink-60">
          İskelet tamamlandı. Arka uç entegrasyonu ve veri akışı sprint yol haritasında.
        </p>
        {children && <div className="mt-6">{children}</div>}
      </div>
    </div>
  );
}
