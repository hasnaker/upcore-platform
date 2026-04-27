import type { Metadata } from 'next';
import React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, X, Sparkles, Shield, Users, Building2, Zap } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Fiyatlandırma · UpCore',
  description: 'UpCore fiyatlandırma: Micro ₺1.900/yıl (1–10 çalışan) · Starter ₺29/çalışan · Professional ₺49/çalışan · Enterprise özel. 14 gün ücretsiz deneme.',
};

const TIERS = [
  {
    name: 'Micro',
    price: '₺1.900',
    unit: '/yıl sabit',
    range: '1 – 10 çalışan',
    desc: 'Kafe, butik ajans, aile işletmesi, startup için. Çalışan başı ödemez sabit yıllık ücret. 5 dakikada kurar, WhatsApp destek hattımız yanınızda.',
    forYou: 'Muhasebeciye ayda ₺2.500 ödüyorsanız bu yıl ₺28.100 kazanç (fark: ₺30K vs ₺1.9K).',
    cta: 'Hemen başla',
    href: '/demo',
    highlight: false,
    icon: Zap,
    color: '#F59E0B',
  },
  {
    name: 'Starter',
    price: '₺29',
    unit: '/çalışan/ay',
    range: '11 – 250 çalışan',
    desc: 'Büyüyen şirket için İK + bordro temeli. Aylık ödeme, istediğiniz an iptal. Çalışan başı çok düşük ücret.',
    forYou: '50 kişilik şirket için: aylık ₺1.450 · yıllık ₺17.400. Bir muhasebeciye ödediğinizin 1/3\'ü.',
    cta: '14 gün ücretsiz dene',
    href: '/demo',
    highlight: false,
    icon: Users,
    color: '#10B981',
  },
  {
    name: 'Professional',
    price: '₺49',
    unit: '/çalışan/ay',
    range: '250 – 2.500 çalışan',
    desc: 'Bilim-temelli tam platform. Tükenmişlik ölçümü, performans, kariyer, ATS — hepsi dahil. Yıllık ödemede %15 indirim.',
    forYou: '500 kişilik şirket için: aylık ₺24.500 · yıllık ₺294.000. SAP SuccessFactors\'in yaklaşık %10\'u.',
    cta: 'Demo talep et',
    href: '/demo',
    highlight: true,
    icon: Sparkles,
    color: '#FF5400',
  },
  {
    name: 'Enterprise',
    price: 'Özel',
    unit: 'yıllık sözleşme',
    range: '2.500+ çalışan',
    desc: 'Holding ve çoklu şirket yapıları için. Size özel entegrasyonlar, dedicated Müşteri Başarı Yöneticisi, sözleşmeli SLA, 4 haftalık onboarding, on-site eğitim.',
    forYou: '10.000+ çalışan için sözleşmeli indirim. 657 kadro yapılı belediyeler için özel konfigürasyon.',
    cta: 'Satış ekibiyle konuş',
    href: '/iletisim',
    highlight: false,
    icon: Building2,
    color: '#5E5CE6',
  },
];

const FEATURE_GROUPS = [
  { title: 'Temel Modüller', features: [
    { name: 'Çalışan yönetimi + özlük', m: true, s: true, p: true, e: true },
    { name: 'Organizasyon şeması', m: true, s: true, p: true, e: true },
    { name: 'İzin + mesai yönetimi', m: true, s: true, p: true, e: true },
    { name: 'Vardiya çizelgesi', m: 'Basit', s: true, p: true, e: true },
    { name: 'Bordro (657 + 4857 + 4B)', m: true, s: true, p: true, e: true },
    { name: 'SGK e-Bildirge + muhtasar', m: true, s: true, p: true, e: true },
    { name: 'Belge yönetimi + e-imza', m: '2 GB', s: '10 GB', p: '100 GB', e: 'Limitsiz' },
    { name: 'Aylık aktif kullanıcı tavanı', m: '10', s: '250', p: '2.500', e: 'Limitsiz' },
  ]},
  { title: 'Yaşam Döngüsü + Bilim', features: [
    { name: 'İşe Alım (ATS) — basit', m: '1 aktif ilan', s: false, p: true, e: true },
    { name: 'İşe Alım (ATS) — tam', m: false, s: false, p: true, e: true },
    { name: 'Onboarding rehberli', m: 'Şablon', s: false, p: true, e: true },
    { name: 'Offboarding + exit interview', m: false, s: false, p: true, e: true },
    { name: 'Performans + OKR + 360°', m: false, s: false, p: true, e: true },
    { name: 'BAT-TR Tükenmişlik ölçümü', m: 'Yılda 2x', s: false, p: true, e: true },
    { name: 'UWES Bağlılık anketi', m: false, s: false, p: true, e: true },
    { name: 'COPSOQ Psikososyal', m: false, s: false, p: true, e: true },
    { name: 'Kariyer yolu + succession', m: false, s: false, p: true, e: true },
    { name: 'İç ilan marketplace', m: false, s: false, p: true, e: true },
    { name: 'Eğitim & LMS', m: false, s: false, p: true, e: true },
    { name: 'ML tahmin + anomali tespiti', m: false, s: false, p: false, e: true },
  ]},
  { title: 'Güvenlik & Uyum', features: [
    { name: 'KVKK uyum portalı', m: true, s: true, p: true, e: true },
    { name: 'Audit log', m: '6 ay', s: '1 yıl', p: '7 yıl', e: '7 yıl + export' },
    { name: 'SAML SSO + MFA', m: false, s: false, p: true, e: true },
    { name: 'API key + webhook', m: false, s: false, p: true, e: true },
    { name: 'Özel veri retention policy', m: false, s: false, p: false, e: true },
    { name: 'DPIA + sözleşme desteği', m: false, s: false, p: false, e: true },
    { name: 'On-premise veri yedekleme', m: false, s: false, p: false, e: true },
  ]},
  { title: 'Altyapı & Ölçek', features: [
    { name: 'Tenant sayısı', m: '1', s: '1', p: '3', e: 'Limitsiz' },
    { name: 'Kullanıcı rolleri', m: '3', s: '5', p: '20+', e: 'Özel' },
    { name: 'API rate limit (req/dk)', m: '20', s: '60', p: '600', e: '6000' },
    { name: 'Uptime SLA', m: '99%', s: '99.5%', p: '99.9%', e: '99.95%' },
    { name: 'Yedekleme RPO', m: '24 saat', s: '1 saat', p: '15 dk', e: '5 dk' },
    { name: 'Veri taşıma desteği', m: false, s: false, p: true, e: true },
  ]},
  { title: 'Destek', features: [
    { name: 'Email destek', m: 'İş saatleri', s: 'İş saatleri', p: '7/24', e: '7/24' },
    { name: 'Telefon + Slack destek', m: false, s: false, p: true, e: true },
    { name: 'Dedicated CSM', m: false, s: false, p: false, e: true },
    { name: 'On-site eğitim', m: false, s: false, p: false, e: true },
    { name: 'Response SLA', m: '3 iş günü', s: '2 iş günü', p: '4 saat', e: '1 saat' },
  ]},
];

const FAQ = [
  { q: 'Micro plan kimin için?', a: '1-10 çalışanlı KOBİ, butik ajans, aile şirketi, startup\'lar. Yıllık sabit ₺1.900 (KDV hariç). Bordro, izin, SGK otomasyonu, temel KVKK uyum — hepsi dahil. Eklenen her çalışan üstü Starter\'a geçiş tavsiye edilir.' },
  { q: 'Çalışan sayım ay ortasında değişirse ne olur?', a: 'Micro: Yıllık sabit; 10\'u aştığınızda Starter planına prorata geçiş. Starter+: aylık sonunda aktif çalışan sayısı üzerinden faturalanır. Ay ortasında giren çalışan prorata hesaplanır.' },
  { q: 'Yıllık ödeme nasıl çalışır?', a: 'Micro tier zaten yıllık peşin. Starter+ yıllık peşin ödemede %15 indirim. Yıl içinde artışlar aylık eklenir; azalışlar sonraki yılın ödemesinden düşülür.' },
  { q: 'Kurulum + eğitim ücreti var mı?', a: 'Micro + Starter: self-service, ücretsiz video kütüphanesi. Professional: 2 haftalık remote onboarding (₺15.000). Enterprise: 4 haftalık dedicated + on-site (sözleşmeyle).' },
  { q: 'İptal politikanız nedir?', a: 'İstediğiniz an iptal edebilirsiniz. Aylık ödemelerde kalan ay faturalanır. Yıllık ödemede (Micro dahil) ön ödeme iade edilmez ancak yıl sonuna kadar kullanırsınız.' },
  { q: 'Veri taşıma ne kadar sürer?', a: 'Micro: Kendi self-service import aracı (CSV) ile 1-2 saatte. Starter: CSV + destek 1 gün. SAP/Workday/BordroCep/Logo gibi mevcut sistemlerden Professional/Enterprise\'da 2-4 hafta, fiyata dahil.' },
  { q: 'Döviz / yabancı para desteği var mı?', a: 'Starter+ için multi-currency: TL/USD/EUR bordro, banka transfer dosyaları. Hisse senedi grant\'leri Enterprise\'da desteklenir.' },
  { q: 'Fatura + e-fatura düzeni?', a: 'Aylık e-fatura otomatik gönderim. Yıllık ödemelerde yıl başında tek fatura. Tüm faturalar KDV hariç; Türkiye\'de GİB e-fatura, yurt dışında PDF.' },
];

export default function PricingPage() {
  return (
    <div className="bg-white text-[#0F1419]">
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
              UpCore · Lisanslama ve Fiyatlandırma
            </div>
            <h1 className="font-display text-[40px] font-semibold leading-[1.08] tracking-[-0.02em] text-[#0F1419] md:text-[56px]">
              Ölçek bazlı lisans yapılandırması
            </h1>
            <p className="mt-6 max-w-[620px] text-[15.5px] leading-[1.65] text-[#4B5563]">
              Platform; mikro işletme, KOBİ, kurumsal ve çoklu-şirketli holding yapıları için dört ayrı lisans seviyesinde sunulur. Tüm seviyelerde temel modüller dahil; ileri fonksiyonlar seviyeye göre farklılaşır. Fiyatlar yıllık ödemede %15 indirimle, 2.500+ çalışanda özel sözleşmeyle yapılandırılır.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="mx-auto max-w-[1200px] px-6 py-16">
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-[#E5E7EB] sm:grid-cols-2 lg:grid-cols-4" style={{ backgroundColor: '#E5E7EB' }}>
            {TIERS.map((t, i) => (
              <div key={t.name} className={`flex h-full flex-col p-7 ${
                t.highlight ? 'bg-[#0F1419] text-white' : 'bg-white'
              }`}>
                <div className="mb-4 flex items-center justify-between">
                  <span className={`font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] ${t.highlight ? 'text-white/50' : 'text-[#9CA3AF]'}`}>
                    T.0{i + 1}
                  </span>
                  {t.highlight && (
                    <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[#FF5400]">
                      Önerilen
                    </span>
                  )}
                  {t.name === 'Micro' && !t.highlight && (
                    <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[#D97706]">
                      KOBİ
                    </span>
                  )}
                </div>
                <h3 className={`font-display text-[17px] font-semibold tracking-tight ${t.highlight ? 'text-white' : 'text-[#0F1419]'}`}>{t.name}</h3>
                <p className={`mt-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] ${t.highlight ? 'text-white/50' : 'text-[#9CA3AF]'}`}>{t.range}</p>
                <div className="mt-6 flex items-baseline gap-1.5 border-t border-[#E5E7EB] pt-5" style={t.highlight ? { borderColor: 'rgba(255,255,255,0.1)' } : undefined}>
                  <span className={`font-display text-[30px] font-semibold tracking-[-0.015em] ${t.highlight ? 'text-white' : 'text-[#0F1419]'}`}>{t.price}</span>
                  <span className={`text-[11px] ${t.highlight ? 'text-white/50' : 'text-[#6B7280]'}`}>{t.unit}</span>
                </div>
                <p className={`mt-4 text-[12.5px] leading-[1.6] ${t.highlight ? 'text-white/70' : 'text-[#4B5563]'}`}>{t.desc}</p>
                <div className={`mt-4 border-l-2 pl-3 py-2 text-[11.5px] leading-[1.6] ${t.highlight ? 'border-[#FF5400] text-white/80' : 'border-[#FF5400] text-[#374151]'}`}>
                  <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em]" style={{ color: t.highlight ? '#FF5400' : '#FF5400' }}>
                    Kurumunuza Özel
                  </span>
                  <p className="mt-1">{t.forYou}</p>
                </div>
                <Link href={t.href} className={`mt-auto pt-6 inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-[12px] font-semibold transition-colors ${
                  t.highlight ? 'bg-[#FF5400] text-white hover:bg-white hover:text-[#0F1419]' : 'border border-[#D1D5DB] bg-white text-[#0F1419] hover:border-[#0F1419] hover:bg-[#0F1419] hover:text-white'
                }`} style={t.highlight ? {} : undefined}>
                  {t.cta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ))}
          </div>
          <p className="mt-6 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
            Tüm planlar KDV hariçtir · Yıllık ödemede %15 indirim (Micro zaten yıllık) · 2.500+ çalışan için özel indirim
          </p>
        </div>
      </section>

      {/* Lisans Seçim Rehberi */}
      <section className="border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
          <div className="mb-12 max-w-3xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="h-px w-10 bg-[#FF5400]" />
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#374151]">
                Lisans Seçim Rehberi
              </p>
            </div>
            <h2 className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] md:text-[40px]">
              Kurumunuza uygun lisansı belirleyin
            </h2>
            <p className="mt-5 max-w-[680px] text-[14px] leading-[1.65] text-[#4B5563]">
              Çalışan sayısı, kullanım yoğunluğu ve fonksiyonel gereksinimlerinize göre uygun lisans seviyesinin seçilmesi için aşağıdaki karar matrisi hazırlanmıştır.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-[#E5E7EB] md:grid-cols-3" style={{ backgroundColor: '#E5E7EB' }}>
            <DecisionCard
              code="D.01"
              question="1 – 10 çalışan"
              best="Micro"
              color="#D97706"
              reasons={[
                'Sabit yıllık ₺1.900 · çalışan başı değil',
                'Ortalama 5 dakikada kurulum',
                'Bordro + SGK + izin + KVKK temel paketi',
                'WhatsApp kanalı ile müşteri desteği',
              ]}
              detail="Mikro işletmeler için optimize edilmiş lisans. 11. çalışan eklendiğinde Starter seviyesine otomatik geçiş uygulanır."
            />
            <DecisionCard
              code="D.02"
              question="11 – 250 çalışan, temel İK dijitalleşmesi"
              best="Starter"
              color="#059669"
              reasons={[
                'Çalışan başına aylık ₺29',
                'Tam bordro + SGK + izin + vardiya yönetimi',
                'Mobil uygulama + çalışan self-servis portal',
                '14 günlük ücretsiz değerlendirme süreci',
              ]}
              detail="Küçük ve orta ölçekli işletmeler için temel İK süreçlerini kapsayan operasyonel lisans. Psikometrik ölçüm ve ileri analitik dahil değildir."
            />
            <DecisionCard
              code="D.03"
              question="250+ çalışan, performans ve çalışan deneyimi ölçümü"
              best="Professional"
              color="#FF5400"
              reasons={[
                'Çalışan başına aylık ₺49',
                'BAT-TR tükenmişlik + UWES bağlılık ölçümü',
                'Kariyer.net + LinkedIn ATS entegrasyonu',
                'Performans + OKR + 9-kutu kalibrasyon',
                'SAP/Oracle alternatiflerine göre %90 tasarruf',
              ]}
              detail="Orta-büyük ölçekli şirketler için bilim-temelli ölçüm, performans yönetimi ve gelişmiş analitik fonksiyonlarını kapsayan standart kurumsal lisans."
              highlight
            />
          </div>
          <div className="mt-px border border-[#E5E7EB] bg-[#0F1419] p-6">
            <div className="flex flex-wrap items-start gap-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-white/15 bg-white/5">
                <Building2 className="h-4 w-4 text-[#FF5400]" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#FF5400]">
                  Enterprise · D.04
                </p>
                <h3 className="mt-2 font-display text-[17px] font-semibold tracking-tight text-white">
                  2.500+ çalışan · holding · kamu kuruluşları
                </h3>
                <p className="mt-3 text-[13px] leading-[1.65] text-white/65">
                  Enterprise lisans; özel konfigürasyon, sözleşmeli SLA taahhütleri, atanmış Müşteri Başarı Yöneticisi, 4 haftalık onboarding programı, on-site eğitim ve özel entegrasyonları kapsar. 657 kadro yapısı, çoklu-şirket mimarisi ve 50.000+ çalışan ölçeğinde kanıtlanmış altyapı sağlanır.
                </p>
                <Link href="/iletisim" className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-[#FF5400] px-4 text-[12px] font-semibold text-white transition-colors hover:bg-white hover:text-[#0F1419]">
                  Satış Ekibiyle Görüşme
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-[#F0F0F0] bg-[#FAFAFA]">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
          <div className="mb-12 max-w-3xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="h-px w-10 bg-[#FF5400]" />
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#374151]">
                Fonksiyonel Karşılaştırma
              </p>
            </div>
            <h2 className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] md:text-[40px]">Lisans seviyesine göre modül ve özellikler</h2>
            <p className="mt-5 max-w-[680px] text-[14px] leading-[1.65] text-[#4B5563]">
              Lisans seviyeleri arasındaki fonksiyonel farkların tam listesi. Micro ve Starter seviyeleri temel İK ve bordro süreçlerini kapsar; Professional ileri ölçüm + psikometrik, Enterprise ise özel konfigürasyon ve SLA yapısını içerir.
            </p>
          </div>
          <div className="overflow-x-auto rounded-md border border-[#E5E7EB] bg-white">
            <table className="w-full min-w-[800px]">
              <thead className="sticky top-0 z-10 bg-[#F9FAFB]">
                <tr className="border-b border-[#E5E7EB]">
                  <th className="w-[38%] px-5 py-4 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4B5563]">Özellik</th>
                  <th className="px-3 py-4 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#374151]">Micro</th>
                  <th className="px-3 py-4 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#374151]">Starter</th>
                  <th className="px-3 py-4 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#FF5400]">Professional</th>
                  <th className="px-3 py-4 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#374151]">Enterprise</th>
                </tr>
              </thead>
              <tbody>
                {FEATURE_GROUPS.map((grp) => (
                  <React.Fragment key={grp.title}>
                    <tr className="bg-[#F9FAFB]">
                      <td colSpan={5} className="border-t border-[#E5E7EB] px-5 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4B5563]">
                        {grp.title}
                      </td>
                    </tr>
                    {grp.features.map((f) => (
                      <tr key={f.name} className="border-t border-[#F3F4F6] transition-colors hover:bg-[#F9FAFB]">
                        <td className="px-5 py-3 text-[12.5px] text-[#374151]">{f.name}</td>
                        <td className="px-3 py-3 text-center">{renderCell(f.m)}</td>
                        <td className="px-3 py-3 text-center">{renderCell(f.s)}</td>
                        <td className="px-3 py-3 text-center">{renderCell(f.p)}</td>
                        <td className="px-3 py-3 text-center">{renderCell(f.e)}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
          <div className="mb-12 max-w-3xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="h-px w-10 bg-[#FF5400]" />
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#374151]">
                Sözleşmesel Taahhütler
              </p>
            </div>
            <h2 className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] md:text-[40px]">Hizmet seviyesi ve yasal güvenceler</h2>
          </div>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-[#E5E7EB] md:grid-cols-3" style={{ backgroundColor: '#E5E7EB' }}>
            {[
              { icon: Shield, code: 'G.01', title: 'Uptime SLA', desc: 'Micro %99 · Starter %99.5 · Professional %99.9 · Enterprise %99.95 · İhlal durumunda prorata tazminat uygulanır.' },
              { icon: Sparkles, code: 'G.02', title: '14 Gün İade Garantisi', desc: 'İlk 14 gün içinde platform değerlendirmesi sonrası memnun kalmama durumunda eksiksiz ücret iadesi uygulanır.' },
              { icon: Users, code: 'G.03', title: 'Veri Sahipliği', desc: 'Müşteri verisi %100 müşteriye aittir. Her zaman eksiksiz veri dışa aktarımı sunulur. Ömür boyu iade hakkı saklıdır.' },
            ].map((g) => (
              <div key={g.title} className="bg-white p-7">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center border border-[#E5E7EB] bg-[#F9FAFB]">
                    <g.icon className="h-3.5 w-3.5 text-[#374151]" strokeWidth={1.5} />
                  </div>
                  <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">{g.code}</span>
                </div>
                <h3 className="font-display text-[15.5px] font-semibold tracking-tight text-[#0F1419]">{g.title}</h3>
                <p className="mt-2 text-[12.5px] leading-[1.65] text-[#4B5563]">{g.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="mx-auto max-w-[1000px] px-6 py-20 md:py-24">
          <div className="mb-12 max-w-3xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="h-px w-10 bg-[#FF5400]" />
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#374151]">
                Sık Sorulan Sorular
              </p>
            </div>
            <h2 className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] md:text-[40px]">Lisanslama ve faturalama</h2>
          </div>
          <div className="overflow-hidden rounded-md border border-[#E5E7EB] bg-white">
            {FAQ.map((f, idx) => (
              <details key={f.q} className={`group ${idx > 0 ? 'border-t border-[#E5E7EB]' : ''}`}>
                <summary className="flex cursor-pointer items-start justify-between gap-4 px-6 py-5 text-[14px] font-semibold text-[#0F1419] transition-colors hover:bg-[#F9FAFB] [&::-webkit-details-marker]:hidden">
                  <span>{f.q}</span>
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-[#D1D5DB] font-mono text-[14px] text-[#4B5563] transition-transform group-open:rotate-45">+</span>
                </summary>
                <div className="border-t border-[#F3F4F6] bg-[#F9FAFB] px-6 py-5">
                  <p className="text-[13px] leading-[1.7] text-[#4B5563]">{f.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#0F1419]">
        <div className="mx-auto max-w-[1200px] px-6 py-20">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <span className="h-px w-10 bg-[#FF5400]" />
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#FF5400]">
                  Sonraki Adım
                </p>
              </div>
              <h2 className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-white md:text-[40px]">
                Kurumunuza özel fiyat teklifi alın
              </h2>
              <p className="mt-5 max-w-[520px] text-[14px] leading-[1.65] text-white/65">
                45 dakikalık canlı ürün incelemesi; çalışan sayınız, mevcut sistemleriniz ve öncelikli süreçlerinize göre yapılandırılmış bir demo sunumunu içerir. Teknik ve satış ekibimiz görüşmeye birlikte katılır.
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
                Fiyatlandırma Özeti
              </p>
              <dl className="mt-5 divide-y divide-white/10 text-[12px]">
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-white/50">Micro</dt>
                  <dd className="font-mono font-semibold text-white">₺1.900 / yıl</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-white/50">Starter</dt>
                  <dd className="font-mono font-semibold text-white">₺29 / çalışan / ay</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-white/50">Professional</dt>
                  <dd className="font-mono font-semibold text-white">₺49 / çalışan / ay</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-white/50">Enterprise</dt>
                  <dd className="font-mono font-semibold text-white">Özel sözleşme</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function renderCell(v: boolean | string) {
  if (v === true) return <CheckCircle2 className="mx-auto h-4 w-4 text-[#059669]" strokeWidth={1.8} />;
  if (v === false) return <X className="mx-auto h-4 w-4 text-[#D1D5DB]" strokeWidth={1.8} />;
  return <span className="font-mono text-[11px] font-medium text-[#374151]">{v}</span>;
}

function DecisionCard({
  code,
  question,
  best,
  color,
  reasons,
  detail,
  highlight,
}: {
  code?: string;
  question: string;
  best: string;
  color: string;
  reasons: string[];
  detail: string;
  highlight?: boolean;
}) {
  return (
    <div className={`flex flex-col p-7 ${highlight ? 'bg-[#0F1419] text-white' : 'bg-white'}`}>
      <div className="mb-4 flex items-center justify-between">
        <span className={`font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] ${highlight ? 'text-white/50' : 'text-[#9CA3AF]'}`}>
          {code ?? 'D.01'}
        </span>
        <span className="h-1 w-6" style={{ backgroundColor: color }} />
      </div>
      <p className={`font-mono text-[10px] font-semibold uppercase tracking-[0.12em] ${highlight ? 'text-white/50' : 'text-[#6B7280]'}`}>
        Senaryo
      </p>
      <h3 className={`mt-2 font-display text-[15.5px] font-semibold leading-tight tracking-tight ${highlight ? 'text-white' : 'text-[#0F1419]'}`}>
        {question}
      </h3>
      <div className={`mt-5 flex items-baseline gap-2 border-t pt-4 ${highlight ? 'border-white/10' : 'border-[#E5E7EB]'}`}>
        <span className={`font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] ${highlight ? 'text-white/50' : 'text-[#9CA3AF]'}`}>
          Önerilen Lisans
        </span>
      </div>
      <p className={`mt-1 font-display text-[22px] font-semibold tracking-[-0.015em]`} style={{ color: highlight ? '#FF5400' : color }}>
        {best}
      </p>
      <ul className="mt-5 flex-1 space-y-2">
        {reasons.map((r) => (
          <li key={r} className={`flex items-start gap-2.5 text-[12px] leading-[1.5] ${highlight ? 'text-white/80' : 'text-[#374151]'}`}>
            <span className="mt-[7px] h-[3px] w-[3px] shrink-0" style={{ backgroundColor: color }} />
            {r}
          </li>
        ))}
      </ul>
      <div className={`mt-5 border-l-2 pl-3 py-2 text-[11.5px] leading-[1.6] ${highlight ? 'border-[#FF5400] text-white/70' : 'border-[#E5E7EB] text-[#6B7280]'}`}>
        <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em]" style={{ color: highlight ? '#FF5400' : color }}>
          Değerlendirme
        </span>
        <p className="mt-1">{detail}</p>
      </div>
    </div>
  );
}
