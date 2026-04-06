import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hakkımızda',
  description:
    "Upcore, Türkiye'nin ilk bilim-temelli İK platformu. JD-R modeli ve peer-reviewed ölçüm araçlarıyla kanıta dayalı İK karar desteği sunuyoruz.",
};

export default function HakkimizdaPage() {
  return (
    <article className="mx-auto w-full max-w-[768px] px-6 py-16">
      <h1 className="text-4xl font-semibold tracking-tight text-ink">Hakkımızda</h1>
      <div className="mt-8 space-y-6 text-lg leading-relaxed text-ink-80">
        <p>
          Upcore, iş dünyasının en büyük soruna yanıt vermek için kuruldu: İK kararları neden
          hâlâ hislerle veriliyor?
        </p>
        <p>
          Türkiye&apos;de 2 milyondan fazla çalışanın hizmet verdiği KOBİ&apos;ler, dünya
          standartlarında bilimsel ölçüm araçlarına erişemiyor. Biz bu boşluğu kapatıyoruz —
          peer-reviewed psikometrik araçları, modern bir SaaS deneyimiyle Türk İK ekiplerine
          sunuyoruz.
        </p>
        <p>
          <strong className="font-semibold text-ink">Misyonumuz:</strong> Türkiye&apos;deki her
          İK profesyoneline, kurumsal şirketlerin kullandığı bilimsel ölçüm kalitesini
          ulaşılabilir kılmak.
        </p>
        <p>
          <strong className="font-semibold text-ink">Farkımız:</strong> Veri pazarlaması değil,
          bilimsel validasyon. Hangi ölçeği, neden, hangi limitasyonlarla kullandığımızı{' '}
          <a href="/bilimsel-temel" className="text-accent underline underline-offset-2">
            Bilimsel Temel
          </a>{' '}
          sayfamızda şeffafça paylaşıyoruz.
        </p>
      </div>
    </article>
  );
}
