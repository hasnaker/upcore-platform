import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pulse Anket — UpCore',
  description: 'UpCore tarafından gönderilen kısa çalışan pulse anketi.',
};

// Minimal layout — sidebar yok, ana (app) shell'inden izole.
export default function AnketLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-2">
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">{children}</div>
    </div>
  );
}
