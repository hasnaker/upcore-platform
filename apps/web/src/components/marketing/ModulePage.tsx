import Link from 'next/link';
import { ArrowRight, ArrowUpRight, type LucideIcon } from 'lucide-react';

const CATEGORY_CODE_MAP: Record<string, string> = {
  'kazanim': 'TA-01',
  'surdurme': 'EE-01',
  'gelistirme': 'LD-01',
  'yerlestirme': 'PM-02',
  'koruma': 'EE-02',
  'calisan-yonetimi': 'HCM-01',
  'onboarding': 'TA-02',
  'performans': 'PM-01',
  'izin-mesai': 'OP-01',
  'bordro': 'OP-02',
  'egitim': 'LD-02',
  'kvkk-uyumu': 'GRC-01',
  'analitik': 'AN-01',
  'organizasyon': 'HCM-02',
};

export interface ModuleContent {
  category:
    | 'kazanim'
    | 'surdurme'
    | 'gelistirme'
    | 'yerlestirme'
    | 'koruma'
    | 'calisan-yonetimi'
    | 'onboarding'
    | 'performans'
    | 'izin-mesai'
    | 'bordro'
    | 'egitim'
    | 'kvkk-uyumu'
    | 'analitik'
    | 'organizasyon';
  title: string;
  tagline: string;
  intro: string;
  icon: LucideIcon;
  accent: string;
  heroStats?: Array<{ value: string; label: string }>;
  features: Array<{
    title: string;
    desc: string;
  }>;
  workflow?: Array<{ step: string; title: string; desc: string }>;
  outcomes?: Array<{ metric: string; value: string; desc: string }>;
  instruments: string[];
  useCases: Array<{
    segment: string;
    scenario: string;
  }>;
  comparison?: Array<{ feature: string; upcore: string; others: string }>;
  faq: Array<{ q: string; a: string }>;
  relatedModules?: Array<{ slug: string; title: string; desc: string }>;
}

export function ModulePage({ content }: { content: ModuleContent }) {
  const Icon = content.icon;
  const code = CATEGORY_CODE_MAP[content.category] ?? content.category.toUpperCase();

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
            <Link href="/moduller" className="hover:text-[#0F1419]">Modüller</Link>
            <span className="text-[#D1D5DB]">/</span>
            <span className="uppercase tracking-[0.08em] text-[#0F1419]">{code}</span>
          </nav>

          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2.5 border border-[#E5E7EB] bg-white px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4B5563]">
              <span className="flex h-5 w-5 items-center justify-center border border-[#E5E7EB] bg-[#F9FAFB]">
                <Icon className="h-3 w-3 text-[#374151]" strokeWidth={1.5} />
              </span>
              UpCore · {code} · Modül
            </div>
            <h1 className="font-display text-[40px] font-semibold leading-[1.08] tracking-[-0.02em] text-[#0F1419] md:text-[56px]">
              {content.title}
            </h1>
            <p className="mt-6 max-w-[620px] text-[15.5px] leading-[1.65] text-[#4B5563]">
              {content.tagline}
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              <Link
                href="/demo"
                className="inline-flex h-10 items-center gap-2 rounded-md bg-[#0F1419] px-5 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#FF5400]"
              >
                Modül Demosu Talep Et
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href="/fiyatlandirma"
                className="inline-flex h-10 items-center gap-2 rounded-md border border-[#D1D5DB] bg-white px-5 text-[12.5px] font-semibold text-[#0F1419] transition-colors hover:border-[#0F1419]"
              >
                Lisans Seçenekleri
              </Link>
            </div>
          </div>

          {content.heroStats && (
            <div className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-[#E5E7EB] lg:grid-cols-4" style={{ backgroundColor: '#E5E7EB' }}>
              {content.heroStats.map((s, i) => (
                <div key={s.label} className="bg-white p-6">
                  <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                    0{i + 1}
                  </span>
                  <div className="mt-3 font-display text-[28px] font-semibold leading-none tracking-[-0.015em] text-[#0F1419]">
                    {s.value}
                  </div>
                  <p className="mt-3 text-[11.5px] leading-[1.4] text-[#6B7280]">{s.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─────────────── Intro ─────────────── */}
      <section className="border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto max-w-[1000px] px-6 py-16">
          <Label>Modül Özeti</Label>
          <p className="mt-4 text-[17px] leading-[1.65] text-[#1F2937] md:text-[19px]">
            {content.intro}
          </p>
        </div>
      </section>

      {/* ─────────────── Features ─────────────── */}
      <section className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
          <div className="mb-12 max-w-3xl">
            <Label>Fonksiyonel Kapsam</Label>
            <H2>Modül özellikleri</H2>
          </div>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-[#E5E7EB] md:grid-cols-2" style={{ backgroundColor: '#E5E7EB' }}>
            {content.features.map((f, i) => (
              <article key={i} className="bg-white p-7">
                <div className="mb-5 flex items-center justify-between">
                  <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                    F.{String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="h-1 w-6" style={{ backgroundColor: content.accent }} />
                </div>
                <h3 className="font-display text-[16px] font-semibold leading-tight tracking-tight text-[#0F1419]">{f.title}</h3>
                <p className="mt-2 text-[13px] leading-[1.6] text-[#4B5563]">{f.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── Workflow ─────────────── */}
      {content.workflow && content.workflow.length > 0 && (
        <section className="border-b border-[#E5E7EB] bg-white">
          <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
            <div className="mb-12 max-w-3xl">
              <Label>Süreç Akışı</Label>
              <H2>Uygulama adımları</H2>
            </div>
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-[#E5E7EB] md:grid-cols-2 lg:grid-cols-3" style={{ backgroundColor: '#E5E7EB' }}>
              {content.workflow.map((w) => (
                <div key={w.step} className="relative bg-white p-7">
                  <div className="mb-4 flex items-baseline justify-between">
                    <span className="font-display text-[32px] font-semibold leading-none tracking-tight text-[#0F1419]">
                      {w.step}
                    </span>
                    <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: content.accent }}>
                      ADIM
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-[15px] font-semibold tracking-tight text-[#0F1419]">{w.title}</h3>
                  <p className="mt-2 text-[12.5px] leading-[1.6] text-[#4B5563]">{w.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─────────────── Outcomes ─────────────── */}
      {content.outcomes && content.outcomes.length > 0 && (
        <section className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
          <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
            <div className="mb-12 max-w-3xl">
              <Label>Müşteri Çıktıları</Label>
              <H2>Ölçülmüş sonuçlar</H2>
              <Lead>
                Üretimde olan müşterilerimizin ortalama değerleri. Detaylı vaka çalışmaları{' '}
                <Link href="/musteriler" className="underline underline-offset-2 hover:text-[#FF5400]">
                  müşteriler
                </Link>{' '}
                sayfasında yayımlanmıştır.
              </Lead>
            </div>
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-[#E5E7EB] md:grid-cols-3" style={{ backgroundColor: '#E5E7EB' }}>
              {content.outcomes.map((o, i) => (
                <div key={o.metric} className="bg-white p-7">
                  <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                    M.{String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="mt-3 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-[#6B7280]">{o.metric}</p>
                  <p className="mt-3 font-display text-[36px] font-semibold leading-none tracking-[-0.02em]" style={{ color: content.accent }}>
                    {o.value}
                  </p>
                  <p className="mt-4 text-[12px] leading-[1.6] text-[#4B5563]">{o.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─────────────── Comparison ─────────────── */}
      {content.comparison && content.comparison.length > 0 && (
        <section className="border-b border-[#E5E7EB] bg-white">
          <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
            <div className="mb-12 max-w-3xl">
              <Label>Rekabet Karşılaştırması</Label>
              <H2>UpCore ve piyasa alternatifleri</H2>
            </div>
            <div className="overflow-x-auto rounded-md border border-[#E5E7EB]">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                    <th className="px-5 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4B5563]">Özellik</th>
                    <th className="px-5 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: content.accent }}>UpCore</th>
                    <th className="px-5 py-3 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4B5563]">Alternatif</th>
                  </tr>
                </thead>
                <tbody>
                  {content.comparison.map((row, idx) => (
                    <tr key={row.feature} className={idx % 2 === 1 ? 'bg-[#F9FAFB]' : 'bg-white'}>
                      <td className="px-5 py-4 text-[12.5px] font-medium text-[#0F1419]">{row.feature}</td>
                      <td className="px-5 py-4 text-[12.5px] font-medium" style={{ color: content.accent }}>{row.upcore}</td>
                      <td className="px-5 py-4 text-[12.5px] text-[#6B7280]">{row.others}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ─────────────── Instruments ─────────────── */}
      {content.instruments.length > 0 && (
        <section className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
          <div className="mx-auto max-w-[1200px] px-6 py-16">
            <div className="grid gap-8 lg:grid-cols-[1fr_2fr] lg:items-start">
              <div>
                <Label>Bilimsel Temel</Label>
                <H3>Kullanılan ölçüm araçları</H3>
                <p className="mt-4 max-w-[380px] text-[13px] leading-[1.65] text-[#6B7280]">
                  Modülün dayandığı psikometrik ölçekler ve akademik referansları.{' '}
                  <Link href="/bilimsel-temel" className="font-semibold text-[#0F1419] underline underline-offset-2 hover:text-[#FF5400]">
                    Tam liste →
                  </Link>
                </p>
              </div>
              <ul className="grid gap-px overflow-hidden rounded-md border border-[#E5E7EB] sm:grid-cols-2" style={{ backgroundColor: '#E5E7EB' }}>
                {content.instruments.map((inst) => (
                  <li key={inst} className="bg-white px-5 py-4 text-[12.5px] text-[#1F2937]">
                    <span className="mr-2 inline-block h-1.5 w-1.5 translate-y-[-2px]" style={{ backgroundColor: content.accent }} />
                    {inst}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* ─────────────── Use Cases ─────────────── */}
      <section className="border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
          <div className="mb-12 max-w-3xl">
            <Label>Segment Uygulamaları</Label>
            <H2>Kullanım senaryoları</H2>
          </div>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-[#E5E7EB] md:grid-cols-3" style={{ backgroundColor: '#E5E7EB' }}>
            {content.useCases.map((uc, i) => (
              <div key={uc.segment} className="bg-white p-7">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                    U.{String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: content.accent }}>
                    {uc.segment}
                  </span>
                </div>
                <p className="mt-4 text-[13.5px] leading-[1.7] text-[#1F2937]">{uc.scenario}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── FAQ ─────────────── */}
      <section className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="mx-auto max-w-[1000px] px-6 py-20 md:py-24">
          <div className="mb-12 max-w-3xl">
            <Label>Sık Sorulan Sorular</Label>
            <H2>Modül ve uygulama</H2>
          </div>
          <div className="overflow-hidden rounded-md border border-[#E5E7EB] bg-white">
            {content.faq.map((f, idx) => (
              <details key={idx} className={`group ${idx > 0 ? 'border-t border-[#E5E7EB]' : ''}`}>
                <summary className="flex cursor-pointer items-start justify-between gap-4 px-6 py-5 text-[14px] font-semibold text-[#0F1419] transition-colors hover:bg-[#F9FAFB] marker:hidden [&::-webkit-details-marker]:hidden">
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

      {/* ─────────────── Related ─────────────── */}
      {content.relatedModules && content.relatedModules.length > 0 && (
        <section className="border-b border-[#E5E7EB] bg-white">
          <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
            <div className="mb-12 max-w-3xl">
              <Label>İlgili Modüller</Label>
              <H2>Platform entegrasyonu</H2>
            </div>
            <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-[#E5E7EB] md:grid-cols-3" style={{ backgroundColor: '#E5E7EB' }}>
              {content.relatedModules.map((r) => (
                <Link
                  key={r.slug}
                  href={`/moduller/${r.slug}`}
                  className="group flex items-start gap-4 bg-white p-7 transition-colors hover:bg-[#F9FAFB]"
                >
                  <div className="flex-1">
                    <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                      {CATEGORY_CODE_MAP[r.slug] ?? '—'}
                    </span>
                    <h3 className="mt-2 font-display text-[15px] font-semibold tracking-tight text-[#0F1419] group-hover:text-[#FF5400]">{r.title}</h3>
                    <p className="mt-1.5 text-[12.5px] leading-[1.55] text-[#4B5563]">{r.desc}</p>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[#9CA3AF] transition-transform group-hover:translate-x-0.5 group-hover:text-[#FF5400]" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─────────────── CTA ─────────────── */}
      <section className="bg-[#0F1419]">
        <div className="mx-auto max-w-[1200px] px-6 py-20">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <span className="h-px w-10" style={{ backgroundColor: content.accent }} />
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: content.accent }}>
                  Sonraki Adım
                </p>
              </div>
              <h2 className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-white md:text-[40px]">
                {content.title.split(' — ')[0]} modülü demosu planlayın
              </h2>
              <p className="mt-4 max-w-[520px] text-[14px] leading-[1.65] text-white/65">
                Kurumunuzun mevcut süreçlerine göre yapılandırılmış 45 dakikalık canlı ürün incelemesi.
                Teknik ve satış ekibimiz görüşmeye birlikte katılır.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                <Link
                  href="/demo"
                  className="inline-flex h-10 items-center gap-2 rounded-md px-5 text-[12.5px] font-semibold text-white transition-colors"
                  style={{ backgroundColor: content.accent }}
                >
                  Demo Talep Et
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/bilimsel-temel"
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-white/20 bg-transparent px-5 text-[12.5px] font-semibold text-white transition-colors hover:border-white"
                >
                  Bilimsel Temel
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
            <div className="border border-white/10 p-6">
              <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em]" style={{ color: content.accent }}>
                Modül Özeti
              </p>
              <dl className="mt-5 divide-y divide-white/10 text-[12px]">
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-white/50">Ürün Kodu</dt>
                  <dd className="font-mono font-semibold uppercase text-white">{code}</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-white/50">Lisans</dt>
                  <dd className="font-medium text-white">Starter / Professional / Enterprise</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-white/50">Ortalama Kurulum</dt>
                  <dd className="font-medium text-white">1 – 4 hafta</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-white/50">Dil</dt>
                  <dd className="font-medium text-white">Türkçe · İngilizce</dd>
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
function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-4 font-display text-[22px] font-semibold leading-[1.15] tracking-tight text-[#0F1419]">
      {children}
    </h3>
  );
}
function Lead({ children }: { children: React.ReactNode }) {
  return <p className="mt-5 max-w-[680px] text-[14px] leading-[1.65] text-[#4B5563]">{children}</p>;
}
