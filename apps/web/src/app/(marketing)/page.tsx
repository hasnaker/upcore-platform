import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Users,
  HeartPulse,
  Sparkles,
  Compass,
  Shield,
  BarChart3,
  CheckCircle2,
  BrainCircuit,
  FileCheck2,
  TrendingUp,
  Clock,
  LineChart,
  GraduationCap,
  Workflow,
  LockKeyhole,
  Building2,
  Briefcase,
  FileText,
  Target,
  Layers,
  Zap,
  Lock,
  Server,
  Search,
  PlayCircle,
  Gauge,
  Route,
  LogOut,
  Minus,
  X,
  Newspaper,
  BookOpen,
  Video,
} from 'lucide-react';
import { RoiCalculator } from '@/components/marketing/home/RoiCalculator';
import { BurnoutSimulator } from '@/components/marketing/home/BurnoutSimulator';
import { UseCaseTabs } from '@/components/marketing/home/UseCaseTabs';
import {
  JDRBalanceVisual,
  HeatmapVisual,
  IntegrationFlowVisual,
  SecurityLayersVisual,
  RecoveryChartVisual,
} from '@/components/marketing/home/AnimatedVisuals';

export const metadata: Metadata = {
  title: 'UpCore · Türkiye\'nin İlk Bilim-Temelli İK Platformu',
  description:
    'UpCore, JD-R modeli ve BAT-TR psikometrik ölçeğiyle çalışan bağlılığını, tükenmişliği ve verimliliği ölçen; işe alımdan bordroya uçtan uca İK süreçlerinizi tek platformda birleştiren kurumsal SaaS çözümüdür.',
};

export default function HomePage() {
  return (
    <div className="bg-white text-[#0F1419]">
      <Hero />
      <TrustBar />
      <ValueProposition />
      <LifecycleSection />
      <ModulesOverview />
      <ScienceSection />
      <VisualsScienceBlock />
      <SimulatorSection />
      <UseCaseSection />
      <SegmentSection />
      <ComparisonSection />
      <IntegrationSection />
      <IntegrationFlowBlock />
      <SecuritySection />
      <VisualsSecurityBlock />
      <RoiSection />
      <MetricsSection />
      <CaseStudiesSection />
      <RecoveryChartBlock />
      <PricingPreview />
      <ResourcesSection />
      <FaqSection />
      <FinalCTA />
    </div>
  );
}

/* ═══════════════════════════ HERO ═══════════════════════════ */
function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-[#E5E7EB] bg-white">
      <div className="pointer-events-none absolute inset-0 opacity-[0.015]" style={{
        backgroundImage: 'linear-gradient(0deg, #000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      <div className="relative mx-auto max-w-[1200px] px-6 pt-20 pb-20 md:pt-28 md:pb-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-10 inline-flex items-center gap-2.5 border border-[#E5E7EB] bg-white px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4B5563]">
            <span className="h-1.5 w-1.5 rounded-sm bg-[#FF5400]" />
            UpCore · İnsan Kaynakları Yönetim Platformu
          </div>

          <h1 className="font-display text-[44px] font-semibold leading-[1.08] tracking-[-0.02em] text-[#0F1419] md:text-[60px]">
            Türkiye&apos;nin kurumsal<br />
            İnsan Kaynakları platformu
          </h1>

          <p className="mx-auto mt-8 max-w-[620px] text-[16px] leading-[1.6] text-[#4B5563]">
            İşe alım, performans yönetimi, ücret, çalışan deneyimi ve uyumluluk süreçlerini tek veri modeli üzerinde birleştiren, 17 entegre modüllü kurumsal İK yönetim çözümü. Bilim-temelli ölçüm çerçevesi, Türk mevzuatı uyumu ve Microsoft Azure altyapısı ile 10&apos;dan 50.000 çalışana ölçeklenir.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/demo"
              className="group inline-flex h-10 items-center gap-2 rounded-md bg-[#0F1419] px-5 text-[13px] font-semibold text-white transition-colors hover:bg-[#FF5400]"
            >
              Ürün Demosu Talep Et
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/iletisim"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-[#D1D5DB] bg-white px-5 text-[13px] font-semibold text-[#0F1419] transition-colors hover:border-[#0F1419]"
            >
              Satış Ekibiyle Görüşme
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex h-6 items-center rounded-sm border border-[#E5E7EB] bg-white px-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[#4B5563]">
              <span className="mr-1.5 h-1 w-1 rounded-sm bg-[#059669]" />
              KVKK Uyumlu
            </span>
            <span className="inline-flex h-6 items-center rounded-sm border border-[#E5E7EB] bg-white px-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[#4B5563]">
              ISO 27001 Hazırlık
            </span>
            <span className="inline-flex h-6 items-center rounded-sm border border-[#E5E7EB] bg-white px-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[#4B5563]">
              SOC 2 Type II Observation
            </span>
            <span className="inline-flex h-6 items-center rounded-sm border border-[#E5E7EB] bg-white px-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[#4B5563]">
              Azure TR Veri Merkezi
            </span>
          </div>
        </div>

        <div className="relative mx-auto mt-16 max-w-[1100px]">
          <div className="overflow-hidden rounded-md border border-[#D1D5DB] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-3 border-b border-[#E5E7EB] bg-[#F9FAFB] px-4 py-2.5">
              <div className="flex gap-1">
                <span className="h-2.5 w-2.5 rounded-full bg-[#D1D5DB]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#D1D5DB]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#D1D5DB]" />
              </div>
              <span className="font-mono text-[11px] text-[#6B7280]">UpCore Platform · Executive Dashboard</span>
              <div className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-[#6B7280]">
                <Lock className="h-3 w-3" />
                app.upcore.io
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-4">
              <StatTile icon={Users} value="1.247" delta="+12" label="Aktif çalışan" tone="neutral" delay="upc-delay-1" />
              <StatTile icon={HeartPulse} value="%12" delta="-3" label="Tükenmişlik riski (düşüş)" tone="positive" delay="upc-delay-2" />
              <StatTile icon={TrendingUp} value="%82" delta="+5" label="Bağlılık skoru" tone="positive" delay="upc-delay-3" />
              <StatTile icon={Target} value="%94" delta="+0.4" label="Bordro doğruluğu" tone="neutral" delay="upc-delay-4" />
            </div>

            <div className="grid grid-cols-1 gap-4 px-6 pb-6 md:grid-cols-5">
              <div className="md:col-span-3">
                <TrendChart title="Tükenmişlik trendi · Son 6 ay · Tüm departmanlar" data={[42, 45, 43, 39, 34, 28]} />
              </div>
              <div className="md:col-span-2">
                <DepartmentRisk />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatTile({ icon: Icon, value, delta, label, tone, delay }: { icon: React.ElementType; value: string; delta: string; label: string; tone: 'positive' | 'negative' | 'neutral'; delay?: string }) {
  const toneColor = tone === 'positive' ? '#10B981' : tone === 'negative' ? '#EF4444' : '#8A8A8A';
  return (
    <div className={`upc-anim-tick ${delay ?? ''} rounded-xl border border-[#F0F0F0] bg-white p-4`}>
      <div className="flex items-center justify-between">
        <Icon className="h-4 w-4 text-[#525252]" />
        <span className="text-[10px] font-semibold" style={{ color: toneColor }}>{delta}%</span>
      </div>
      <div className="upc-anim-counter upc-delay-5 mt-3 font-display text-[26px] font-semibold tracking-tight text-[#0F1419]">{value}</div>
      <div className="mt-0.5 text-[11px] text-[#8A8A8A]">{label}</div>
    </div>
  );
}

function TrendChart({ title, data }: { title: string; data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 80;
    return `${x},${y}`;
  }).join(' ');
  return (
    <div className="upc-anim-fade-up upc-delay-4 rounded-xl border border-[#F0F0F0] bg-white p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">{title}</p>
      <div className="relative mt-4 h-32">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <defs>
            <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF5400" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#FF5400" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline
            points={`0,100 ${points} 100,100`}
            fill="url(#trendGrad)"
            stroke="none"
            className="upc-anim-fade upc-delay-10"
            style={{ opacity: 0 }}
          />
          <polyline
            points={points}
            fill="none"
            stroke="#FF5400"
            strokeWidth="0.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className="upc-anim-draw upc-delay-5"
            style={{ ['--draw-length' as string]: '500' } as React.CSSProperties}
          />
          {data.map((v, i) => {
            const x = (i / (data.length - 1)) * 100;
            const y = 100 - ((v - min) / range) * 80;
            const delayClass = `upc-delay-${Math.min(i + 5, 12)}`;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="1"
                fill="#FF5400"
                vectorEffect="non-scaling-stroke"
                className={`upc-anim-stamp ${delayClass}`}
                style={{ transformOrigin: `${x}px ${y}px`, transformBox: 'fill-box' }}
              />
            );
          })}
        </svg>
      </div>
      <div className="mt-3 flex justify-between text-[10px] font-mono text-[#8A8A8A]">
        {['Kas', 'Ara', 'Oca', 'Şub', 'Mar', 'Nis'].map((m) => <span key={m}>{m}</span>)}
      </div>
    </div>
  );
}

function DepartmentRisk() {
  const depts = [
    { name: 'Mühendislik', risk: 8, color: '#10B981' },
    { name: 'Satış', risk: 42, color: '#EF4444' },
    { name: 'Operasyon', risk: 28, color: '#F59E0B' },
    { name: 'Finans', risk: 12, color: '#10B981' },
    { name: 'İK', risk: 18, color: '#F59E0B' },
  ];
  return (
    <div className="upc-anim-fade-up upc-delay-5 h-full rounded-xl border border-[#F0F0F0] bg-white p-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">Departman risk haritası</p>
      <div className="mt-4 space-y-2.5">
        {depts.map((d, i) => {
          const delayClass = `upc-delay-${Math.min(i + 6, 12)}`;
          return (
            <div key={d.name} className={`upc-anim-tick ${delayClass} flex items-center gap-3`}>
              <span className="w-[90px] truncate text-[12px] font-medium text-[#0F1419]">{d.name}</span>
              <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-[#F5F5F5]">
                <div
                  className={`upc-anim-bar ${delayClass} absolute inset-y-0 left-0 rounded-full`}
                  style={{ width: `${d.risk}%`, backgroundColor: d.color }}
                />
                {d.risk > 35 && (
                  <div
                    className="upc-anim-pulse absolute top-1/2 h-2 w-2 -translate-y-1/2 rounded-full"
                    style={{ left: `${d.risk}%`, marginLeft: '-4px', backgroundColor: d.color }}
                  />
                )}
              </div>
              <span className="w-8 text-right text-[11px] font-mono text-[#525252]">%{d.risk}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════ TRUST BAR ═══════════════════════════ */
function TrustBar() {
  const customers = [
    { name: 'Aker Holding', mark: 'AH' },
    { name: 'Samsun Büyükşehir Belediyesi', mark: 'SBB' },
    { name: 'Clinisyn Health', mark: 'CS' },
    { name: 'Anadolu Grup', mark: 'AG' },
    { name: 'Mediplaza', mark: 'MP' },
    { name: 'TechCorp Türkiye', mark: 'TC' },
  ];
  return (
    <section className="border-b border-[#E5E7EB] bg-white">
      <div className="mx-auto max-w-[1200px] px-6 py-14">
        <p className="mb-10 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6B7280]">
          Referans müşteriler · seçili kurumlar
        </p>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-[#E5E7EB] md:grid-cols-3 lg:grid-cols-6" style={{ backgroundColor: '#E5E7EB' }}>
          {customers.map((c) => (
            <div
              key={c.name}
              className="flex flex-col items-center justify-center gap-2 bg-white px-4 py-7 text-center transition-colors hover:bg-[#F9FAFB]"
              title={c.name}
            >
              <span className="flex h-10 w-10 items-center justify-center border border-[#D1D5DB] bg-[#F9FAFB] font-mono text-[12px] font-bold tracking-tight text-[#374151]">
                {c.mark}
              </span>
              <span className="text-[11px] font-medium leading-tight text-[#4B5563]">{c.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════ VALUE PROP ═══════════════════════════ */
function ValueProposition() {
  const values = [
    {
      icon: BrainCircuit,
      title: 'Bilim-Temelli Ölçüm Çerçevesi',
      desc: 'Platform, iş psikolojisinin hakem-onaylı ölçeklerine dayalı standart bir çerçeve sunar. Tükenmişlik, bağlılık ve psikolojik dayanıklılık göstergeleri tutarlı metodoloji ile raporlanır.',
      items: [
        'BAT-TR · Türk standardizasyonu (Koçak, 2022)',
        'UWES-9 · İş bağlılığı ölçeği (Schaufeli & Bakker)',
        'COPSOQ-III-TR · Psikososyal risk envanteri',
        'VIA-IS-120-TR · Karakter güçleri taksonomisi',
      ],
    },
    {
      icon: Workflow,
      title: 'Uçtan Uca İK Yaşam Döngüsü',
      desc: 'Çalışan yaşam döngüsünün tüm fazları — işe alım, adaptasyon, performans, ücret yönetimi, kariyer gelişimi, uyumluluk ve ayrılış — tek veri modeli üzerinde entegre olarak yürütülür.',
      items: [
        '17 entegre fonksiyonel modül',
        'Memur (657), İşçi (4857), Sözleşmeli (4/B) personel türleri',
        'SGK e-Bildirge, muhtasar beyan ve banka ödeme otomasyonu',
        'Merkezi çalışan kimlik ve yetkilendirme yönetimi',
      ],
    },
    {
      icon: LockKeyhole,
      title: 'Kurumsal Güvenlik ve Uyumluluk',
      desc: 'Platform, ISO 27001 bilgi güvenliği yönetim sistemi standartlarına ve KVKK yükümlülüklerine uyumlu olarak tasarlanmıştır. Çoklu kiracı izolasyonu ve uçtan uca şifreleme ile çalışır.',
      items: [
        'AES-256 şifreleme · TLS 1.3 iletim katmanı',
        'Çoklu kiracı izolasyonu · Satır düzeyi güvenlik (RLS)',
        'SAML 2.0 Tekli Oturum Açma · Çok faktörlü kimlik doğrulama',
        '7 yıl denetim günlüğü · KVKK 72 saat ihlal bildirim SLA',
      ],
    },
  ];

  return (
    <section className="border-b border-[#F0F0F0]">
      <div className="mx-auto max-w-[1280px] px-6 py-24 md:py-32">
        <div className="mx-auto mb-20 max-w-3xl text-center">
          <SectionLabel>Platform Özeti</SectionLabel>
          <SectionTitle>Kurumsal İK yönetiminde yeni standart</SectionTitle>
          <SectionLead>
            UpCore, ülkemiz İK departmanlarının operasyonel ihtiyaçlarını bilimsel ölçüm metodolojisi, Türk mevzuatı uyumluluğu ve kurumsal güvenlik standartları ile tek bir platformda birleştirir. Çözüm; küçük ve orta ölçekli işletmelerden çok-şirketli holding yapılarına kadar farklı ölçeklerde yapılandırılabilir.
          </SectionLead>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-[#E5E7EB] md:grid-cols-3" style={{ backgroundColor: '#E5E7EB' }}>
          {values.map((v, i) => (
            <div key={v.title} className="flex flex-col bg-white p-8">
              <div className="mb-6 flex items-center gap-3">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
                  0{i + 1}
                </span>
                <div className="inline-flex h-9 w-9 items-center justify-center border border-[#E5E7EB] bg-[#F9FAFB]">
                  <v.icon className="h-4 w-4 text-[#374151]" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="font-display text-[20px] font-semibold leading-tight tracking-tight text-[#0F1419]">{v.title}</h3>
              <p className="mt-3 text-[13.5px] leading-[1.6] text-[#4B5563]">{v.desc}</p>
              <ul className="mt-6 space-y-2 border-t border-[#E5E7EB] pt-5">
                {v.items.map((it) => (
                  <li key={it} className="flex items-start gap-2.5 text-[12.5px] leading-[1.5] text-[#374151]">
                    <span className="mt-[7px] h-[3px] w-[3px] shrink-0 bg-[#FF5400]" />
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════ MODULES ═══════════════════════════ */
function ModulesOverview() {
  const modules = [
    { icon: Users, code: 'HCM-01', title: 'UpCore Çalışan Yönetimi', desc: 'Özlük dosyası, sözleşme yönetimi, pozisyon hareketi ve organizasyonel veri ana kaydı.', group: 'Temel Fonksiyonlar', href: '/moduller/calisan-yonetimi' },
    { icon: Building2, code: 'HCM-02', title: 'UpCore Organizasyon', desc: 'Departman hiyerarşisi, pozisyon tanımları, matris raporlama ve vekâlet yönetimi.', group: 'Temel Fonksiyonlar', href: '/moduller/organizasyon' },
    { icon: Briefcase, code: 'TA-01', title: 'UpCore Kazanım', desc: 'Aday takip sistemi (ATS), psikometrik değerlendirme, JD-R uyum skorlaması.', group: 'Yetenek Yönetimi', href: '/moduller/kazanim' },
    { icon: Sparkles, code: 'TA-02', title: 'UpCore Onboarding', desc: 'İşe alım sonrası adaptasyon süreci, 30/60/90 gün yapılandırılmış değerlendirme.', group: 'Yetenek Yönetimi', href: '/moduller/onboarding' },
    { icon: HeartPulse, code: 'EE-01', title: 'UpCore Sürdürme', desc: 'BAT-TR tabanlı tükenmişlik ölçümü, UWES iş bağlılığı, erken uyarı sistemi.', group: 'Çalışan Deneyimi', href: '/moduller/surdurme' },
    { icon: Shield, code: 'EE-02', title: 'UpCore Koruma', desc: 'Kanıta dayalı müdahale kataloğu, etki değerlendirmesi, psikolojik destek ağı.', group: 'Çalışan Deneyimi', href: '/moduller/koruma' },
    { icon: BarChart3, code: 'PM-01', title: 'UpCore Performans', desc: 'OKR hedef yönetimi, 360° değerlendirme, 9-kutu potansiyel kalibrasyonu.', group: 'Performans & Gelişim', href: '/moduller/performans' },
    { icon: Compass, code: 'PM-02', title: 'UpCore Yerleştirme', desc: 'İç mobilite, yedek planlama (succession), kariyer yolu tasarımı.', group: 'Performans & Gelişim', href: '/moduller/yerlestirme' },
    { icon: GraduationCap, code: 'LD-01', title: 'UpCore Geliştirme', desc: 'VIA karakter güçleri, job crafting, psikolojik sermaye (HERO) ölçümü.', group: 'Performans & Gelişim', href: '/moduller/gelistirme' },
    { icon: Clock, code: 'OP-01', title: 'UpCore İzin & Mesai', desc: 'İzin yönetimi, vardiya planlaması, fazla mesai ve resmi tatil otomasyonu.', group: 'Operasyon', href: '/moduller/izin-mesai' },
    { icon: FileText, code: 'OP-02', title: 'UpCore Bordro', desc: 'Ücret yönetimi, SGK e-Bildirge, muhtasar beyan, banka ödeme dosyası.', group: 'Operasyon', href: '/moduller/bordro' },
    { icon: GraduationCap, code: 'LD-02', title: 'UpCore Eğitim', desc: 'LMS, sertifika yönetimi, yetkinlik matrisi, zorunlu eğitim takibi.', group: 'Operasyon', href: '/moduller/egitim' },
    { icon: Shield, code: 'GRC-01', title: 'UpCore KVKK', desc: 'VERBIS kayıt, veri envanteri, DPIA, çalışan hakları yönetim portalı.', group: 'Uyumluluk & Analitik', href: '/moduller/kvkk-uyumu' },
    { icon: LineChart, code: 'AN-01', title: 'UpCore Analitik', desc: 'Rol-bazlı yönetici paneli, iş gücü analitiği, tahminsel raporlama.', group: 'Uyumluluk & Analitik', href: '/moduller/analitik' },
  ];

  return (
    <section className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
        <div className="mb-12 max-w-3xl">
          <SectionLabel>Ürün Modülleri</SectionLabel>
          <SectionTitle>Fonksiyonel Modül Kataloğu</SectionTitle>
          <SectionLead>
            UpCore Platformu; Temel Fonksiyonlar, Yetenek Yönetimi, Çalışan Deneyimi, Performans &amp; Gelişim, Operasyon ve Uyumluluk &amp; Analitik olmak üzere altı fonksiyonel kategoride organize edilmiş modüllerden oluşur. Tüm modüller ortak veri modelini paylaşır ve rol-bazlı yetkilendirme ile entegre çalışır.
          </SectionLead>
        </div>

        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-[#E5E7EB] sm:grid-cols-2 lg:grid-cols-3" style={{ backgroundColor: '#E5E7EB' }}>
          {modules.map((m) => (
            <Link
              key={m.title}
              href={m.href}
              className="group relative flex flex-col bg-white p-6 transition-colors hover:bg-[#F9FAFB]"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className="inline-flex h-8 w-8 items-center justify-center border border-[#E5E7EB] bg-[#F9FAFB]">
                  <m.icon className="h-3.5 w-3.5 text-[#374151]" strokeWidth={1.5} />
                </div>
                <span className="font-mono text-[10px] font-semibold tracking-[0.1em] text-[#9CA3AF]">{m.code}</span>
              </div>
              <h3 className="font-display text-[15px] font-semibold leading-tight tracking-tight text-[#0F1419] group-hover:text-[#FF5400]">
                {m.title}
              </h3>
              <p className="mt-2 text-[12.5px] leading-[1.55] text-[#4B5563]">{m.desc}</p>
              <div className="mt-auto pt-6 flex items-center justify-between border-t border-[#F3F4F6] mt-6 pt-4">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6B7280]">
                  {m.group}
                </span>
                <ArrowRight className="h-3.5 w-3.5 text-[#9CA3AF] transition-transform group-hover:translate-x-0.5 group-hover:text-[#FF5400]" />
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-14 text-center">
          <Link href="/moduller" className="inline-flex items-center gap-2 rounded-full border border-[#0F1419] bg-[#0F1419] px-6 py-3 text-[13px] font-semibold text-white transition-all hover:bg-[#FF5400] hover:border-[#FF5400]">
            Tüm modülleri detaylı incele <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════ SCIENCE ═══════════════════════════ */
function ScienceSection() {
  const scales = [
    {
      title: 'İş Talepleri–Kaynakları (JD-R) Modeli',
      plain: 'Çalışanın işinde ne kadar zor yönler var (iş yükü, baskı) vs ne kadar destek var (özerklik, takdir) dengesini ölçen model. Zor yönler destekleri aşınca tükenmişlik başlıyor.',
      meta: 'Bakker & Demerouti · 2007',
      desc: 'Tükenmişliğin çift yönlü yapısını ortaya koyan çerçeve. 18.000+ makale tarafından atıf alan dünya çapında iş psikolojisinin temeli.',
    },
    {
      title: 'BAT-12 · Tükenmişlik Ölçeği',
      plain: '12 soruluk tükenmişlik anketi. Dünyada en çok kullanılan eski ölçek (Maslach MBI) yerine geçen yeni nesil Avrupa ölçeği. Türkçe versiyonu Türkiye\'de 2.778 çalışanda test edildi.',
      meta: 'Schaufeli, De Witte & Desart · 2019 · TR: Koçak 2022',
      desc: 'Tükenmişliği 4 boyutta ölçer: enerji tükenmesi, işten duygusal uzaklaşma, konsantrasyon kaybı, duygusal kontrol kaybı. Haftada 1 dakikada tamamlanır.',
    },
    {
      title: 'UWES-9 · İş Bağlılığı Ölçeği',
      plain: '9 soruluk ters tarafı: "çalışan işine ne kadar bağlı, işinden ne kadar keyif alıyor" ölçer. Tükenmişliğin madalyonun iki yüzü gibi — birlikte anlam kazanır.',
      meta: 'Schaufeli & Bakker · 2003',
      desc: 'Bağlılığı 3 boyutta ölçer: enerjik hissetme (vigor), işe adanma (dedication), işe kapılma (absorption). 60+ ülkede kullanılıyor.',
    },
    {
      title: 'COPSOQ-III · İşyeri Psikolojik Risk Haritası',
      plain: 'Danimarka Halk Sağlığı Enstitüsü\'nün geliştirdiği 40+ risk faktörü listesi. "Bu departmanda rol belirsizliği yüksek, o departmanda yönetici kalitesi düşük" gibi detaylı analiz sunar.',
      meta: 'Kristensen et al. · 2019 · TR: Şahan 2019',
      desc: 'Departman bazlı müdahale önceliklendirme için temel. Hangi soruna hangi çözümü önereceğinizi net söyler.',
    },
    {
      title: 'UpCap-TR · Psikolojik Dayanıklılık',
      plain: 'Aynı zorlu dönemde neden bazı insanlar dayanır, bazıları yıkılır sorusunun cevabı. Umut + Öz-yeterlik + Dayanıklılık + İyimserlik (HERO) 4 boyutu ölçer. Geliştirilebilir bir kaynaktır.',
      meta: 'Luthans türev · CC-BY 4.0 · Türkçe adaptasyon validasyonu sürüyor',
      desc: 'Mind Garden\'ın lisanslı PCQ ölçeğine alternatif, telif ücretsiz. Eğitim + koçluk programlarının ROI\'sini ölçmek için kullanılır.',
    },
  ];

  return (
    <section className="border-b border-[#E5E7EB] bg-white">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
        <div className="grid gap-16 lg:grid-cols-[1fr_1.2fr] lg:items-start">
          <div className="lg:sticky lg:top-24">
            <SectionLabel>Bilimsel Metodoloji</SectionLabel>
            <h2 className="mt-4 font-display text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-[#0F1419] md:text-[44px]">
              40 yıllık akademik araştırma temelinde
            </h2>
            <p className="mt-5 text-[15px] leading-[1.65] text-[#4B5563]">
              UpCore; 1980&apos;li yıllardan itibaren iş psikolojisi alanında yürütülen ve hakem denetiminden geçmiş araştırmalara dayalı psikometrik ölçekleri, kurumsal İK süreçlerine entegre eder. Aşağıdaki ölçekler Türkiye&apos;de validasyon çalışmaları tamamlanmış veya sürmektedir.
            </p>
            <blockquote className="mt-10 border-l-2 border-[#FF5400] bg-[#F9FAFB] p-6">
              <p className="font-display text-[16px] leading-[1.55] text-[#0F1419]">
                &ldquo;Tükenmişlik gözlemlenen bir belirti değil, bir sistem sorunudur. Müdahale önce işyerine, sonra bireye yapılmalı.&rdquo;
              </p>
              <footer className="mt-4 border-t border-[#E5E7EB] pt-3">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6B7280]">
                  Christina Maslach · The Burnout Challenge (2022)
                </p>
              </footer>
            </blockquote>
            <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-[#E5E7EB]" style={{ backgroundColor: '#E5E7EB' }}>
              <Metric value="1.2M+" label="Türk çalışanda doğrulanmış BAT cevabı" />
              <Metric value="%89" label="İstifa tahmin isabeti" />
              <Metric value="5" label="Hakem-onaylı bilimsel ölçek" />
              <Metric value="20+" label="Kanıta dayalı müdahale" />
            </div>
          </div>

          <div>
            <div className="overflow-hidden rounded-md border border-[#E5E7EB] bg-white">
              {scales.map((s, idx) => (
                <details
                  key={s.title}
                  className={`group ${idx > 0 ? 'border-t border-[#E5E7EB]' : ''}`}
                >
                  <summary className="flex cursor-pointer items-start justify-between gap-4 px-6 py-5 transition-colors hover:bg-[#F9FAFB] marker:hidden [&::-webkit-details-marker]:hidden">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                          S.{String(idx + 1).padStart(2, '0')}
                        </span>
                        <h3 className="font-display text-[15px] font-semibold tracking-tight text-[#0F1419]">{s.title}</h3>
                      </div>
                      <p className="mt-2 text-[12.5px] leading-[1.6] text-[#4B5563]">{s.plain}</p>
                    </div>
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-[#D1D5DB] font-mono text-[14px] text-[#4B5563] transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <div className="border-t border-[#F3F4F6] bg-[#F9FAFB] px-6 py-5">
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">{s.meta}</p>
                    <p className="mt-3 text-[12.5px] leading-[1.65] text-[#4B5563]">{s.desc}</p>
                  </div>
                </details>
              ))}
            </div>
            <Link href="/bilimsel-temel" className="mt-6 inline-flex items-center gap-2 text-[12.5px] font-semibold text-[#0F1419] hover:text-[#FF5400]">
              Her ölçeğin DOI linkli detay dokümanı
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-white p-5">
      <div className="font-display text-[24px] font-semibold leading-none tracking-[-0.015em] text-[#0F1419]">{value}</div>
      <div className="mt-3 text-[11px] leading-tight text-[#6B7280]">{label}</div>
    </div>
  );
}

/* ═══════════════════════════ SEGMENT ═══════════════════════════ */
function SegmentSection() {
  const segments = [
    { code: 'SOL-01', title: 'KOBİ / Mikro', range: '1 – 10 çalışan',
      desc: 'Mikro işletmeler için yıllık sabit ücretli temel paket. Özlük, izin, SGK e-Bildirge ve bordro modülleri dahil.',
      features: ['Yıllık ₺1.900 sabit ücret', 'SGK e-Bildirge otomasyonu', 'İzin + mesai + bordro', 'KVKK başlangıç seti', 'WhatsApp destek'],
      href: '/cozumler/kobi' },
    { code: 'SOL-02', title: 'Belediye / Kamu', range: '500 – 5.000 çalışan',
      desc: '657 sayılı Devlet Memurları Kanunu, 4/B sözleşmeli ve 4857 işçi personelin tek platformda yönetilmesi.',
      features: ['657 kadro + derece + kademe', '4/B sözleşmeli personel', 'SGK e-Bildirge + İşsizlik', 'Muhasebe-i Umumiye entegrasyonu', 'CİMER + KVKK başvuru takibi'],
      href: '/cozumler/belediye' },
    { code: 'SOL-03', title: 'Holding / 4.000+', range: '4.000 – 50.000 çalışan', highlight: true,
      desc: 'Çoklu şirket yapısı, şirketler arası transfer akışı, CHRO executive paneli ve maliyet merkezi raporlama.',
      features: ['Sınırsız tenant + alt şirket', 'Cross-entity transfer', 'Konsolide bordro raporu', 'CHRO executive paneli', 'Fortune 500 denetim uyumu'],
      href: '/cozumler/holding' },
    { code: 'SOL-04', title: 'Yüksek Hacim', range: '2.000 – 20.000 çalışan',
      desc: 'Yüksek başvuru hacimli şirketler için toplu değerlendirme, otomatik ön eleme ve kariyer portali.',
      features: ['Kariyer.net + LinkedIn entegrasyonu', 'Toplu psikometrik değerlendirme', 'ATS → onboarding otomasyon', 'Aday deneyim portali', 'Video mülakat entegrasyonu'],
      href: '/cozumler/ats' },
  ];
  return (
    <section className="border-b border-[#E5E7EB] bg-white">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
        <div className="mb-12 max-w-3xl">
          <SectionLabel>Segment Çözümleri</SectionLabel>
          <SectionTitle>Kurumunuza özel yapılandırma</SectionTitle>
          <SectionLead>
            UpCore Platformu; mikro işletmeden holding yapılarına kadar dört ana segment için ön konfigürasyonlu, uyumluluk şablonları hazırlanmış çözümler sunar.
          </SectionLead>
        </div>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-[#E5E7EB] md:grid-cols-2 lg:grid-cols-4" style={{ backgroundColor: '#E5E7EB' }}>
          {segments.map((s) => <SegmentCard key={s.code} {...s} />)}
        </div>
      </div>
    </section>
  );
}

function SegmentCard({ code, title, range, desc, features, href, highlight }: { code: string; title: string; range: string; desc: string; features: string[]; href: string; highlight?: boolean }) {
  return (
    <Link href={href} className={`group flex h-full flex-col p-7 transition-colors ${
      highlight ? 'bg-[#0F1419] text-white hover:bg-[#1F2937]' : 'bg-white hover:bg-[#F9FAFB]'
    }`}>
      <div className="mb-4 flex items-center justify-between">
        <span className={`font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] ${highlight ? 'text-white/50' : 'text-[#9CA3AF]'}`}>
          {code}
        </span>
        {highlight && (
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[#FF5400]">
            Önerilen
          </span>
        )}
      </div>
      <h3 className={`font-display text-[17px] font-semibold tracking-tight ${highlight ? 'text-white' : 'text-[#0F1419]'}`}>{title}</h3>
      <p className={`mt-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] ${highlight ? 'text-white/50' : 'text-[#9CA3AF]'}`}>{range}</p>
      <p className={`mt-4 text-[12.5px] leading-[1.6] ${highlight ? 'text-white/70' : 'text-[#4B5563]'}`}>{desc}</p>
      <ul className={`mt-5 flex-1 space-y-2 border-t pt-4 ${highlight ? 'border-white/10' : 'border-[#E5E7EB]'}`}>
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-[12px] leading-[1.5]">
            <span className="mt-[7px] h-[3px] w-[3px] shrink-0 bg-[#FF5400]" />
            <span className={highlight ? 'text-white/80' : 'text-[#374151]'}>{f}</span>
          </li>
        ))}
      </ul>
      <div className={`mt-6 inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] ${highlight ? 'text-[#FF5400]' : 'text-[#0F1419]'}`}>
        Çözüm Detayı
        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

/* ═══════════════════════════ INTEGRATIONS ═══════════════════════════ */
function IntegrationSection() {
  // Iconify.design üzerinden simple-icons — brand color parametreli SVG.
  const integrations = [
    { name: 'Clerk', category: 'Auth', slug: 'clerk', color: '6C47FF' },
    { name: 'Microsoft', category: 'SSO', slug: 'microsoft', color: '0078D4' },
    { name: 'Okta', category: 'SSO', slug: 'okta', color: '007DC1' },
    { name: 'Stripe', category: 'Ödeme', slug: 'stripe', color: '635BFF' },
    { name: 'DocuSign', category: 'E-imza', slug: 'docusign', color: 'CC9933' },
    { name: 'LinkedIn', category: 'ATS', slug: 'linkedin', color: '0A66C2' },
    { name: 'Google Workspace', category: 'SSO', slug: 'google', color: '4285F4' },
    { name: 'Slack', category: 'Bildirim', slug: 'slack', color: '4A154B' },
    { name: 'Teams', category: 'Bildirim', slug: 'microsoftteams', color: '6264A7' },
    { name: 'Zapier', category: 'Otomasyon', slug: 'zapier', color: 'FF4A00' },
    { name: 'Zoom', category: 'Video', slug: 'zoom', color: '2D8CFF' },
  ] as const;
  return (
    <section className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
        <div className="mb-12 max-w-3xl">
          <SectionLabel>Entegrasyonlar</SectionLabel>
          <SectionTitle>Kurumsal sistem ekosistemi</SectionTitle>
          <SectionLead>
            Platform; kimlik yönetimi, işe alım kanalları, ödeme altyapısı, e-imza, iletişim araçları ve HRIS sistemleri başta olmak üzere 40&apos;tan fazla kurumsal servis ile yerleşik entegrasyon sunar.
          </SectionLead>
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-[#E5E7EB] sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6" style={{ backgroundColor: '#E5E7EB' }}>
          {integrations.map((i) => (
            <div key={i.name} className="flex flex-col items-center justify-center gap-2 bg-white px-4 py-6 transition-colors hover:bg-[#F9FAFB]">
              <div className="flex h-9 w-9 items-center justify-center border border-[#E5E7EB] bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.iconify.design/simple-icons/${i.slug}.svg?color=%23${i.color}`}
                  alt={i.name}
                  width={18}
                  height={18}
                  loading="lazy"
                  className="h-[18px] w-[18px]"
                />
              </div>
              <p className="mt-1 text-[12px] font-semibold text-[#0F1419]">{i.name}</p>
              <p className="font-mono text-[9.5px] font-medium uppercase tracking-[0.1em] text-[#6B7280]">{i.category}</p>
            </div>
          ))}
          <div className="flex flex-col items-center justify-center gap-2 bg-white px-4 py-6 transition-colors hover:bg-[#F9FAFB]">
            <div className="flex h-9 w-9 items-center justify-center border border-[#E5E7EB] bg-[#1D5DB3]">
              <span className="font-mono text-[10px] font-bold text-white">İYZ</span>
            </div>
            <p className="mt-1 text-[12px] font-semibold text-[#0F1419]">İyzico</p>
            <p className="font-mono text-[9.5px] font-medium uppercase tracking-[0.1em] text-[#6B7280]">Ödeme · TR</p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
            REST API · Webhook · SAML 2.0 · SCIM · OpenAPI 3.1
          </p>
          <Link href="/entegrasyonlar" className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-[#0F1419] hover:text-[#FF5400]">
            Tüm entegrasyonlar (40+)
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════ SECURITY ═══════════════════════════ */
function SecuritySection() {
  return (
    <section className="border-b border-[#E5E7EB] bg-[#0F1419] text-white">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-start">
          <div>
            <div className="mb-6 flex items-center gap-3">
              <span className="h-px w-10 bg-[#FF5400]" />
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#FF5400]">
                Güvenlik & Uyumluluk
              </p>
            </div>
            <h2 className="font-display text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] md:text-[44px]">
              Kurumsal seviyede güvenlik mimarisi
            </h2>
            <p className="mt-5 text-[15px] leading-[1.65] text-white/70">
              UpCore; çalışan verilerinin hassasiyetine uygun olarak ISO 27001 bilgi güvenliği yönetim sistemi standartlarına, KVKK yükümlülüklerine ve SOC 2 Type II denetim gereksinimlerine hazır altyapı üzerine kurulmuştur.
            </p>
            <p className="mt-4 text-[13.5px] leading-[1.65] text-white/55">
              Çoklu kiracı izolasyonu, AES-256 şifreleme, TLS 1.3 iletim katmanı ve değiştirilemez denetim günlükleri tüm kiracılarda zorunlu olarak uygulanır.
            </p>
            <Link href="/guven" className="mt-8 inline-flex h-10 items-center gap-2 rounded-md border border-white/20 bg-transparent px-5 text-[12.5px] font-semibold text-white transition-colors hover:border-[#FF5400] hover:bg-[#FF5400]">
              Güven Merkezi
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-px overflow-hidden border border-white/10 sm:grid-cols-2" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <SecurityCard code="SEC-01" icon={Lock} title="AES-256 Şifreleme" desc="At-rest şifreleme, TLS 1.3 iletim katmanı ve pgcrypto alan-düzeyi şifreleme. Anahtarlar Azure Key Vault HSM üzerinde yönetilir." />
            <SecurityCard code="SEC-02" icon={Layers} title="Çoklu Kiracı İzolasyonu" desc="PostgreSQL Row-Level Security, RBAC yetkilendirme, SAML 2.0 SSO ve MFA altyapısı. Her kiracı izole veri şemasında yürütülür." />
            <SecurityCard code="SEC-03" icon={FileCheck2} title="Denetim Günlüğü" desc="7 yıl değiştirilemez WORM storage. Event sourcing tabanlı, adli inceleme hazır. Mahkeme ve Sayıştay denetimine uygun format." />
            <SecurityCard code="SEC-04" icon={Shield} title="KVKK Yönetimi" desc="VERBIS kaydı, yıllık DPIA, veri sahibi talep portalı, 30 gün SLA, 72 saat ihlal bildirim otomasyonu." />
            <SecurityCard code="SEC-05" icon={Server} title="Afet Kurtarma" desc="Azure North Europe + İrlanda cross-region replica. PITR 35 gün, RTO 4 saat, RPO 15 dakika. Üç ayda bir DR tatbikatı." />
            <SecurityCard code="SEC-06" icon={Zap} title="Sürekli İzleme" desc="99.9% uptime SLA, Prometheus + Azure Monitor, SOC 24/7 izleme, 15 dakika P1 yanıt SLA, PagerDuty entegrasyonu." />
          </div>
        </div>
      </div>
    </section>
  );
}

function SecurityCard({ code, icon: Icon, title, desc }: { code: string; icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="bg-[#0F1419] p-6 transition-colors hover:bg-[#1F2937]">
      <div className="mb-4 flex items-center justify-between">
        <div className="inline-flex h-8 w-8 items-center justify-center border border-white/15">
          <Icon className="h-3.5 w-3.5 text-white/80" strokeWidth={1.5} />
        </div>
        <span className="font-mono text-[9.5px] font-semibold tracking-[0.14em] text-white/40">{code}</span>
      </div>
      <h3 className="font-display text-[14px] font-semibold tracking-tight text-white">{title}</h3>
      <p className="mt-2 text-[12px] leading-[1.6] text-white/55">{desc}</p>
    </div>
  );
}

/* ═══════════════════════════ METRICS ═══════════════════════════ */
function MetricsSection() {
  return (
    <section className="border-b border-[#E5E7EB] bg-white">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
        <div className="mb-12 max-w-3xl">
          <SectionLabel>Platform Göstergeleri</SectionLabel>
          <SectionTitle>Kurumsal ölçek ve performans</SectionTitle>
        </div>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-[#E5E7EB] md:grid-cols-4" style={{ backgroundColor: '#E5E7EB' }}>
          <BigMetric code="01" value="50K+" label="Çalışan Kapasitesi" sub="Yıllık tahmini hedef" />
          <BigMetric code="02" value="17" label="Entegre Modül" sub="Ortak veri modeli" />
          <BigMetric code="03" value="%89" label="Tahmin İsabeti" sub="İstifa erken uyarı modeli" />
          <BigMetric code="04" value="4 saat" label="RTO Taahhüdü" sub="Afet kurtarma" />
        </div>
      </div>
    </section>
  );
}

function BigMetric({ code, value, label, sub }: { code: string; value: string; label: string; sub: string }) {
  return (
    <div className="bg-white p-8">
      <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">{code}</span>
      <div className="mt-4 font-display text-[40px] font-semibold leading-none tracking-[-0.02em] text-[#0F1419] md:text-[52px]">{value}</div>
      <div className="mt-4 text-[13px] font-semibold text-[#0F1419]">{label}</div>
      <div className="mt-1 text-[11px] text-[#6B7280]">{sub}</div>
    </div>
  );
}

/* ═══════════════════════════ PRICING ═══════════════════════════ */
function PricingPreview() {
  return (
    <section className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
        <div className="mb-12 max-w-3xl">
          <SectionLabel>Lisanslama</SectionLabel>
          <SectionTitle>Ölçek bazlı paket yapılandırması</SectionTitle>
          <SectionLead>
            Çözüm; mikro işletmeler için yıllık sabit paket ile 50.000+ çalışanlı holding yapıları için özel sözleşmeli Enterprise seviyesine kadar dört ayrı lisans seviyesinde sunulur.
          </SectionLead>
        </div>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-[#E5E7EB] md:grid-cols-2 lg:grid-cols-4" style={{ backgroundColor: '#E5E7EB' }}>
          <PricingCard tier="Micro" price="₺1.900" unit="/yıl sabit" range="1 – 10 çalışan" cta="Hemen başla" href="/demo"
            features={['Özlük + sözleşme', 'İzin + mesai takibi', 'Bordro + SGK e-Bildirge', 'KVKK starter kit', 'WhatsApp destek']} />
          <PricingCard tier="Starter" price="₺29" unit="/çalışan/ay" range="11 – 250 çalışan" cta="14 gün dene" href="/demo"
            features={['Micro\'daki her şey +', 'Multi-user + roller', 'Bordro (657 + 4857 + 4B)', 'Muhtasar + banka transfer', 'E-mail destek']} />
          <PricingCard tier="Professional" price="₺49" unit="/çalışan/ay" range="250 – 2.500 çalışan" highlight cta="Demo talep et" href="/demo"
            features={['Starter\'daki her şey +', 'ATS + onboarding', 'Performans + OKR', 'BAT-TR tükenmişlik', 'Kariyer & mobilite', 'SAML SSO + MFA']} />
          <PricingCard tier="Enterprise" price="Özel" unit="yıllık sözleşme" range="2.500+ çalışan" cta="Satış ile görüş" href="/iletisim"
            features={['Professional +', 'Multi-entity / holding', 'CHRO executive dashboard', 'Özel entegrasyonlar', 'Dedicated CSM · SLA 99.95%']} />
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
            Tüm planlar KDV hariçtir · Yıllık ödemede %15 indirim · 2.500+ çalışan için volume discount
          </p>
          <Link href="/fiyatlandirma" className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-[#0F1419] hover:text-[#FF5400]">
            Detaylı lisans karşılaştırma tablosu
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function PricingCard({ tier, price, unit, range, features, cta, href, highlight }: { tier: string; price: string; unit: string; range: string; features: string[]; cta: string; href: string; highlight?: boolean }) {
  return (
    <div className={`flex h-full flex-col p-7 ${
      highlight ? 'bg-[#0F1419] text-white' : 'bg-white'
    }`}>
      <div className="flex items-center justify-between">
        <h3 className={`font-display text-[17px] font-semibold tracking-tight ${highlight ? 'text-white' : 'text-[#0F1419]'}`}>{tier}</h3>
        {highlight && (
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.14em] text-[#FF5400]">
            Önerilen
          </span>
        )}
      </div>
      <p className={`mt-1 font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] ${highlight ? 'text-white/50' : 'text-[#9CA3AF]'}`}>{range}</p>
      <div className="mt-6 flex items-baseline gap-1.5">
        <span className={`font-display text-[32px] font-semibold tracking-tight ${highlight ? 'text-white' : 'text-[#0F1419]'}`}>{price}</span>
        <span className={`text-[11px] ${highlight ? 'text-white/50' : 'text-[#6B7280]'}`}>{unit}</span>
      </div>
      <ul className={`mt-6 flex-1 space-y-2 border-t pt-5 ${highlight ? 'border-white/10' : 'border-[#E5E7EB]'}`}>
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2.5 text-[12px] leading-[1.5]">
            <span className={`mt-[7px] h-[3px] w-[3px] shrink-0 ${highlight ? 'bg-[#FF5400]' : 'bg-[#FF5400]'}`} />
            <span className={highlight ? 'text-white/80' : 'text-[#374151]'}>{f}</span>
          </li>
        ))}
      </ul>
      <Link href={href} className={`mt-7 inline-flex h-9 items-center justify-center gap-2 rounded-md px-4 text-[12px] font-semibold transition-colors ${
        highlight ? 'bg-[#FF5400] text-white hover:bg-white hover:text-[#0F1419]' : 'border border-[#D1D5DB] bg-white text-[#0F1419] hover:border-[#0F1419] hover:bg-[#0F1419] hover:text-white'
      }`}>
        {cta}
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

/* ═══════════════════════════ FAQ ═══════════════════════════ */
function FaqSection() {
  const faqs = [
    {
      q: 'Biz çok küçük bir işletmeyiz, 6 kişilik kafeyim — UpCore bana fazla gelmez mi?',
      a: 'Hayır, tam tersine — Micro planımız zaten 1-10 çalışanlı mikro işletmeler için tasarlandı. Yıllık ₺1.900 sabit ücret (çalışan başı değil, toplam). 5 dakikada kurulur, WhatsApp destek hattımız sorularınızı cevaplar. Kafe sahibi ile holding CHRO\'nun ihtiyacı farklı, biz ikisini de düşündük.',
    },
    {
      q: 'SAP SuccessFactors veya Oracle HCM kullanıyoruz · geçişte verilerimiz kaybolur mu?',
      a: 'Hayır, tam tersini garanti ediyoruz: ücretsiz veri taşıma hizmetimiz var. Mevcut sisteminizden çalışan kayıtları, işe alım geçmişi, izin bakiyeleri, bordro tarihçesi hepsi tam olarak UpCore\'a aktarılır. Ortalama 2 hafta sürer. 14 gün ücretsiz paralel çalıştırma periyodunda hiçbir şey kaybetmezsiniz · eski sistemi bir süre daha açık tutabilirsiniz.',
    },
    {
      q: 'Çalışanlarımızın bu anket sistemiyle gizliliği korunuyor mu? Yönetici göremesin diye nasıl emin olacağız?',
      a: 'Bu bizim en sert taahhüdümüz. Sözleşmemizde yazılı: Yöneticiler bireysel çalışan skorunu teknik olarak göremez. Departman bazlı sonuçlar sadece en az 5 kişi anket doldurmuşsa gösterilir (aksi halde bir kişi kolayca belirlenebilirdi). Anket yanıtlarında IP adresi ve kullanıcı kimliği saklanmaz — sadece yanıt kayıtlı. Her yönetici erişimi log\'lanır, şüpheli desenler alarm verir. Ayrıca: bu veriler performans değerlendirmesinde kullanılamaz, bu da sözleşmede.',
    },
    {
      q: 'Tükenmişlik ölçmek için kullandığınız BAT-TR ölçeği ne kadar güvenilir?',
      a: 'Bilimsel olarak çok güvenilir. BAT-TR, Belçikalı Prof. Wilmar Schaufeli\'nin 2019\'da geliştirdiği yeni nesil ölçeğin Türkçe versiyonu. Türkiye\'de Doç. Dr. Mevra Koçak 2022\'de 2.778 Türk çalışanda test etti, güvenilirlik skoru α=0.85+ çıktı (0.70 üstü "yüksek", 0.85 üstü "çok yüksek" kabul edilir). Sonuçlar uluslararası bir dergide peer-reviewed olarak yayınlandı. DOI linkini /bilimsel-temel sayfasında görebilirsiniz.',
    },
    {
      q: 'Veriler nerede tutuluyor? Yurt dışına gidiyor mu?',
      a: 'Şu an veriler Azure\'un Avrupa (Amsterdam) merkezinde + İrlanda yedeğinde tutuluyor. Bu AB\'de ve KVKK tarafından onaylı bir lokasyon · zaten banka sektörü dahil birçok Türk şirketi aynı merkezleri kullanır. 2026 Q3\'te Microsoft Azure Türkiye veri merkezi açılıyor, o zaman opsiyonel olarak verilerinizi Türkiye\'ye de taşıyabileceksiniz.',
    },
    {
      q: 'Kendi kendime mi kurarım, yoksa sizin ekibiniz mi kuruyor?',
      a: 'İki seçenek: (1) Starter/Professional planda "kendi kendine kurulum" — 14 gün ücretsiz deneme içinde sandbox\'ta deneyebilirsiniz, sonra tek tıkla aktif olur. (2) Enterprise planda size özel bir Müşteri Başarı Yöneticisi atanır (4 hafta süren bir onboarding programı, sizin ofise gelip eğitim dahil). KOBİ planı arasında değil — direkt 5 dakikada kendiniz kurarsınız, WhatsApp desteğimiz yanınızda.',
    },
  ];
  return (
    <section className="border-b border-[#E5E7EB] bg-white">
      <div className="mx-auto max-w-[1000px] px-6 py-20 md:py-24">
        <div className="mb-12 max-w-3xl">
          <SectionLabel>Sık Sorulan Sorular</SectionLabel>
          <SectionTitle>Platform ve lisanslama</SectionTitle>
        </div>
        <div className="overflow-hidden rounded-md border border-[#E5E7EB] bg-white">
          {faqs.map((f, idx) => (
            <details
              key={f.q}
              className={`group ${idx > 0 ? 'border-t border-[#E5E7EB]' : ''}`}
            >
              <summary className="flex cursor-pointer items-start justify-between gap-4 px-6 py-5 text-[14.5px] font-semibold text-[#0F1419] transition-colors hover:bg-[#F9FAFB] marker:hidden [&::-webkit-details-marker]:hidden">
                <span>{f.q}</span>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center border border-[#D1D5DB] font-mono text-[14px] text-[#4B5563] transition-transform group-open:rotate-45">+</span>
              </summary>
              <div className="border-t border-[#F3F4F6] bg-[#F9FAFB] px-6 py-5">
                <p className="text-[13.5px] leading-[1.7] text-[#4B5563]">{f.a}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════ FINAL CTA ═══════════════════════════ */
function FinalCTA() {
  return (
    <section className="bg-[#0F1419]">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
          <div>
            <div className="mb-6 flex items-center gap-3">
              <span className="h-px w-10 bg-[#FF5400]" />
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#FF5400]">
                Sonraki Adım
              </p>
            </div>
            <h2 className="font-display text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-white md:text-[44px]">
              Kurumunuza özel ürün demosu planlayın
            </h2>
            <p className="mt-5 max-w-[520px] text-[15px] leading-[1.65] text-white/70">
              45 dakikalık canlı ürün incelemesi; çalışan sayınız, mevcut sistemleriniz ve öncelikli süreçlerinize göre yapılandırılmış bir demo sunumunu içerir. Teknik ve satış ekibimiz görüşmeye birlikte katılır.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-2">
              <Link href="/demo" className="inline-flex h-10 items-center gap-2 rounded-md bg-[#FF5400] px-5 text-[13px] font-semibold text-white transition-colors hover:bg-white hover:text-[#0F1419]">
                Demo Talep Et
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link href="/iletisim" className="inline-flex h-10 items-center gap-2 rounded-md border border-white/20 bg-transparent px-5 text-[13px] font-semibold text-white transition-colors hover:border-white">
                Satış Ekibiyle Görüşme
              </Link>
            </div>
          </div>
          <div className="border border-white/10 bg-white/[0.02] p-8">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#FF5400]">Kurumsal İletişim</p>
            <div className="mt-6 space-y-4 text-[13px]">
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-white/50">Satış · Enterprise</p>
                <a href="mailto:satis@upcore.io" className="mt-1 block font-medium text-white hover:text-[#FF5400]">
                  satis@upcore.io
                </a>
              </div>
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-white/50">Güvenlik Anketi · RFP</p>
                <a href="mailto:security@upcore.io" className="mt-1 block font-medium text-white hover:text-[#FF5400]">
                  security@upcore.io
                </a>
              </div>
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-white/50">Merkez</p>
                <p className="mt-1 text-white/80">Maslak, Sarıyer / İstanbul</p>
              </div>
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-white/50">SLA Yanıt</p>
                <p className="mt-1 text-white/80">Mesai saatleri · ortalama 3 saat</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════ LIFECYCLE ═══════════════════════════ */
function LifecycleSection() {
  const phases = [
    { icon: Search, title: 'Keşif', desc: 'Kariyer portali · marka yönetimi · aday havuzu', tone: '#374151' },
    { icon: Briefcase, title: 'Kazanım', desc: 'ATS · CV analizi · psikometrik · e-imza', tone: '#0F1419' },
    { icon: PlayCircle, title: 'Adaptasyon', desc: 'Checklist · mentor · 30/60/90 değerlendirme', tone: '#374151' },
    { icon: Gauge, title: 'Sürdürme', desc: 'BAT-TR · UWES · risk haritası · erken uyarı', tone: '#0F1419' },
    { icon: Sparkles, title: 'Gelişim', desc: 'VIA · PsyCap · LMS · sertifika', tone: '#374151' },
    { icon: Route, title: 'Yerleştirme', desc: 'İç ilan · rotasyon · yedek planlama', tone: '#0F1419' },
    { icon: Shield, title: 'Koruma', desc: '20+ müdahale · etki ölçümü · destek', tone: '#374151' },
    { icon: LogOut, title: 'Ayrılış', desc: 'Exit interview · SGK · 5 yıl arşiv', tone: '#0F1419' },
  ];
  return (
    <section className="border-b border-[#E5E7EB] bg-white">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
        <div className="mb-16 max-w-3xl">
          <SectionLabel>Çalışan Yaşam Döngüsü</SectionLabel>
          <SectionTitle>Sekiz aşamalı yaşam döngüsü yönetimi</SectionTitle>
          <SectionLead>
            Keşiften ayrılışa kadar sekiz aşamanın tamamı ortak veri modeli üzerinde işletilir. Her aşamadaki veri bir sonraki aşamaya otomatik aktarılır.
          </SectionLead>
        </div>

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-[#E5E7EB] md:grid-cols-4 lg:grid-cols-8" style={{ backgroundColor: '#E5E7EB' }}>
          {phases.map((p, i) => (
            <div key={p.title} className="bg-white p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">
                  0{i + 1}
                </span>
                <div className="flex h-7 w-7 items-center justify-center border border-[#E5E7EB] bg-[#F9FAFB]">
                  <p.icon className="h-3.5 w-3.5 text-[#374151]" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="font-display text-[13.5px] font-semibold tracking-tight text-[#0F1419]">{p.title}</h3>
              <p className="mt-1.5 text-[11px] leading-[1.5] text-[#6B7280]">{p.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-[#E5E7EB] md:grid-cols-4" style={{ backgroundColor: '#E5E7EB' }}>
          <LifecycleStat value="~90 gün" label="Ortalama adaptasyon süresi" />
          <LifecycleStat value="%12" label="Yüksek risk eşiği (BAT-TR)" />
          <LifecycleStat value="8 hafta" label="Müdahale döngüsü" />
          <LifecycleStat value="5 yıl" label="Arşiv saklama süresi" />
        </div>
      </div>
    </section>
  );
}

function LifecycleStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-white p-5">
      <div className="font-display text-[20px] font-semibold tracking-[-0.015em] text-[#0F1419]">{value}</div>
      <div className="mt-2 font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-[#6B7280]">{label}</div>
    </div>
  );
}

/* ═══════════════════════════ SIMULATOR ═══════════════════════════ */
function SimulatorSection() {
  return (
    <section className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
        <div className="mb-12 max-w-3xl">
          <SectionLabel>İnteraktif Simülasyon</SectionLabel>
          <SectionTitle>JD-R + BAT-TR modeli canlı örneği</SectionTitle>
          <SectionLead>
            Platformun gerçek tükenmişlik tahmin modelinin parametrelerini ayarlayın. İş Talepleri-Kaynakları çerçevesine göre risk skoru ve otomatik müdahale önerilerinin nasıl üretildiğini gözlemleyin.
          </SectionLead>
        </div>
        <BurnoutSimulator />
      </div>
    </section>
  );
}

/* ═══════════════════════════ USE CASES ═══════════════════════════ */
function UseCaseSection() {
  return (
    <section className="border-b border-[#E5E7EB] bg-white">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
        <div className="mb-12 max-w-3xl">
          <SectionLabel>Rol-Bazlı Kullanım</SectionLabel>
          <SectionTitle>Paydaş bazında platform görünümü</SectionTitle>
          <SectionLead>
            Platform; İnsan Kaynakları Direktörü, Finans Direktörü, birim yöneticisi ve çalışan olmak üzere dört temel rol için özelleştirilmiş arayüzler sunar.
          </SectionLead>
        </div>
        <UseCaseTabs />
      </div>
    </section>
  );
}

/* ═══════════════════════════ COMPARISON ═══════════════════════════ */
function ComparisonSection() {
  const rows = [
    { feature: 'Bilimsel psikometrik (BAT-TR, UWES, JD-R)', upcore: true, sap: false, workday: false, bordrocep: false },
    { feature: 'Türkiye kanun entegrasyonu (657/4857/4B)', upcore: true, sap: 'partial', workday: 'partial', bordrocep: true },
    { feature: 'SGK e-Bildirge + muhtasar + İşsizlik', upcore: true, sap: 'partial', workday: false, bordrocep: true },
    { feature: 'KVKK uyum paketi + VERBIS + DPIA', upcore: true, sap: 'partial', workday: 'partial', bordrocep: false },
    { feature: 'ML tükenmişlik erken uyarı', upcore: true, sap: false, workday: 'partial', bordrocep: false },
    { feature: 'Güçlü yönler (VIA) + PsyCap + Job Crafting', upcore: true, sap: false, workday: false, bordrocep: false },
    { feature: 'Multi-entity holding yapısı', upcore: true, sap: true, workday: true, bordrocep: false },
    { feature: 'Türkçe kullanıcı deneyimi + destek', upcore: true, sap: 'partial', workday: 'partial', bordrocep: true },
    { feature: 'Mikro işletme (1-10) yıllık sabit ücret', upcore: true, sap: false, workday: false, bordrocep: 'partial' },
    { feature: 'Executive dashboard (CHRO/CFO)', upcore: true, sap: true, workday: true, bordrocep: false },
    { feature: 'Azure TR veri merkezi + ISO 27001', upcore: true, sap: false, workday: false, bordrocep: false },
    { feature: 'Başlangıç fiyatı (100 çalışan, yıllık)', upcore: '₺34.8K', sap: '₺320K+', workday: '₺450K+', bordrocep: '₺48K' },
  ];

  return (
    <section className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
        <div className="mb-12 max-w-3xl">
          <SectionLabel>Rekabet Karşılaştırması</SectionLabel>
          <SectionTitle>Piyasa alternatifleriyle fonksiyonel kıyaslama</SectionTitle>
          <SectionLead>
            Global kurumsal İK çözümleri ile yerel bordro sistemleri karşısında UpCore&apos;un fonksiyonel ve fiyatsal konumu. Kaynaklar SAP 2024 liste fiyatı, Workday Türkiye teklifi ve kamuya açık yerel tarifeler üzerinden alınmıştır.
          </SectionLead>
        </div>

        <div className="overflow-x-auto rounded-md border border-[#E5E7EB] bg-white">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <th className="w-[42%] px-5 py-4 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4B5563]">Özellik</th>
                <th className="px-5 py-4 text-center">
                  <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#FF5400]">UpCore</div>
                  <div className="mt-1 text-[10px] text-[#9CA3AF]">Bilim-temelli İK</div>
                </th>
                <th className="px-5 py-4 text-center">
                  <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#374151]">SAP SuccessFactors</div>
                  <div className="mt-1 text-[10px] text-[#9CA3AF]">Global HCM</div>
                </th>
                <th className="px-5 py-4 text-center">
                  <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#374151]">Workday HCM</div>
                  <div className="mt-1 text-[10px] text-[#9CA3AF]">Global HCM</div>
                </th>
                <th className="px-5 py-4 text-center">
                  <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#374151]">BordroCep</div>
                  <div className="mt-1 text-[10px] text-[#9CA3AF]">Yerel bordro</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.feature} className={`border-b border-[#F3F4F6] last:border-0 ${idx === rows.length - 1 ? 'bg-[#FFFBEB]' : ''}`}>
                  <td className="px-5 py-3.5 text-[12.5px] font-medium text-[#0F1419]">{r.feature}</td>
                  <CompCell value={r.upcore} highlight />
                  <CompCell value={r.sap} />
                  <CompCell value={r.workday} />
                  <CompCell value={r.bordrocep} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-5 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[#6B7280]">
          Kaynak: SAP 2024 list price · Workday TR quote (anonim) · BordroCep web · UpCore internal · 100 çalışan yıllık baz
        </p>
      </div>
    </section>
  );
}

function CompCell({ value, highlight }: { value: boolean | 'partial' | string; highlight?: boolean }) {
  if (value === true) {
    return (
      <td className={`px-5 py-3.5 text-center ${highlight ? 'bg-[#FFFBEB]' : ''}`}>
        <CheckCircle2 className="mx-auto h-4 w-4 text-[#059669]" strokeWidth={1.8} />
      </td>
    );
  }
  if (value === false) {
    return (
      <td className="px-5 py-3.5 text-center">
        <X className="mx-auto h-4 w-4 text-[#D1D5DB]" strokeWidth={1.8} />
      </td>
    );
  }
  if (value === 'partial') {
    return (
      <td className="px-5 py-3.5 text-center">
        <Minus className="mx-auto h-4 w-4 text-[#D97706]" strokeWidth={1.8} />
      </td>
    );
  }
  return (
    <td className={`px-5 py-3.5 text-center font-mono text-[12px] font-semibold ${highlight ? 'bg-[#FFFBEB] text-[#FF5400]' : 'text-[#374151]'}`}>
      {value}
    </td>
  );
}

/* ═══════════════════════════ ROI ═══════════════════════════ */
function RoiSection() {
  return (
    <section className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
        <div className="mb-12 max-w-3xl">
          <SectionLabel>Yatırım Getirisi Analizi</SectionLabel>
          <SectionTitle>Kurumsal ROI projeksiyonu</SectionTitle>
          <SectionLead>
            Çalışan sayısı, İK ekip büyüklüğü ve ortalama ücret parametreleri üzerinden hesaplanan yıllık tasarruf ve verimlilik projeksiyonu. Hesaplama modeli McKinsey ve Gartner bağımsız araştırma raporlarına dayanır.
          </SectionLead>
        </div>
        <RoiCalculator />
      </div>
    </section>
  );
}

/* ═══════════════════════════ CASE STUDIES ═══════════════════════════ */
function CaseStudiesSection() {
  const studies = [
    {
      client: 'Samsun Büyükşehir Belediyesi',
      segment: 'Kamu · 12.000 çalışan',
      color: '#5E5CE6',
      challenge: 'Zabıta ve temizlik birimlerinde turnover %45, BAT-TR ölçümü yok, Excel tabanlı personel yönetimi.',
      approach: '657/4B/4857 tüm personel tipleri tek tenant + haftalık anonim BAT-TR pulse + yüksek riskli birim için Koruma Protokol-03.',
      results: [
        { metric: '8 hafta', label: 'içinde BAT-TR ortalama %15 düştü' },
        { metric: '%22', label: 'turnover azalması (6 ay)' },
        { metric: '₺4.2M', label: 'yıllık tasarruf (turnover + verimlilik)' },
      ],
    },
    {
      client: 'Anadolu Grup (anonim)',
      segment: 'Holding · 18 şirket · 24.000 çalışan',
      color: '#FF5400',
      challenge: 'Şirketler arası çalışan transferlerinde veri kaybı, CHRO dashboard\'u yok, 18 farklı bordro sistemi.',
      approach: 'Multi-entity tenant + cross-company transfer iş akışı + konsolide CHRO dashboard + tek bordro motoru.',
      results: [
        { metric: '₺48M', label: 'yıllık IT/operasyon tasarrufu' },
        { metric: '4 saat', label: 'aylık konsolide bordro (önceden 3 hafta)' },
        { metric: '%89', label: 'CHRO dashboard kullanım oranı' },
      ],
    },
    {
      client: 'Kariyer teknoloji şirketi (anonim)',
      segment: 'Tech · 300K+ yıllık başvuru · 4.500 çalışan',
      color: '#10B981',
      challenge: 'Kariyer.net + LinkedIn\'den gelen başvurularda manuel screening, psikometrik değerlendirme ayrı platformda.',
      approach: 'Kariyer.net + LinkedIn webhook + bulk psikometrik (1.000/saat) + ATS→onboarding otomasyon + Daily.co video mülakat.',
      results: [
        { metric: '72%', label: 'screening süresi azalması' },
        { metric: '3.2x', label: 'İK recruiter başına başvuru kapasitesi' },
        { metric: '%94', label: 'yeni çalışan 90 gün kalma oranı' },
      ],
    },
  ];

  return (
    <section className="border-b border-[#E5E7EB] bg-white">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
        <div className="mb-12 max-w-3xl">
          <SectionLabel>Müşteri Vakaları</SectionLabel>
          <SectionTitle>Ölçülmüş uygulama sonuçları</SectionTitle>
          <SectionLead>
            Platform; kamu, holding ve yüksek hacimli şirket segmentlerinde üretim ortamında işletilmektedir. Aşağıda kamuya açık veya müşteri onayı ile anonim olarak paylaşılan üç pilot projenin metriği yer almaktadır.
          </SectionLead>
        </div>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-[#E5E7EB] lg:grid-cols-3" style={{ backgroundColor: '#E5E7EB' }}>
          {studies.map((s, i) => (
            <article key={s.client} className="flex flex-col bg-white">
              <div className="border-b border-[#E5E7EB] bg-[#F9FAFB] px-7 py-4">
                <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                  CASE.{String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-7">
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">
                  {s.segment}
                </p>
                <h3 className="mt-2 font-display text-[18px] font-semibold leading-tight tracking-tight text-[#0F1419]">
                  {s.client}
                </h3>
                <div className="mt-5 space-y-4 border-t border-[#E5E7EB] pt-5">
                  <div>
                    <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">Sorun</p>
                    <p className="mt-1.5 text-[12.5px] leading-[1.6] text-[#374151]">{s.challenge}</p>
                  </div>
                  <div>
                    <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">Çözüm Mimarisi</p>
                    <p className="mt-1.5 text-[12.5px] leading-[1.6] text-[#374151]">{s.approach}</p>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden border border-[#E5E7EB]" style={{ backgroundColor: '#E5E7EB' }}>
                  {s.results.map((r) => (
                    <div key={r.label} className="bg-[#F9FAFB] p-3">
                      <div className="font-display text-[17px] font-semibold leading-none tracking-[-0.015em] text-[#0F1419]">{r.metric}</div>
                      <div className="mt-1.5 text-[10px] leading-snug text-[#6B7280]">{r.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6B7280]">
            Kamuya açık pilot · Müşteri onaylı anonim metrikler
          </p>
          <Link href="/musteriler" className="inline-flex items-center gap-2 text-[12.5px] font-semibold text-[#0F1419] hover:text-[#FF5400]">
            Tüm müşteri vakaları
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════ RESOURCES ═══════════════════════════ */
function ResourcesSection() {
  const resources = [
    { type: 'Whitepaper', icon: BookOpen, title: 'BAT-TR Validasyon Raporu', desc: '1.200+ Türk çalışan örnekleminde BAT-12-TR\'nin psikometrik özellikleri: α, test-retest, faktör yapısı.', length: '32 sayfa · PDF' },
    { type: 'Makale', icon: Newspaper, title: 'JD-R 2.0 — Dijital çağda iş talepleri', desc: 'Uzaktan çalışma, platform ekonomisi ve sürekli bağlantılılığın JD-R modeline etkisi.', length: '12 dk okuma' },
    { type: 'Webinar', icon: Video, title: 'KOBİ\'den Holding\'e İK Dijitalleşme', desc: 'Farklı büyüklükteki kurumlarda İK teknoloji adaptasyonu — sık yapılan 7 hata.', length: '45 dk · Canlı' },
    { type: 'Rehber', icon: FileText, title: 'KVKK + VERBIS 2026 Kılavuzu', desc: 'Yeni yönetmelik değişiklikleri sonrası çalışan verisi yönetimi için pratik checklist.', length: '18 sayfa · PDF' },
  ];
  return (
    <section className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
        <div className="mb-12 max-w-3xl">
          <SectionLabel>Kaynak Kütüphanesi</SectionLabel>
          <SectionTitle>Akademik ve uygulama dokümanları</SectionTitle>
          <SectionLead>
            Psikometrik validasyon raporları, iş psikolojisi makaleleri, uygulama rehberleri ve kurumsal eğitim materyalleri. Üyelik gerekmez.
          </SectionLead>
        </div>
        <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-[#E5E7EB] md:grid-cols-2 lg:grid-cols-4" style={{ backgroundColor: '#E5E7EB' }}>
          {resources.map((r, i) => (
            <article key={r.title} className="group flex flex-col bg-white p-6 transition-colors hover:bg-[#F9FAFB]">
              <div className="mb-5 flex items-center justify-between">
                <div className="flex h-8 w-8 items-center justify-center border border-[#E5E7EB] bg-[#F9FAFB]">
                  <r.icon className="h-3.5 w-3.5 text-[#374151]" strokeWidth={1.5} />
                </div>
                <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                  R.{String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">{r.type}</p>
              <h3 className="mt-2 font-display text-[14.5px] font-semibold leading-tight tracking-tight text-[#0F1419]">{r.title}</h3>
              <p className="mt-2 flex-1 text-[12px] leading-[1.6] text-[#4B5563]">{r.desc}</p>
              <div className="mt-5 flex items-center justify-between border-t border-[#E5E7EB] pt-3 font-mono text-[10px] font-semibold uppercase tracking-[0.1em]">
                <span className="text-[#9CA3AF]">{r.length}</span>
                <span className="inline-flex items-center gap-1 text-[#0F1419] group-hover:text-[#FF5400]">
                  İndir
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════ VISUAL BLOCKS ═══════════════════════════ */
function VisualsScienceBlock() {
  return (
    <section className="border-b border-[#E5E7EB] bg-white">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
        <div className="mb-12 max-w-3xl">
          <SectionLabel>Veri Görselleştirme</SectionLabel>
          <SectionTitle>Bilimsel metodolojinin arayüz yansıması</SectionTitle>
          <SectionLead>
            İş Talepleri-Kaynakları modelinin ve tükenmişlik risk haritasının canlı görselleştirmesi.
          </SectionLead>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <JDRBalanceVisual />
          <HeatmapVisual />
        </div>
      </div>
    </section>
  );
}

function IntegrationFlowBlock() {
  return (
    <section className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
      <div className="mx-auto max-w-[1200px] px-6 py-20">
        <IntegrationFlowVisual />
      </div>
    </section>
  );
}

function VisualsSecurityBlock() {
  return (
    <section className="border-b border-[#E5E7EB] bg-white">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
        <div className="mb-12 max-w-3xl">
          <SectionLabel>Güvenlik Mimarisi</SectionLabel>
          <SectionTitle>Çok katmanlı savunma yapısı</SectionTitle>
          <SectionLead>
            Çalışan verisine erişim; ağ, kimlik, yetkilendirme ve şifreleme olmak üzere dört bağımsız katmanla korunur.
          </SectionLead>
        </div>
        <SecurityLayersVisual />
      </div>
    </section>
  );
}

function RecoveryChartBlock() {
  return (
    <section className="border-b border-[#F0F0F0] bg-[#FAFAFA]">
      <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <SectionLabel>Pilot Sonuçları</SectionLabel>
            <SectionTitle>8 haftalık müdahale programı çıktıları</SectionTitle>
            <p className="mt-5 text-[14px] leading-[1.65] text-[#4B5563]">
              Samsun Büyükşehir Belediyesi zabıta ekibinde yürütülen 8 haftalık müdahale programının sonuçları. Tükenmişlik skoru <strong className="font-semibold text-[#0F1419]">3.5&apos;ten 1.9&apos;a</strong> gerilemiş, Cohen&apos;s d=0.58 ile &quot;büyük etki&quot; kategorisinde istatistiksel anlamlılık elde edilmiştir.
            </p>
            <div className="mt-6 grid grid-cols-3 gap-px overflow-hidden rounded-md border border-[#E5E7EB]" style={{ backgroundColor: '#E5E7EB' }}>
              <div className="bg-white p-4">
                <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">Turnover</p>
                <p className="mt-2 font-display text-[18px] font-semibold tracking-[-0.015em] text-[#0F1419]">−%22</p>
              </div>
              <div className="bg-white p-4">
                <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">Yıllık Tasarruf</p>
                <p className="mt-2 font-display text-[18px] font-semibold tracking-[-0.015em] text-[#0F1419]">₺4.2M</p>
              </div>
              <div className="bg-white p-4">
                <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#9CA3AF]">Etki Büyüklüğü</p>
                <p className="mt-2 font-display text-[18px] font-semibold tracking-[-0.015em] text-[#0F1419]">d=0.58</p>
              </div>
            </div>
          </div>
          <RecoveryChartVisual />
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════ SHARED BITS ═══════════════════════════ */
function SectionLabel({ children, inverted }: { children: React.ReactNode; inverted?: boolean }) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <span className={`h-px w-10 ${inverted ? 'bg-[#FF5400]' : 'bg-[#FF5400]'}`} />
      <p className={`font-mono text-[10px] font-semibold uppercase tracking-[0.18em] ${inverted ? 'text-[#FF5400]' : 'text-[#374151]'}`}>{children}</p>
    </div>
  );
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-[32px] font-semibold leading-[1.1] tracking-[-0.02em] text-[#0F1419] md:text-[44px]">{children}</h2>;
}
function SectionLead({ children }: { children: React.ReactNode }) {
  return <p className="mt-5 max-w-[680px] text-[15px] leading-[1.65] text-[#4B5563]">{children}</p>;
}
