import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bilimsel Temel',
  description:
    "Upcore'un kullandığı ölçüm araçlarının bilimsel referansları: JD-R, BAT-12-TR, COPSOQ-III-TR, Job Crafting. Şeffaf validasyon ve limitasyonlar.",
};

interface ScaleCitation {
  name: string;
  fullName: string;
  authors: string;
  year: string;
  detail: string;
  limitations?: string;
}

const scales: ScaleCitation[] = [
  {
    name: 'JD-R Model',
    fullName: 'Job Demands–Resources Model',
    authors: 'Bakker & Demerouti',
    year: '2007, 2017',
    detail:
      "İş kaynakları (autonomy, sosyal destek, geri bildirim) ve iş talepleri (iş yükü, duygusal talep) arasındaki dengenin, tükenmişlik ve iş bağlılığını öngördüğü meta-teori. Güncel 2017 revizyonu Upcore'un temel çerçevesidir.",
  },
  {
    name: 'BAT-12-TR',
    fullName: 'Burnout Assessment Tool — Turkish adaptation',
    authors: 'Koçak',
    year: '2022',
    detail:
      'Schaufeli ve Leiter&apos;ın BAT ölçeğinin Türkçe validasyonu. N=2778 Türk çalışan örnekleminde, 4-faktörlü yapı (exhaustion, mental distance, cognitive impairment, emotional impairment) doğrulanmıştır. Cronbach α > .85.',
    limitations:
      'Klinik tanı aracı değildir. Kesim noktaları yönetsel risk sinyali olarak yorumlanmalıdır.',
  },
  {
    name: 'COPSOQ-III-TR',
    fullName: 'Copenhagen Psychosocial Questionnaire III — Turkish',
    authors: 'Şahan et al.',
    year: '2019',
    detail:
      'İş stres ölçümünün altın standardı. CFI=0.98, RMSEA=0.04 ile Türkçe validasyonu tamamlanmıştır. Upcore kısa formunu (32 madde) kullanır.',
  },
  {
    name: 'Job Crafting',
    fullName: 'Job Crafting Theory',
    authors: 'Wrzesniewski & Dutton',
    year: '2001',
    detail:
      'Çalışanların işlerini proaktif olarak yeniden şekillendirme davranışı. Task, relational ve cognitive crafting boyutları Tims & Bakker (2012) ölçeğiyle operasyonelleştirilir.',
  },
];

export default function BilimselTemelPage() {
  return (
    <article className="mx-auto w-full max-w-[880px] px-6 py-16">
      <header className="border-b border-line pb-10">
        <span className="text-xs font-semibold uppercase tracking-wide text-accent">
          Honest vendor page
        </span>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink md:text-5xl">
          Bilimsel Temel
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-60">
          Upcore&apos;un kullandığı her ölçüm aracının peer-reviewed bilimsel kaynağı vardır.
          Hangi ölçeği neden seçtiğimizi, limitasyonlarını ve devam eden validasyon
          çalışmalarımızı burada şeffafça paylaşıyoruz. Çünkü veri, ancak kaynağı güvenilirse
          güvenilir olabilir.
        </p>
      </header>

      <section className="mt-12 space-y-10">
        {scales.map((scale) => (
          <div key={scale.name} className="border-b border-line pb-10 last:border-none">
            <div className="flex flex-wrap items-baseline gap-3">
              <h2 className="text-2xl font-semibold text-ink">{scale.name}</h2>
              <span className="text-sm text-ink-60">{scale.fullName}</span>
            </div>
            <p className="mt-1 text-sm text-ink-60">
              {scale.authors} ({scale.year})
            </p>
            <p className="mt-4 leading-relaxed text-ink-80">{scale.detail}</p>
            {scale.limitations && (
              <div className="mt-4 rounded-md border border-amber-soft bg-amber-soft/40 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber">
                  Limitasyon
                </p>
                <p className="mt-1 text-sm text-ink-80">{scale.limitations}</p>
              </div>
            )}
          </div>
        ))}
      </section>

      <aside className="mt-12 rounded-lg border border-accent/30 bg-accent-soft/50 p-6">
        <h3 className="text-lg font-semibold text-ink">Şeffaflık Taahhüdü</h3>
        <p className="mt-2 leading-relaxed text-ink-80">
          <strong className="font-semibold">UpCap-TR Validasyonu devam ediyor:</strong>{' '}
          Psikolojik sermaye ölçeğimizin Türkiye validasyonu için N=1000 hedefiyle saha
          çalışması yürütülüyor. Sonuçlar tamamlandığında peer-reviewed dergi başvurusu
          yapılacak ve bulgular bu sayfada yayımlanacaktır.
        </p>
        <p className="mt-3 text-sm text-ink-60">
          Akademik iş birliği veya veri ortaklığı için:{' '}
          <a href="mailto:arastirma@upcore.app" className="text-accent underline underline-offset-2">
            arastirma@upcore.app
          </a>
        </p>
      </aside>
    </article>
  );
}
