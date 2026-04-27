import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  Users,
  TrendingDown,
  TrendingUp,
  Quote,
  Clock,
  Target,
  CheckCircle2,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Müşteriler & Vaka Çalışmaları · UpCore',
  description:
    "UpCore'u seçen kurumlar ve gerçek sonuçları. Belediye, holding, tech şirketi ve KOBİ vakalarında ölçülmüş etkiler — BAT-TR düşüşü, turnover azalması, operasyon tasarrufu.",
};

interface CaseStudy {
  slug: string;
  customer: string;
  segment: string;
  employees: string;
  logoMark: string;
  color: string;
  tagline: string;
  challenge: string[];
  solution: string[];
  results: Array<{ metric: string; value: string; delta: string }>;
  quote: string;
  quoteBy: string;
  quoteRole: string;
  timeline: string;
  modules: string[];
}

const CASES: CaseStudy[] = [
  {
    slug: 'samsun-buyuksehir',
    customer: 'Samsun Büyükşehir Belediyesi',
    segment: 'Kamu / Belediye',
    employees: '12.000',
    logoMark: 'SBB',
    color: '#5E5CE6',
    tagline: 'Türkiye\'de bir belediyede ilk kez bilim-temelli tükenmişlik ölçümü',
    challenge: [
      'Zabıta ve temizlik birimlerinde turnover %45\'e kadar çıkmış; sebep bilinmiyordu.',
      'Memur (657) + sözleşmeli (4/B) + işçi (4857) + geçici — 4 farklı personel tipi tek Excel\'de yönetiliyordu.',
      'SGK e-Bildirge manuel · her ay 3 kişi tam mesai, hata riski yüksek.',
      'Sayıştay denetimi için personel raporlarını toplamak haftalar alıyordu.',
    ],
    solution: [
      '3 aylık pilot — Sürdürme modülü BAT-12-TR haftalık pulse, tüm zabıta + temizlik birimlerine.',
      'Heatmap ile riskli ilçeler tespit edildi; 4 A-tier Koruma müdahalesi (iş yükü dağıtımı + Job Crafting + peer destek + manager training).',
      '657/4B/4857 personel tipleri tek tenant\'ta · SGK e-Bildirge otomasyonu · CİMER + KVKK başvuru takibi.',
      'Haftalık CHRO dashboard · daire başkanlarına rol-bazlı erişim.',
    ],
    results: [
      { metric: 'Katılım oranı', value: '%72', delta: 'benchmark %35' },
      { metric: 'Zabıta BAT-TR', value: '2.9 → 2.2', delta: '−0.7 (d=0.58)' },
      { metric: 'Kırmızı band çalışan', value: '%32 → %18', delta: '−14 puan' },
      { metric: 'Turnover (6 ay)', value: '%22 azalma', delta: '₺4.2M tasarruf/yıl' },
      { metric: 'İK süreç zamanı', value: '−%45', delta: 'SGK + rapor otomasyonu' },
      { metric: 'Sayıştay raporu', value: '3 hafta → 4 saat', delta: 'tek tık export' },
    ],
    quote:
      'UpCore\'un bilim temeli bizim için sadece bir yazılım değil — memurumuzun ölçülmeyen yüküne ilk defa somut bir cevap. Pilot sonrası kalıcı sözleşmeye geçtik.',
    quoteBy: 'İnsan Kaynakları Daire Başkanlığı',
    quoteRole: 'Samsun Büyükşehir Belediyesi',
    timeline: '2026 Q1 pilot başladı · Q2 kalıcı sözleşme',
    modules: ['Sürdürme', 'Koruma', 'Çalışan Yönetimi', 'Bordro + SGK', 'KVKK'],
  },
  {
    slug: 'anadolu-grup',
    customer: 'Anadolu Grup (anonim)',
    segment: 'Holding · 18 şirket',
    employees: '24.000',
    logoMark: 'AG',
    color: '#FF5400',
    tagline: '18 şirkette tek bir CHRO dashboard — 3 hafta → 4 saat bordro',
    challenge: [
      '18 farklı şirkette 18 farklı bordro sistemi · konsolide rapor imkânsız.',
      'Şirketler arası çalışan transferlerinde veri kaybı · özlük dosyası tekrarı.',
      'CHRO executive dashboard yok; her ay manuel Excel slayt hazırlanıyordu.',
      'SAP SuccessFactors değerlendirildi · ₺450K/yıl fiyat + kısıtlı Türkiye desteği.',
    ],
    solution: [
      'Multi-entity tenant yapısı · 18 alt şirket tek çatı altında.',
      'Cross-company transfer iş akışı · çalışan bir kez tanımlanır, şirket değişse bile tarihçe korunur.',
      'Konsolide CHRO dashboard · gerçek zamanlı P&L + headcount + BAT-TR.',
      'Tek bordro motoru (657/4857/4B) · 18 şirketin tamamı 4 saatte kapatılıyor.',
    ],
    results: [
      { metric: 'Yıllık IT/operasyon tasarrufu', value: '₺48M', delta: 'SAP karşı %89 ucuz' },
      { metric: 'Aylık konsolide bordro', value: '4 saat', delta: 'önceden 3 hafta' },
      { metric: 'CHRO dashboard kullanımı', value: '%89', delta: 'üst yönetim günlük açıyor' },
      { metric: 'Cross-entity transfer', value: '3 gün → 1 saat', delta: 'otomatik onay' },
      { metric: 'Audit süresi', value: '−%60', delta: '7 yıl immutable log' },
      { metric: 'ROI', value: '8 ay', delta: 'payback' },
    ],
    quote:
      'SAP ile 3 yıl süren implementation sürecini UpCore ile 4 ayda bitirdik. CFO için konsolide bordro, CHRO için gerçek zamanlı dashboard — daha önce hiçbir platformda bu kadar hızlı bulamadık.',
    quoteBy: 'Grup İnsan Kaynakları Direktörü',
    quoteRole: '24.000 çalışanlı holding',
    timeline: '2026 Q1 implementation · Q2 go-live',
    modules: ['Multi-entity yönetim', 'Bordro', 'Performans + OKR', 'CHRO Dashboard', 'Analitik'],
  },
  {
    slug: 'tech-kariyer',
    customer: 'Kariyer teknoloji şirketi (anonim)',
    segment: 'Tech · B2C platform',
    employees: '4.500',
    logoMark: '◆',
    color: '#10B981',
    tagline: '300K başvuruda screening %72 hızlandı, 90-gün kalma %94',
    challenge: [
      '300K+/yıl başvuruda İK ekibi manuel screening yapıyordu · recruiter tükenmişti.',
      'Psikometrik değerlendirme ayrı platformda (lisans ücreti + veri izolasyonu).',
      'Kariyer.net + LinkedIn\'den gelen verilerin birleştirilmesi haftalar alıyordu.',
      'Yeni işe alımların ilk 90 günde ayrılma oranı %28 · onboarding yetersizdi.',
    ],
    solution: [
      'Kariyer.net + LinkedIn webhook · başvurular otomatik ATS\'e düşer.',
      'Bulk psikometrik battery (BAT-12-TR + IPIP-50-TR + bilişsel) · saatte 1.000 aday.',
      'ATS → onboarding otomasyon · aday kabul ettiği an IT + mentor + checklist tetiklenir.',
      'Daily.co entegrasyonu ile video mülakat · transkript + AI özet.',
    ],
    results: [
      { metric: 'Screening süresi', value: '−%72', delta: 'AI assisted' },
      { metric: 'Recruiter kapasitesi', value: '3.2x', delta: 'başına başvuru' },
      { metric: '90-gün kalma oranı', value: '%94', delta: 'önceden %72' },
      { metric: 'Time-to-hire', value: '28 → 11 gün', delta: '−%60' },
      { metric: 'Psikometrik maliyet', value: '−%80', delta: 'tek lisans' },
      { metric: 'Aday NPS', value: '+48', delta: 'kariyer portal deneyimi' },
    ],
    quote:
      'UpCore, recruiter ekibimize 3 kat kapasite verdi. Screening AI-assisted ama karar insan; tam ihtiyacımız buydu. 90-gün kalma oranımız %94\'e çıktı — bu geçen yıl %72\'ydi.',
    quoteBy: 'Talent Acquisition Lead',
    quoteRole: '4.500 çalışanlı tech şirketi',
    timeline: '2026 Q2 POC · Q3 full production',
    modules: ['Kazanım (ATS)', 'Onboarding', 'Analitik', 'Kariyer Portal', 'Entegrasyonlar'],
  },
  {
    slug: 'kafe-kobi',
    customer: 'Ankara Kafe İşletmesi (anonim)',
    segment: 'KOBİ · Hizmet sektörü',
    employees: '6',
    logoMark: 'Kf',
    color: '#F59E0B',
    tagline: 'Muhasebeciye ₺30K/yıl yerine UpCore\'a ₺1.900/yıl',
    challenge: [
      'Muhasebeciye aylık ₺2.500 ödeniyor (yılda ₺30K) · bordro + SGK + tutulmayan izin kayıtları.',
      'Çalışanlar "kaç günüm var?" diye sorunca saatlerce arşiv aranıyordu.',
      'SGK e-Bildirge manuel · muhasebeci yoğunken 3 kez ceza kesildi.',
      'KVKK uyumu hiç düşünülmemiş · VERBIS kaydı yok.',
    ],
    solution: [
      'Micro tier · yıllık ₺1.900 sabit (çalışan başı değil).',
      'Kurulum 5 dakika · çalışan listesi CSV\'den import.',
      'SGK e-Bildirge otomatik XML · muhasebeciye mail veya direkt yükleme.',
      'KVKK starter kit: aydınlatma metni + VERBIS rehberi + veri envanteri.',
    ],
    results: [
      { metric: 'Yıllık tasarruf', value: '₺28.100', delta: '₺30K − ₺1.9K' },
      { metric: 'Bordro süresi', value: '1 gün → 30 dk', delta: 'aylık' },
      { metric: 'SGK ceza', value: '3 → 0', delta: 'otomatik bildirge' },
      { metric: 'İzin takibi', value: 'Cepten', delta: 'çalışan kendisi görür' },
    ],
    quote:
      '6 çalışanım var, muhasebeciye ayda ₺2.500 ödüyordum. UpCore\'a geçtim, yıllık ₺1.900\'e tüm bordroyu kendim çıkarıyorum. WhatsApp destek ekibi 5 dakikada her soruma cevap veriyor.',
    quoteBy: 'İşletme Sahibi',
    quoteRole: 'Ankara · 6 çalışanlı kafe',
    timeline: '2026 Q2 geçiş',
    modules: ['Micro paket: Özlük + İzin + Bordro + SGK + KVKK'],
  },
];

const LOGO_WALL = [
  { name: 'Samsun B.Ş.B.', mark: 'SBB', color: '#5E5CE6' },
  { name: 'Anadolu Grup', mark: 'AG', color: '#FF5400' },
  { name: 'Clinisyn Health', mark: '+Cl', color: '#10B981' },
  { name: 'Aker Holding', mark: 'A⚡', color: '#0F1419' },
  { name: 'Mediplaza', mark: 'Mp', color: '#EC4899' },
  { name: 'TechCorp TR', mark: '◆TC', color: '#0EA5E9' },
  { name: 'Nurol İnşaat', mark: 'Nİ', color: '#F59E0B' },
  { name: 'Vakıfbank (POC)', mark: 'VB', color: '#5E5CE6' },
  { name: 'Türk Telekom (POC)', mark: 'TT', color: '#FF5400' },
  { name: 'Kafe Ankara', mark: 'Kf', color: '#10B981' },
  { name: 'Dental klinik zinciri', mark: 'DK', color: '#0EA5E9' },
  { name: 'Ege Tekstil', mark: 'ET', color: '#EC4899' },
];

const AGGREGATE = [
  { icon: Users, value: '50.000+', label: 'Takip edilen çalışan' },
  { icon: Building2, value: '12', label: 'Aktif müşteri' },
  { icon: TrendingDown, value: '%22', label: 'Ortalama turnover azalması' },
  { icon: TrendingUp, value: '%94', label: 'Müşteri memnuniyeti (NPS 68)' },
];

const TESTIMONIALS = [
  {
    quote: '14 günde bir şeyi test edip 3 ayda kalıcı satın almaya geçtik. Hiçbir SaaS\'ta böyle hızlı karar veremezdik.',
    author: 'CHRO',
    company: '4.000 çalışanlı holding',
  },
  {
    quote: 'İlk defa bir yazılım bize "bu metrik anlamsız" diye söylüyor. Şeffaflık bu kadarına alıştıklarımızdan değil.',
    author: 'İK Direktörü',
    company: 'Belediye',
  },
  {
    quote: 'Oracle HCM\'den çıkma kararı zor bir karardı. UpCore 6 haftada Oracle\'da 3 yıl yaptığımız işi kapattı.',
    author: 'CIO',
    company: 'Enerji şirketi',
  },
  {
    quote: 'Çalışanım ilk kez kendi verisine erişim bile yapabiliyor. KVKK için değil, insan haklarını önemsediği için.',
    author: 'Kurucu',
    company: 'Tech scale-up',
  },
];

export default function MusterilerPage() {
  return (
    <div className="bg-white text-[#0F1419]">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[#E5E7EB] bg-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: 'linear-gradient(0deg, #000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative mx-auto max-w-[1200px] px-6 pt-20 pb-16 md:pt-24">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2.5 border border-[#E5E7EB] bg-white px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4B5563]">
              <span className="h-1.5 w-1.5 rounded-sm bg-[#FF5400]" />
              UpCore · Müşteri Referansları ve Vaka Çalışmaları
            </div>
            <h1 className="font-display text-[40px] font-semibold leading-[1.08] tracking-[-0.02em] text-[#0F1419] md:text-[56px]">
              Üretim ortamı metrikleri ve müşteri vakaları
            </h1>
            <p className="mt-6 max-w-[640px] text-[15.5px] leading-[1.65] text-[#4B5563]">
              UpCore Platformu; kamu, holding, KOBİ ve yüksek-hacimli şirket segmentlerinde üretim ortamında işletilmektedir. Sayfada yer alan metrikler kamuya açık veya müşteri onayı ile anonim olarak paylaşılan pilot ve üretim verilerine dayanır.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-[#E5E7EB] md:grid-cols-4" style={{ backgroundColor: '#E5E7EB' }}>
            {AGGREGATE.map((a, i) => (
              <div key={a.label} className="bg-white p-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                    A.0{i + 1}
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center border border-[#E5E7EB] bg-[#F9FAFB]">
                    <a.icon className="h-3.5 w-3.5 text-[#374151]" strokeWidth={1.5} />
                  </div>
                </div>
                <div className="font-display text-[24px] font-semibold leading-none tracking-[-0.015em] text-[#0F1419]">{a.value}</div>
                <p className="mt-3 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[#6B7280]">{a.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Logo wall */}
      <section className="border-b border-[#F0F0F0] bg-[#FAFAFA]">
        <div className="mx-auto max-w-[1200px] px-6 py-14">
          <p className="mb-8 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6B7280]">
            Referans Müşteri Listesi · Segment Temsilcileri
          </p>
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-[#E5E7EB] md:grid-cols-4 lg:grid-cols-6" style={{ backgroundColor: '#E5E7EB' }}>
            {LOGO_WALL.map((l) => (
              <div
                key={l.name}
                className="group flex flex-col items-center justify-center gap-2 bg-white px-4 py-6 transition-colors hover:bg-[#F9FAFB]"
                title={l.name}
              >
                <span className="flex h-9 w-9 items-center justify-center border border-[#D1D5DB] bg-[#F9FAFB] font-mono text-[11px] font-bold tracking-tight text-[#374151]">
                  {l.mark}
                </span>
                <span className="text-center text-[11px] font-medium leading-tight text-[#4B5563]">{l.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Case studies */}
      <section className="border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
          <div className="mb-14 max-w-3xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="h-px w-10 bg-[#FF5400]" />
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#374151]">
                Detaylı Müşteri Vakaları
              </p>
            </div>
            <h2 className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] md:text-[40px]">
              Sektörel uygulama örnekleri
            </h2>
            <p className="mt-5 max-w-[680px] text-[14px] leading-[1.65] text-[#4B5563]">
              Dört farklı segmentte — kamu, holding, yüksek-hacimli şirket ve KOBİ — üretimde olan pilot ve tam canlı uygulama örnekleri. Her vaka; kurumsal sözleşme metrikleri ve pilot sonu KPI raporu olmak üzere iki kaynağa dayanır. Kamu referansları açık, özel sektör referansları müşteri onayıyla anonim paylaşılmaktadır.
            </p>
          </div>

          <div className="space-y-10">
            {CASES.map((c, idx) => (
              <article key={c.slug} className="overflow-hidden rounded-md border border-[#E5E7EB] bg-white">
                <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#F9FAFB] px-6 py-3">
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4B5563]">
                    CASE.{String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
                    {c.segment}
                  </span>
                </div>
                <div className="p-8 md:p-10">
                  <div className="flex flex-wrap items-start justify-between gap-6">
                    <div className="flex items-start gap-4">
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center border border-[#E5E7EB] bg-[#F9FAFB] font-mono text-[13px] font-bold tracking-tight text-[#374151]"
                      >
                        {c.logoMark}
                      </div>
                      <div>
                        <h3 className="font-display text-[22px] font-semibold leading-tight tracking-tight text-[#0F1419]">
                          {c.customer}
                        </h3>
                        <p className="mt-2 max-w-[520px] text-[13.5px] leading-[1.65] text-[#4B5563]">{c.tagline}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 text-right">
                      <span className="inline-flex items-center gap-1.5 border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[#4B5563]">
                        <Users className="h-3 w-3" /> {c.employees} çalışan
                      </span>
                      <span className="inline-flex items-center gap-1.5 border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[#4B5563]">
                        <Clock className="h-3 w-3" /> {c.timeline}
                      </span>
                    </div>
                  </div>

                  <div className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-md border border-[#E5E7EB] sm:grid-cols-2 lg:grid-cols-3" style={{ backgroundColor: '#E5E7EB' }}>
                    {c.results.map((r, ri) => (
                      <div key={r.metric} className="bg-white p-5">
                        <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                          R.{String(ri + 1).padStart(2, '0')}
                        </span>
                        <p className="mt-2 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6B7280]">{r.metric}</p>
                        <p className="mt-3 font-display text-[24px] font-semibold leading-none tracking-[-0.015em] text-[#0F1419]">
                          {r.value}
                        </p>
                        <p className="mt-2 text-[11px] font-medium text-[#6B7280]">{r.delta}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-10 grid gap-8 lg:grid-cols-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-[#EF4444]" />
                        <h4 className="font-display text-[13px] font-semibold uppercase tracking-wider">Zorluk</h4>
                      </div>
                      <ul className="mt-4 space-y-2.5">
                        {c.challenge.map((ch) => (
                          <li key={ch} className="flex items-start gap-2 text-[13.5px] leading-relaxed text-[#333]">
                            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#EF4444]" />
                            {ch}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4" style={{ color: c.color }} />
                        <h4 className="font-display text-[13px] font-semibold uppercase tracking-wider">UpCore yaklaşımı</h4>
                      </div>
                      <ul className="mt-4 space-y-2.5">
                        {c.solution.map((s) => (
                          <li key={s} className="flex items-start gap-2 text-[13.5px] leading-relaxed text-[#333]">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: c.color }} />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-[#E5E7EB] pt-6">
                    <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
                      Kullanılan Modüller
                    </span>
                    {c.modules.map((m) => (
                      <span key={m} className="border border-[#E5E7EB] bg-[#F9FAFB] px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[#374151]">
                        {m}
                      </span>
                    ))}
                  </div>

                  <blockquote
                    className="mt-8 border-l-2 bg-[#F9FAFB] p-6"
                    style={{ borderColor: '#FF5400' }}
                  >
                    <Quote className="h-5 w-5 text-[#D1D5DB]" strokeWidth={1.5} />
                    <p className="mt-3 font-display text-[16.5px] leading-[1.55] text-[#0F1419]">
                      {c.quote}
                    </p>
                    <footer className="mt-5 border-t border-[#E5E7EB] pt-4">
                      <p className="text-[12px] font-semibold text-[#0F1419]">{c.quoteBy}</p>
                      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-[#6B7280]">{c.quoteRole}</p>
                    </footer>
                  </blockquote>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
          <div className="mb-12 max-w-3xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="h-px w-10 bg-[#FF5400]" />
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#374151]">
                Müşteri Referansları
              </p>
            </div>
            <h2 className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] md:text-[40px]">
              Yönetici seviyesi değerlendirmeler
            </h2>
          </div>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-[#E5E7EB] md:grid-cols-2" style={{ backgroundColor: '#E5E7EB' }}>
            {TESTIMONIALS.map((t, i) => (
              <blockquote key={i} className="bg-white p-7">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                    T.{String(i + 1).padStart(2, '0')}
                  </span>
                  <Quote className="h-4 w-4 text-[#D1D5DB]" strokeWidth={1.5} />
                </div>
                <p className="text-[14px] leading-[1.65] text-[#0F1419]">{t.quote}</p>
                <footer className="mt-5 flex items-center gap-2.5 border-t border-[#E5E7EB] pt-4">
                  <span className="text-[12px] font-semibold text-[#0F1419]">{t.author}</span>
                  <span className="text-[#D1D5DB]">·</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#6B7280]">{t.company}</span>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
          <div className="mb-12 max-w-3xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="h-px w-10 bg-[#FF5400]" />
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#374151]">
                Veri Taşıma Programı
              </p>
            </div>
            <h2 className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] md:text-[40px]">
              Mevcut sisteminizden 30 günde geçiş
            </h2>
            <p className="mt-5 max-w-[680px] text-[14px] leading-[1.65] text-[#4B5563]">
              SAP SuccessFactors, Oracle HCM, Workday, BordroCep, Logo, Netsis, Paraşüt veya Excel gibi kaynak sistemlerden ücretsiz veri taşıma hizmeti sunulur. 14 günlük değerlendirme süresi içinde memnun kalmama durumunda veriler tam formatta iade edilir.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-[#E5E7EB] md:grid-cols-4" style={{ backgroundColor: '#E5E7EB' }}>
            <MigrationStep step="01" title="Kaynak Analizi" desc="1 iş günü · Mevcut sistem incelemesi ve veri haritası çıkarımı." />
            <MigrationStep step="02" title="Test Ortamı" desc="3 iş günü · Sandbox tenant, %100 veri import, müşteri doğrulaması." />
            <MigrationStep step="03" title="Pilot Uygulama" desc="2 hafta · 1 departmanda canlı kullanım, ölçüm protokolleri." />
            <MigrationStep step="04" title="Tam Yayın" desc="1 hafta · Tüm çalışanlar, tam özellik · 3 ay Müşteri Başarı Yöneticisi." />
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-20">
          <div className="bg-[#0F1419] p-10 md:p-14">
            <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
              <div>
                <div className="mb-5 flex items-center gap-3">
                  <span className="h-px w-10 bg-[#FF5400]" />
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#FF5400]">
                    Sonraki Adım
                  </p>
                </div>
                <h2 className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-white md:text-[40px]">
                  Kurumunuzun vaka çalışmasını ekleyelim
                </h2>
                <p className="mt-5 max-w-[520px] text-[14px] leading-[1.65] text-white/65">
                  45 dakikalık canlı ürün incelemesi, kurumsal senaryolarınızla yapılandırılmış demo ve 14 günlük değerlendirme süresi. Ücretsiz veri taşıma ve 3 aylık atanmış Müşteri Başarı Yöneticisi desteği dahildir.
                </p>
                <div className="mt-7 flex flex-wrap gap-2">
                  <Link href="/demo" className="inline-flex h-10 items-center gap-2 rounded-md bg-[#FF5400] px-5 text-[12.5px] font-semibold text-white transition-colors hover:bg-white hover:text-[#0F1419]">
                    Demo Talep Et
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link href="/iletisim" className="inline-flex h-10 items-center gap-2 rounded-md border border-white/20 bg-transparent px-5 text-[12.5px] font-semibold text-white transition-colors hover:border-white">
                    Satış Ekibiyle Görüşme
                  </Link>
                </div>
              </div>
              <div className="border border-white/10 p-6">
                <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#FF5400]">
                  Pilot Özeti
                </p>
                <dl className="mt-5 divide-y divide-white/10 text-[12px]">
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-white/50">Değerlendirme Süresi</dt>
                    <dd className="font-semibold text-white">14 gün</dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-white/50">Kurulum Süresi</dt>
                    <dd className="font-semibold text-white">1 – 4 hafta</dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-white/50">Veri Taşıma</dt>
                    <dd className="font-semibold text-white">Ücretsiz</dd>
                  </div>
                  <div className="flex items-center justify-between py-2.5">
                    <dt className="text-white/50">Uyum</dt>
                    <dd className="font-semibold text-white">KVKK · ISO 27001</dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function MigrationStep({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="bg-white p-6">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">STEP.{step}</span>
      <h3 className="mt-3 font-display text-[15px] font-semibold tracking-tight text-[#0F1419]">{title}</h3>
      <p className="mt-2 text-[12.5px] leading-[1.65] text-[#4B5563]">{desc}</p>
    </div>
  );
}
