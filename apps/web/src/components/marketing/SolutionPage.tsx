import Link from 'next/link';
import { ArrowRight, ArrowUpRight, type LucideIcon } from 'lucide-react';

const SEGMENT_CODE_MAP: Record<string, string> = {
  kobi: 'SOL-01',
  belediye: 'SOL-02',
  holding: 'SOL-03',
  ats: 'SOL-04',
};

const SEGMENT_LABEL_MAP: Record<string, string> = {
  kobi: 'KOBİ · Mikro İşletme',
  belediye: 'Kamu · Belediye',
  holding: 'Holding · Çoklu Şirket',
  ats: 'Yüksek Hacimli İşe Alım',
};

export interface SolutionContent {
  segment: 'kobi' | 'belediye' | 'holding' | 'ats';
  title: string;
  tagline: string;
  heroKpi: Array<{ value: string; label: string }>;
  painPoints: Array<{ title: string; desc: string }>;
  upcoreFit: Array<{ title: string; desc: string }>;
  testimonial?: { quote: string; who: string; role: string };
  relevantModules: Array<{ title: string; href: string; desc: string }>;
  pricingNote: string;
  icon: LucideIcon;
  accent: string;
}

export function SolutionPage({ content }: { content: SolutionContent }) {
  const Icon = content.icon;
  const code = SEGMENT_CODE_MAP[content.segment] ?? 'SOL';
  const segmentLabel = SEGMENT_LABEL_MAP[content.segment] ?? content.segment;

  return (
    <div className="bg-white text-[#0F1419]">
      {/* ─────────────── Hero ─────────────── */}
      <section className="relative overflow-hidden border-b border-[#E5E7EB] bg-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: 'linear-gradient(0deg, #000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative mx-auto max-w-[1200px] px-6 pt-16 pb-16 md:pt-20">
          <nav className="mb-8 flex items-center gap-2 font-mono text-[10.5px] font-medium text-[#6B7280]">
            <Link href="/" className="hover:text-[#0F1419]">Ana Sayfa</Link>
            <span className="text-[#D1D5DB]">/</span>
            <span className="hover:text-[#0F1419]">Çözümler</span>
            <span className="text-[#D1D5DB]">/</span>
            <span className="uppercase tracking-[0.08em] text-[#0F1419]">{code}</span>
          </nav>

          <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr] lg:items-start">
            <div>
              <div className="mb-6 inline-flex items-center gap-2.5 border border-[#E5E7EB] bg-white px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4B5563]">
                <span className="flex h-5 w-5 items-center justify-center border border-[#E5E7EB] bg-[#F9FAFB]">
                  <Icon className="h-3 w-3 text-[#374151]" strokeWidth={1.5} />
                </span>
                Çözüm · {code} · {segmentLabel}
              </div>
              <h1 className="font-display text-[40px] font-semibold leading-[1.08] tracking-[-0.02em] text-[#0F1419] md:text-[54px]">
                {content.title}
              </h1>
              <p className="mt-6 max-w-[600px] text-[15.5px] leading-[1.65] text-[#4B5563]">
                {content.tagline}
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                <Link
                  href="/demo"
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-[#0F1419] px-5 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#FF5400]"
                >
                  Segment Demosu Talep Et
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/fiyatlandirma"
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-[#D1D5DB] bg-white px-5 text-[12.5px] font-semibold text-[#0F1419] transition-colors hover:border-[#0F1419]"
                >
                  Lisans Detayları
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-[#E5E7EB]" style={{ backgroundColor: '#E5E7EB' }}>
              {content.heroKpi.map((k, i) => (
                <div key={k.label} className="bg-white p-5">
                  <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                    K.{String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="mt-3 font-display text-[24px] font-semibold leading-none tracking-[-0.015em] text-[#0F1419]">{k.value}</p>
                  <p className="mt-2 text-[11px] leading-[1.4] text-[#6B7280]">{k.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── Pain Points ─────────────── */}
      <section className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
          <div className="mb-12 max-w-3xl">
            <Label>Mevcut Durum Analizi</Label>
            <H2>Bu segmentin tipik İK sorunları</H2>
            <Lead>
              Bu segmentin kurum ve işletme yapısında en sık karşılaşılan operasyonel, uyumluluk ve veri yönetimi sorunları.
            </Lead>
          </div>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-[#E5E7EB] md:grid-cols-2" style={{ backgroundColor: '#E5E7EB' }}>
            {content.painPoints.map((p, i) => (
              <div key={i} className="bg-white p-7">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                    P.{String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#DC2626]">
                    Sorun
                  </span>
                </div>
                <h3 className="font-display text-[15.5px] font-semibold tracking-tight text-[#0F1419]">{p.title}</h3>
                <p className="mt-2 text-[13px] leading-[1.65] text-[#4B5563]">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── UpCore Fit ─────────────── */}
      <section className="border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
          <div className="mb-12 max-w-3xl">
            <Label>Çözüm Mimarisi</Label>
            <H2>UpCore&apos;un bu segment için sunduğu çözümler</H2>
          </div>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-[#E5E7EB] md:grid-cols-2" style={{ backgroundColor: '#E5E7EB' }}>
            {content.upcoreFit.map((f, i) => (
              <article key={i} className="bg-white p-7">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                    C.{String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="h-1 w-6" style={{ backgroundColor: content.accent }} />
                </div>
                <h3 className="font-display text-[15.5px] font-semibold tracking-tight text-[#0F1419]">{f.title}</h3>
                <p className="mt-2 text-[13px] leading-[1.65] text-[#4B5563]">{f.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── Testimonial ─────────────── */}
      {content.testimonial && (
        <section className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
          <div className="mx-auto max-w-[1000px] px-6 py-16">
            <div className="grid gap-8 md:grid-cols-[auto_1fr] md:items-start">
              <div className="flex items-center gap-3">
                <span className="h-px w-10 bg-[#FF5400]" />
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#374151]">
                  Müşteri Referansı
                </p>
              </div>
              <blockquote className="border border-[#E5E7EB] bg-white p-8">
                <svg className="h-6 w-6 text-[#D1D5DB]" fill="currentColor" viewBox="0 0 32 32">
                  <path d="M9.352 4C4.456 7.456 1 13.12 1 18.688c0 4.416 2.688 7.04 5.824 7.04 2.944 0 5.12-2.304 5.12-5.12 0-2.688-1.92-4.736-4.416-4.736-.512 0-1.216.128-1.344.128 0 0 .128-1.472 1.024-3.904C7.968 9.92 10.144 7.744 11.744 6.592l-2.392-2.592zm15.808 0c-4.8 3.456-8.256 9.12-8.256 14.688 0 4.416 2.688 7.04 5.824 7.04 2.88 0 5.12-2.304 5.12-5.12 0-2.688-1.984-4.736-4.48-4.736-.512 0-1.216.128-1.344.128 0 0 .128-1.472 1.024-3.904.96-2.176 3.136-4.352 4.736-5.504L25.16 4z"/>
                </svg>
                <p className="mt-4 font-display text-[19px] leading-[1.5] text-[#0F1419]">
                  {content.testimonial.quote}
                </p>
                <footer className="mt-6 border-t border-[#F3F4F6] pt-4">
                  <p className="text-[13px] font-semibold text-[#0F1419]">{content.testimonial.who}</p>
                  <p className="mt-0.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#6B7280]">{content.testimonial.role}</p>
                </footer>
              </blockquote>
            </div>
          </div>
        </section>
      )}

      {/* ─────────────── Relevant Modules ─────────────── */}
      <section className="border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
          <div className="mb-12 max-w-3xl">
            <Label>Önerilen Modüller</Label>
            <H2>Bu segment için kritik fonksiyonlar</H2>
          </div>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-[#E5E7EB] md:grid-cols-3" style={{ backgroundColor: '#E5E7EB' }}>
            {content.relevantModules.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className="group flex flex-col bg-white p-7 transition-colors hover:bg-[#F9FAFB]"
              >
                <h3 className="font-display text-[15px] font-semibold tracking-tight text-[#0F1419] group-hover:text-[#FF5400]">{m.title}</h3>
                <p className="mt-2 flex-1 text-[12.5px] leading-[1.55] text-[#4B5563]">{m.desc}</p>
                <span className="mt-6 inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#FF5400]">
                  Modül Detayı
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── Pricing + CTA ─────────────── */}
      <section className="bg-[#0F1419]">
        <div className="mx-auto max-w-[1200px] px-6 py-20">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:items-start">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <span className="h-px w-10" style={{ backgroundColor: content.accent }} />
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: content.accent }}>
                  Lisanslama
                </p>
              </div>
              <h2 className="font-display text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-white md:text-[38px]">
                Bu segmente özel lisans yapılandırması
              </h2>
              <p className="mt-5 max-w-[520px] text-[14px] leading-[1.65] text-white/65">
                {content.pricingNote}
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                <Link
                  href="/demo"
                  className="inline-flex h-10 items-center gap-2 rounded-md px-5 text-[12.5px] font-semibold text-white transition-colors"
                  style={{ backgroundColor: content.accent }}
                >
                  Özel Teklif Talep Et
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/iletisim"
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-white/20 bg-transparent px-5 text-[12.5px] font-semibold text-white transition-colors hover:border-white"
                >
                  Satış Ekibiyle Görüşme
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
            <div className="border border-white/10 p-6">
              <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: content.accent }}>
                Segment Özeti
              </p>
              <dl className="mt-5 divide-y divide-white/10 text-[12px]">
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-white/50">Segment Kodu</dt>
                  <dd className="font-mono font-semibold uppercase text-white">{code}</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-white/50">Segment</dt>
                  <dd className="font-medium text-white">{segmentLabel}</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-white/50">Önerilen Lisans</dt>
                  <dd className="font-medium text-white">
                    {content.segment === 'kobi' ? 'Micro' : content.segment === 'holding' ? 'Enterprise' : 'Professional'}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-white/50">Yanıt SLA</dt>
                  <dd className="font-medium text-white">4 saat · mesai</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─────────────── Shared typography ─────────────── */
function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px w-10 bg-[#FF5400]" />
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#374151]">{children}</p>
    </div>
  );
}
function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-4 font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-[#0F1419] md:text-[40px]">
      {children}
    </h2>
  );
}
function Lead({ children }: { children: React.ReactNode }) {
  return <p className="mt-5 max-w-[680px] text-[14px] leading-[1.65] text-[#4B5563]">{children}</p>;
}
