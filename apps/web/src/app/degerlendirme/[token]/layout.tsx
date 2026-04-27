import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Aday Değerlendirme — UpCore',
  description:
    'UpCore tarafından gönderilen aday psikometrik değerlendirmesi. Sonuçlar yalnızca işveren İK ekibi tarafından görüntülenir.',
};

// Minimal layout — sidebar yok, odak vurgusu.
export default function DegerlendirmeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg-2">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">{children}</div>
    </div>
  );
}
