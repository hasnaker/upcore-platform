import type { Metadata } from 'next';
import { Pricing } from '@/components/marketing/Pricing';

export const metadata: Metadata = {
  title: 'Fiyatlandırma',
  description:
    'Upcore planları ve fiyatlandırması. Çalışan başına aylık ücret, saklı maliyet yok. 14 gün ücretsiz deneme.',
};

export default function FiyatlandirmaPage() {
  return (
    <>
      <section className="border-b border-line">
        <div className="mx-auto w-full max-w-[1280px] px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-ink md:text-5xl">
              İhtiyacınıza uygun plan
            </h1>
            <p className="mt-4 text-lg text-ink-60">
              Ekibiniz büyüdükçe planınız da büyüsün. Her planda temel bilimsel ölçüm
              araçları dahil.
            </p>
          </div>
        </div>
      </section>
      <Pricing />
    </>
  );
}
