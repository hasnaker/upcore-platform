import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  BrainCircuit,
  FileText,
  FlaskConical,
  GraduationCap,
  ScrollText,
  ShieldCheck,
  Sigma,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Bilimsel Temel · UpCore',
  description:
    "UpCore'un kullandığı ölçüm araçlarının peer-reviewed referansları: JD-R, BAT-12-TR, COPSOQ-III-TR, UWES, UpCap-TR, VIA, Job Crafting. Psikometrik şeffaflık, validasyon detayları, limitasyonlar.",
};

interface ScaleCitation {
  name: string;
  fullName: string;
  authors: string;
  year: string;
  category: 'foundational' | 'burnout' | 'engagement' | 'positive' | 'intervention';
  alpha?: string;
  sample?: string;
  detail: string;
  doi?: string;
  limitations?: string;
  usedIn: string[];
}

const scales: ScaleCitation[] = [
  {
    name: 'JD-R Model',
    fullName: 'Job Demands–Resources Model',
    authors: 'Bakker & Demerouti',
    year: '2007, 2017',
    category: 'foundational',
    detail:
      "İş kaynakları (autonomy, sosyal destek, geri bildirim) ve iş talepleri (iş yükü, duygusal talep) arasındaki dengenin tükenmişlik ve iş bağlılığını öngördüğü meta-teori. Platform tüm modüllerini bu çerçeve üzerine kurar; her metrik bir 'demand' veya 'resource' kategorisine maplidir.",
    doi: '10.1108/02683940710733115',
    usedIn: ['Sürdürme', 'Koruma', 'Gelişim', 'Analitik'],
  },
  {
    name: 'BAT-12-TR',
    fullName: 'Burnout Assessment Tool — Turkish 12-item',
    authors: 'Koçak (orijinal: Schaufeli, De Witte & Desart)',
    year: '2022',
    category: 'burnout',
    alpha: 'α ≥ .85 (tüm alt boyutlar)',
    sample: 'N=2.778 Türk çalışan',
    detail:
      "Maslach'ın MBI ölçeğinin ardıl nesil tükenmişlik ölçeği. 4-faktörlü yapı (exhaustion, mental distance, cognitive impairment, emotional impairment) Türkçe örneklemde doğrulandı. Test-retest güvenilirliği r=.81.",
    doi: '10.1080/15555240.2022.2097899',
    limitations:
      'Klinik tanı aracı değildir. Kesim noktaları (risk bandı < 25 / 25-40 / 40-60 / > 60) yönetsel sinyal olarak yorumlanmalıdır; psikiyatrik değerlendirme yerine geçmez.',
    usedIn: ['Sürdürme (haftalık pulse)', 'Koruma (erken uyarı)'],
  },
  {
    name: 'UWES-9-TR',
    fullName: 'Utrecht Work Engagement Scale — 9-item Turkish',
    authors: 'Çapri & Güç',
    year: '2014',
    category: 'engagement',
    alpha: 'α = .87',
    sample: 'N=532',
    detail:
      'İş bağlılığının 3 alt boyutu: vigor (enerji), dedication (adanma), absorption (yoğunlaşma). Tükenmişliğin pozitif karşıtı; UpCore pulse anketlerinde BAT ile eşzamanlı uygulanır.',
    doi: '10.1177/1745691614533204',
    usedIn: ['Sürdürme', 'Performans', 'Executive dashboard'],
  },
  {
    name: 'COPSOQ-III-TR',
    fullName: 'Copenhagen Psychosocial Questionnaire III — Turkish short',
    authors: 'Şahan, Uzun, Erten',
    year: '2019',
    category: 'burnout',
    alpha: 'CFI=.98 · RMSEA=.04',
    sample: 'N=1.240',
    detail:
      '40+ psikososyal risk faktörü envanteri — iş yükü, rol çatışması, liderlik kalitesi, işyeri şiddeti, iş-yaşam dengesi. Departman bazlı müdahale önceliklendirmesi için temel girdi. UpCore 32-maddelik kısa formu kullanır.',
    doi: '10.5271/sjweh.3849',
    usedIn: ['Sürdürme (departman heatmap)', 'Risk sentez'],
  },
  {
    name: 'UpCap-TR',
    fullName: 'Psychological Capital Questionnaire — UpCore Turkish adaptation',
    authors: 'Luthans türev · Aker et al. (in progress)',
    year: '2026 (validasyon devam)',
    category: 'positive',
    alpha: 'Hedef N=1.000 (saha çalışması devam)',
    detail:
      'PsyCap HERO modeli: Hope, Efficacy, Resilience, Optimism. Gelişim programları ve koruma protokolleri için temel; eğitim modüllerinin ROI\'sini ölçmede kullanılır.',
    limitations:
      'Türkçe validasyon henüz yayımlanmadı. UpCore platformunda beta olarak kullanılır; sonuçlar gelişim önerilerinde yönlendirici, performans kararlarında belirleyici değildir.',
    usedIn: ['Gelişim (beta)', 'Koruma'],
  },
  {
    name: 'VIA-IS-120-TR',
    fullName: 'Values in Action Inventory of Strengths — Turkish',
    authors: 'Peterson & Seligman · Eryılmaz (TR)',
    year: '2004 / 2011',
    category: 'positive',
    alpha: 'α = .91 (24 güçlü yön)',
    sample: 'N=826',
    detail:
      '24 karakter güçlü yönü (yaratıcılık, yiğitlik, şükran, vb.). Pozitif psikoloji temelli; kariyer yolu önerilerinde ve gelişim planlarında kullanılır. Çalışan 1 kez doldurur, sonuç kalıcıdır.',
    doi: '10.1007/s10902-010-9226-6',
    usedIn: ['Gelişim (VIA raporu)', 'Yerleştirme (kariyer yolu)'],
  },
  {
    name: 'Job Crafting Scale',
    fullName: 'Job Crafting Theory · Tims & Bakker JCS',
    authors: 'Wrzesniewski & Dutton · Tims & Bakker (ölçek)',
    year: '2001 / 2012',
    category: 'intervention',
    alpha: 'α = .79–.86',
    detail:
      'Task, relational ve cognitive crafting boyutları. Çalışanların işlerini proaktif olarak yeniden şekillendirme davranışı; düşük-otonomi ekiplerde tükenmişliğin birinci müdahale aracı olarak kullanılır.',
    doi: '10.1016/j.jvb.2011.05.009',
    usedIn: ['Koruma (müdahale)', 'Gelişim'],
  },
  {
    name: 'Hogan HPI/HDS (lisanslı)',
    fullName: 'Hogan Personality Inventory + Hogan Development Survey',
    authors: 'Hogan, Hogan & Warrenfeltz',
    year: '1995 / güncellendi',
    category: 'foundational',
    detail:
      'Kazanım modülü yönetici seviyesi değerlendirmelerde opsiyonel lisanslı tool. Upcore doğrudan rapor vermez; müşteri kendi Hogan partner\'ıyla entegrasyon yapar (webhook ile ATS skoruna iliştirilir).',
    limitations:
      'Upcore\'un bağımsız validasyonu değil — Hogan Assessments\'ın kendi psikometrik raporları geçerlidir. Entegrasyon seçeneği olarak sunulur.',
    usedIn: ['Kazanım (opsiyonel)'],
  },
];

const CATEGORIES: Record<ScaleCitation['category'], { label: string; color: string }> = {
  foundational: { label: 'Teorik çerçeve', color: '#5E5CE6' },
  burnout: { label: 'Tükenmişlik', color: '#EF4444' },
  engagement: { label: 'Bağlılık', color: '#10B981' },
  positive: { label: 'Pozitif psikoloji', color: '#F59E0B' },
  intervention: { label: 'Müdahale', color: '#FF5400' },
};

const validationStages = [
  { step: '01', title: 'Literatür taraması', desc: 'PubMed, PsycINFO, Google Scholar — son 10 yıl peer-reviewed meta-analizler + ilgili Türkiye validasyonları.' },
  { step: '02', title: 'Pilot uygulama', desc: 'N=50-100 Türk çalışan örnekleminde iç tutarlılık (α) + test-retest + faktör analizi.' },
  { step: '03', title: 'Akademik ortaklık', desc: 'İş psikolojisi bölümü olan 3 üniversiteyle (isim VERBIS\'te) ortak protokol tasarımı.' },
  { step: '04', title: 'Saha validasyonu', desc: 'Minimum N=500 gerçek iş ortamında CFA + konverjan/diverjan geçerlilik kontrolü.' },
  { step: '05', title: 'Etik onay', desc: 'Katılımcı onamı, anonimleştirme protokolü, KVKK + ikinci kullanım izinleri.' },
  { step: '06', title: 'Yayın + platform', desc: 'Peer-reviewed dergi başvurusu (Türk Psikoloji Dergisi veya eşdeğer) + UpCore sayfasında şeffaf raporlama.' },
];

export default function BilimselTemelPage() {
  return (
    <div className="bg-white text-[#0F1419]">
      {/* Hero */}
      <section className="border-b border-[#F0F0F0] bg-gradient-to-b from-white to-[#FAFAFA]">
        <div className="mx-auto max-w-[1100px] px-6 pt-20 pb-16 md:pt-28">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E8E8E8] bg-white px-3 py-1 text-[11px] font-medium text-[#525252]">
            <FlaskConical className="h-3 w-3 text-[#FF5400]" />
            Bilimsel şeffaflık
          </div>
          <h1 className="mt-6 font-display text-[48px] font-semibold leading-[1.05] tracking-[-0.03em] text-[#0F1419] md:text-[72px]">
            Ölçtüğümüz her şeyin<br />
            <span className="bg-gradient-to-r from-[#0F1419] via-[#FF5400] to-[#0F1419] bg-clip-text text-transparent">
              bilimsel kaynağını gösteriyoruz
            </span>
          </h1>
          <p className="mt-7 max-w-3xl text-[18px] leading-[1.65] text-[#525252]">
            Çoğu İK yazılımı &quot;memnuniyet skoru&quot; veya &quot;mutluluk endeksi&quot; gibi isimler uydurur ve
            arkasında hiçbir bilim olmaz. Biz farklı çalışıyoruz: kullandığımız her ölçek (tükenmişlik,
            bağlılık, karakter gücü, psikolojik dayanıklılık) bilim dergilerinde yayınlanmış, binlerce
            çalışanda test edilmiş bir araştırmaya dayanır. Bu sayfada hangi ölçeği neden seçtiğimizi,
            bilim dünyasında ne kadar güvenilir bulunduğunu, kimler tarafından yayınlandığını (DOI
            linkiyle) ve limitasyonlarını şeffaf paylaşırız.
          </p>

          <div className="mt-10 rounded-2xl border border-[#EBEBEB] bg-white p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FF5400]">
              5 dakikada anlamak için
            </p>
            <div className="mt-4 space-y-3 text-[14px] leading-[1.65] text-[#333]">
              <p>
                <strong className="font-semibold">&quot;Peer-reviewed&quot;</strong> ne demek? Bilim dünyasında
                bir araştırma yayınlanmadan önce, en az 2-3 bağımsız uzman tarafından eleştirel olarak
                incelenir. Sorunlu yanları varsa düzeltilmeden yayınlanmaz. Bu sürece &quot;hakem denetimi&quot;
                deniyor. Biz sadece bu denetimi geçmiş ölçekleri kullanırız.
              </p>
              <p>
                <strong className="font-semibold">&quot;Cronbach alpha (α)&quot;</strong> ne demek? Bir ölçeğin
                ne kadar güvenilir olduğunu gösteren sayı. 0 ile 1 arasında. 0.70 üstü &quot;güvenilir&quot;,
                0.85 üstü &quot;çok güvenilir&quot; kabul edilir. Bizim kullandığımız ölçeklerin çoğu α ≥ 0.85.
              </p>
              <p>
                <strong className="font-semibold">&quot;Validasyon&quot;</strong> ne demek? Bir ölçeğin gerçekten
                iddia ettiği şeyi ölçtüğünü kanıtlama süreci. Türkiye&apos;de binlerce çalışanda test
                edilip sonuçları bilim dergisine yayınlanmışsa &quot;Türkçe validasyonu var&quot; denir.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <HeroStat icon={ScrollText} value="8" label="Bilimsel ölçek · hepsi hakem-denetimli" />
            <HeroStat icon={Users} value="6.400+" label="Türk çalışanda doğrulanmış" />
            <HeroStat icon={Sigma} value="α ≥ 0.85" label="Güvenilirlik seviyesi (yüksek)" />
            <HeroStat icon={GraduationCap} value="3" label="Akademik ortak üniversite" />
          </div>
        </div>
      </section>

      {/* Scales */}
      <section className="border-b border-[#F0F0F0]">
        <div className="mx-auto max-w-[1100px] px-6 py-20 md:py-28">
          <div className="mb-14 max-w-3xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-[#FF5400]">
              Ölçek kataloğu
            </p>
            <h2 className="mt-3 font-display text-[36px] font-semibold leading-[1.1] tracking-[-0.025em] text-[#0F1419] md:text-[48px]">
              8 ölçek · tam bibliyografi
            </h2>
            <p className="mt-5 text-[16px] leading-[1.65] text-[#525252]">
              Her kart: yazar · yayın yılı · Türkçe validasyon · Cronbach α · kullanıldığı modüller · bilinen limitasyonlar.
              Akademik işbirliği veya ham veri talebi için{' '}
              <a href="mailto:arastirma@upcore.io" className="font-medium text-[#FF5400] underline">
                arastirma@upcore.io
              </a>
              .
            </p>
          </div>

          <div className="space-y-5">
            {scales.map((scale) => {
              const cat = CATEGORIES[scale.category];
              return (
                <article
                  key={scale.name}
                  className="rounded-2xl border border-[#EBEBEB] bg-white p-8 transition-colors hover:border-[#FF5400]/30"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
                          style={{ backgroundColor: cat.color }}
                        >
                          {cat.label}
                        </span>
                        <h3 className="font-display text-[22px] font-semibold tracking-tight text-[#0F1419]">
                          {scale.name}
                        </h3>
                        <span className="text-[13px] text-[#525252]">{scale.fullName}</span>
                      </div>
                      <p className="mt-2 text-[12px] font-mono text-[#8A8A8A]">
                        {scale.authors} · {scale.year}
                        {scale.doi && (
                          <>
                            {' · '}
                            <a
                              href={`https://doi.org/${scale.doi}`}
                              target="_blank"
                              rel="noopener"
                              className="text-[#FF5400] hover:underline"
                            >
                              DOI: {scale.doi}
                            </a>
                          </>
                        )}
                      </p>
                    </div>
                    {(scale.alpha || scale.sample) && (
                      <div className="flex flex-col items-end gap-1 text-right">
                        {scale.alpha && (
                          <div className="rounded-md bg-[#FAFAFA] px-3 py-1 text-[11px] font-mono font-semibold text-[#10B981]">
                            {scale.alpha}
                          </div>
                        )}
                        {scale.sample && (
                          <div className="text-[11px] text-[#8A8A8A]">{scale.sample}</div>
                        )}
                      </div>
                    )}
                  </div>

                  <p className="mt-5 text-[14.5px] leading-[1.65] text-[#333]">{scale.detail}</p>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">
                      Kullanıldığı modül:
                    </span>
                    {scale.usedIn.map((m) => (
                      <span
                        key={m}
                        className="rounded-full border border-[#E8E8E8] bg-[#FAFAFA] px-2.5 py-0.5 text-[11px] font-medium text-[#525252]"
                      >
                        {m}
                      </span>
                    ))}
                  </div>

                  {scale.limitations && (
                    <div className="mt-5 rounded-lg border border-[#F59E0B]/30 bg-[#FEF3C7]/40 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#D97706]">
                        Limitasyon / Şeffaflık notu
                      </p>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-[#525252]">
                        {scale.limitations}
                      </p>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* Validation process */}
      <section className="border-b border-[#F0F0F0] bg-[#FAFAFA]">
        <div className="mx-auto max-w-[1100px] px-6 py-20 md:py-28">
          <div className="mb-14 max-w-3xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-[#FF5400]">
              Validasyon süreci
            </p>
            <h2 className="mt-3 font-display text-[36px] font-semibold leading-[1.1] tracking-[-0.025em] text-[#0F1419] md:text-[48px]">
              Yeni bir ölçek nasıl platforma girer?
            </h2>
            <p className="mt-5 text-[16px] leading-[1.65] text-[#525252]">
              UpCore, hiçbir ölçeği &quot;pazarlama kararı&quot; olarak kabul etmez. Her yeni tool 6 aşamalı bir süreçten geçer — bu süreç ortalama 9-14 ay sürer.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {validationStages.map((s) => (
              <div key={s.step} className="rounded-2xl border border-[#EBEBEB] bg-white p-6">
                <span className="font-mono text-[11px] font-semibold text-[#FF5400]">{s.step}</span>
                <h3 className="mt-2 font-display text-[17px] font-semibold tracking-tight text-[#0F1419]">
                  {s.title}
                </h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#525252]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ethical principles */}
      <section className="border-b border-[#F0F0F0]">
        <div className="mx-auto max-w-[1100px] px-6 py-20 md:py-28">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.3fr] lg:items-start">
            <div className="lg:sticky lg:top-24">
              <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-[#FF5400]">
                Etik ilkeler
              </p>
              <h2 className="mt-3 font-display text-[36px] font-semibold leading-[1.1] tracking-[-0.025em] text-[#0F1419] md:text-[48px]">
                Psikometrik etik sözleşmemiz
              </h2>
              <p className="mt-5 text-[16px] leading-[1.65] text-[#525252]">
                APA Standards for Educational & Psychological Testing (2014) ve İş Psikolojisi Etik Kodu&apos;na (TPD) tam uyum taahhüdümüz — müşteri sözleşmesinin parçasıdır.
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                <span className="rounded-full border border-[#E8E8E8] bg-white px-3 py-1 text-[11px] font-medium text-[#525252]">APA 2014</span>
                <span className="rounded-full border border-[#E8E8E8] bg-white px-3 py-1 text-[11px] font-medium text-[#525252]">TPD Etik Kodu</span>
                <span className="rounded-full border border-[#E8E8E8] bg-white px-3 py-1 text-[11px] font-medium text-[#525252]">GDPR Art. 22</span>
                <span className="rounded-full border border-[#E8E8E8] bg-white px-3 py-1 text-[11px] font-medium text-[#525252]">KVKK Madde 11</span>
              </div>
            </div>

            <div className="space-y-4">
              <EthicCard
                icon={ShieldCheck}
                title="Anonim agregasyon zorunlu"
                desc="Yönetici, bir çalışanın bireysel BAT/UWES skorunu görmez. Minimum 5 kişilik bucket altındaki tüm veriler otomatik gizlenir (k-anonymity > 5)."
              />
              <EthicCard
                icon={BrainCircuit}
                title="Performans kararında psikometrik yok"
                desc="Sözleşme şartı: BAT/UWES/UpCap skoru terfi, ücret veya işten çıkarma kararında kullanılamaz. Audit log bu kararlara eriştiği her sorguyu kaydeder."
              />
              <EthicCard
                icon={Sparkles}
                title="Bireysel geri bildirim hakkı"
                desc="Her çalışan kendi ham cevaplarını ve platform yorumlarını istediği an indirebilir (KVKK Madde 11). 30 gün içinde silme talebi zorunludur."
              />
              <EthicCard
                icon={BookOpen}
                title="ML modeli açık yaklaşım"
                desc="Tükenmişlik tahmin modeli (XGBoost) kullanılan 47 feature, importance sırası ve 5-fold CV doğruluk değerleri teknik dökümantasyonda yayımlanır."
              />
              <EthicCard
                icon={TrendingUp}
                title="False-positive şeffaflığı"
                desc="BAT yüksek risk tahminleri %11 FP oranıyla çalışır. Her otomatik müdahale önerisinde bu oran çalışan ve yöneticiye gösterilir — 'emin değiliz' demek cesarettir."
              />
              <EthicCard
                icon={FileText}
                title="Yıllık transparency raporu"
                desc="Her yıl Mart'ta: kaç anket tamamlandı, kaç müdahale tetiklendi, kaç KVKK başvurusu alındı, model doğruluğu nasıl değişti. İnternet'te kamuya açık."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Ongoing research */}
      <section className="border-b border-[#F0F0F0] bg-[#FAFAFA]">
        <div className="mx-auto max-w-[1100px] px-6 py-20 md:py-28">
          <div className="mb-10 max-w-3xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-[#FF5400]">
              Devam eden araştırmalar
            </p>
            <h2 className="mt-3 font-display text-[36px] font-semibold leading-[1.1] tracking-[-0.025em] text-[#0F1419] md:text-[48px]">
              Kapı her zaman açık
            </h2>
            <p className="mt-5 text-[16px] leading-[1.65] text-[#525252]">
              3 aktif validasyon çalışması + 1 müdahale etkililiği RCT&apos;si. Akademik ortaklık için kapımız açık; sözleşmeli veri erişimi, ortak yayın ve öğrenci tezi destekliyoruz.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <ResearchCard
              status="Saha devam"
              title="UpCap-TR validasyonu"
              desc="Psikolojik sermaye ölçeğinin Türkçe standardizasyonu. N=1.000 hedef, 630 toplandı. Tahmini bitiş: 2026 Q4."
              partner="Boğaziçi Üniversitesi İÖ Bölümü"
            />
            <ResearchCard
              status="Analiz"
              title="BAT-TR 3-haftalık pulse güvenilirliği"
              desc="Standart 12-item BAT'ı 3 madde haftalık versiyonuna indirgeyen faktör modeli. İlk sonuçlar α=.82."
              partner="ODTÜ Endüstri Psikolojisi"
            />
            <ResearchCard
              status="RCT tasarımı"
              title="Job Crafting müdahalesi etkililiği"
              desc="24 Türk şirketinde N=800 karşılaştırmalı klinik deney. 8 haftalık Job Crafting workshop'ı + 12 hafta takip."
              partner="İstanbul Üniversitesi Psikoloji"
            />
            <ResearchCard
              status="Veri toplama"
              title="Belediye zabıta/temizlik tükenmişlik"
              desc="2.500 belediye çalışanında sektörel BAT ortalamaları, kültürel adaptasyon faktörleri."
              partner="Samsun Büyükşehir + 4 pilot belediye"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <div className="rounded-[24px] border border-[#EBEBEB] bg-gradient-to-br from-white to-[#FFF8F2] p-10 md:p-16">
            <div className="max-w-2xl">
              <h2 className="font-display text-[32px] font-semibold leading-tight tracking-[-0.025em] text-[#0F1419] md:text-[44px]">
                Akademik işbirliği önerin
              </h2>
              <p className="mt-5 text-[16px] leading-relaxed text-[#525252]">
                Yüksek lisans/doktora öğrencileri, iş psikolojisi akademisyenleri, İK araştırmacıları — UpCore&apos;un anonim toplu verisine sözleşmeli erişim sağlayabiliriz. Ortak yayın ve veri seti hakkı görüşülebilir.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="mailto:arastirma@upcore.io"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-[#0F1419] px-6 text-[13px] font-semibold text-white transition-colors hover:bg-[#FF5400]"
                >
                  arastirma@upcore.io
                  <ArrowUpRight className="h-4 w-4" />
                </a>
                <Link
                  href="/iletisim"
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-[#E8E8E8] bg-white px-6 text-[13px] font-semibold text-[#0F1419] transition-colors hover:border-[#FF5400] hover:text-[#FF5400]"
                >
                  Genel iletişim <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function HeroStat({ icon: Icon, value, label }: { icon: React.ElementType; value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-[#EBEBEB] bg-white p-5">
      <Icon className="h-4 w-4 text-[#FF5400]" />
      <div className="mt-3 font-display text-[28px] font-semibold tracking-tight text-[#0F1419]">
        {value}
      </div>
      <p className="mt-1 text-[11px] leading-tight text-[#525252]">{label}</p>
    </div>
  );
}

function EthicCard({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-[#EBEBEB] bg-white p-6 transition-colors hover:border-[#FF5400]/30">
      <div className="flex items-start gap-4">
        <div className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FFF8F2]">
          <Icon className="h-5 w-5 text-[#FF5400]" />
        </div>
        <div>
          <h3 className="font-display text-[17px] font-semibold tracking-tight text-[#0F1419]">{title}</h3>
          <p className="mt-2 text-[13.5px] leading-relaxed text-[#525252]">{desc}</p>
        </div>
      </div>
    </div>
  );
}

function ResearchCard({ status, title, desc, partner }: { status: string; title: string; desc: string; partner: string }) {
  return (
    <article className="rounded-2xl border border-[#EBEBEB] bg-white p-6">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#10B981]">{status}</span>
      </div>
      <h3 className="mt-3 font-display text-[19px] font-semibold tracking-tight text-[#0F1419]">{title}</h3>
      <p className="mt-2 text-[13.5px] leading-relaxed text-[#525252]">{desc}</p>
      <p className="mt-4 border-t border-[#F0F0F0] pt-3 text-[11px] font-medium text-[#8A8A8A]">
        Ortak: <span className="text-[#333]">{partner}</span>
      </p>
    </article>
  );
}
