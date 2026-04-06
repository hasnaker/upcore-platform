import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: "Upcore — Türkiye'nin İlk Bilim-Temelli İK Platformu",
  description: 'JD-R, BAT-TR, Job Crafting bazlı. Tükenmişliği öngör, müdahale et, karar ver.',
};

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-[#f0f0f0] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#111]">
              <span className="text-[11px] font-extrabold text-white">U</span>
            </div>
            <span className="text-[15px] font-bold text-[#111]">Upcore</span>
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            {[['Özellikler', '#features'], ['Fiyatlandırma', '#pricing'], ['Bilimsel Temel', '/bilimsel-temel']].map(([label, href]) => (
              <Link key={href} href={href!} className="text-[13px] font-medium text-[#666] transition-colors hover:text-[#111]">{label}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/giris" className="text-[13px] font-medium text-[#666] hover:text-[#111]">Giriş</Link>
            <Link href="/kayit" className="rounded-lg bg-[#111] px-4 py-2 text-[13px] font-semibold text-white transition-all hover:bg-[#333]">
              Ücretsiz Başla
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute right-[-200px] top-[-100px] h-[500px] w-[500px] rounded-full bg-[#5E5CE6] opacity-[0.04] blur-[80px]" />
        <div className="mx-auto max-w-6xl px-6 pb-20 pt-20 md:pt-28">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#eee] bg-[#fafafa] px-3 py-1 text-[11px] font-semibold text-[#888]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#5E5CE6]" />
              Peer-reviewed bilimsel temelde İK
            </div>
            <h1 className="mt-6 text-[44px] font-extrabold leading-[1.1] tracking-[-0.03em] text-[#111] md:text-[60px]">
              Tükenmişliği öngör.
              <br />
              <span className="text-[#5E5CE6]">Müdahale et.</span>
            </h1>
            <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-[#555]">
              JD-R modeli + BAT-TR ile çalışan tükenmişliğini 3 ay önceden tespit edin. Bilimsel müdahale önerileriyle harekete geçin.
            </p>
            <div className="mt-8 flex gap-3">
              <Link href="/kayit" className="inline-flex h-11 items-center gap-2 rounded-lg bg-[#111] px-6 text-[14px] font-semibold text-white shadow-sm transition-all hover:bg-[#333] hover:shadow-md">
                Ücretsiz Başla
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              </Link>
              <Link href="/iletisim" className="inline-flex h-11 items-center rounded-lg border border-[#e5e5e5] px-6 text-[14px] font-semibold text-[#333] transition-all hover:border-[#ccc] hover:shadow-sm">
                Demo İste
              </Link>
            </div>
            <p className="mt-5 text-[12px] text-[#aaa]">Kredi kartı gerekmez · 14 gün deneme · KVKK uyumlu</p>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-[#f0f0f0] bg-[#fafafa]">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-12 md:grid-cols-4">
          {[['6', 'Bilimsel çerçeve'], ['BAT-TR', 'Türkçe validate'], ['N=2.778', 'Validasyon örneklemi'], ['3 ay', 'Önceden tahmin']].map(([v, l]) => (
            <div key={l}><div className="text-[26px] font-bold tracking-tight text-[#111]">{v}</div><div className="mt-1 text-[13px] text-[#888]">{l}</div></div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-[32px] font-bold tracking-tight text-[#111]">Kolay İK&apos;nın yapamadığı her şey</h2>
            <p className="mt-3 text-[15px] text-[#666]">Sadece kayıt tutmak değil — bilimsel temelde insan sermayesi yönetimi.</p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { icon: '🔬', title: 'Tükenmişlik Tahmini', desc: 'BAT-12-TR haftalık pulse + JD-R modeli ile departman bazlı risk haritası. 3 ay önceden erken uyarı.', tag: 'Burnout Module' },
              { icon: '🎯', title: 'Psikometrik İşe Alım', desc: 'Aday-rol uyumu bilimsel skorlama. Big Five + PsyCap + JD-R fit analizi. Kötü işe alımı %40 azalt.', tag: 'Assessment Module' },
              { icon: '⚡', title: 'Aksiyon Merkezi', desc: 'AI-destekli günlük 3-5 karar önerisi. "Bugün ne yapmalıyım?" sorusuna bilimsel cevap.', tag: 'Action Center' },
              { icon: '📊', title: 'JD-R Denge Analizi', desc: 'Her pozisyon için talep/kaynak dengesi. Dengesizlik = tükenmişlik. Kaynak artırarak çöz.', tag: 'JD-R Engine' },
              { icon: '💡', title: 'Müdahale Önerileri', desc: 'Thompson Sampling ile kişiye özel koçluk/müdahale önerisi. Etkinlik %78.', tag: 'Intervention Engine' },
              { icon: '🏢', title: '4000+ Çalışan Ölçeği', desc: 'Belediye, holding, STK — binlerce çalışanla performanslı çalışır. Executive dashboard.', tag: 'Enterprise' },
            ].map((f) => (
              <div key={f.title} className="group rounded-xl border border-[#f0f0f0] bg-white p-6 transition-all hover:border-[#ddd] hover:shadow-sm">
                <div className="text-2xl">{f.icon}</div>
                <div className="mt-1 inline-block rounded-full bg-[#f5f5f5] px-2 py-0.5 text-[10px] font-semibold text-[#888]">{f.tag}</div>
                <h3 className="mt-3 text-[15px] font-semibold text-[#111]">{f.title}</h3>
                <p className="mt-2 text-[13px] leading-relaxed text-[#666]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="border-t border-[#f0f0f0] bg-[#fafafa] py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <h2 className="text-[32px] font-bold tracking-tight text-[#111]">Fiyatlandırma</h2>
            <p className="mt-3 text-[15px] text-[#666]">İhtiyacın olan modülü seç, fazlasını ödeme.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {[
              { name: 'Ücretsiz', price: '0', desc: '25 çalışana kadar', features: ['Core HRIS', 'Çalışan DB', 'İzin takibi', 'Org şema'], cta: 'Başla', pop: false },
              { name: 'Başlangıç', price: '1.500', desc: 'Aylık, ₺', features: ['Core HRIS', '+ Assessment', 'Psikometrik skorlama', 'Aday raporları'], cta: 'Dene', pop: false },
              { name: 'Profesyonel', price: '5.000', desc: 'Aylık, ₺', features: ['Tüm modüller', 'Burnout tahmini', 'Action Center', 'Müdahale önerileri'], cta: 'Dene', pop: true },
              { name: 'Kurumsal', price: 'Özel', desc: 'Belediye & Holding', features: ['Sınırsız çalışan', 'Executive dashboard', 'Dedicated destek', 'Custom entegrasyon'], cta: 'İletişim', pop: false },
            ].map((p) => (
              <div key={p.name} className={`relative rounded-xl border p-6 ${p.pop ? 'border-[#5E5CE6] bg-white shadow-md' : 'border-[#eee] bg-white'}`}>
                {p.pop && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#5E5CE6] px-3 py-0.5 text-[10px] font-bold text-white">Popüler</div>}
                <div className="text-[13px] font-semibold text-[#888]">{p.name}</div>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-[32px] font-bold text-[#111]">{p.price !== 'Özel' && '₺'}{p.price}</span>
                  {p.price !== 'Özel' && p.price !== '0' && <span className="text-[13px] text-[#888]">/ay</span>}
                </div>
                <div className="mt-1 text-[12px] text-[#aaa]">{p.desc}</div>
                <ul className="mt-5 flex flex-col gap-2.5">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-[13px] text-[#555]">
                      <svg className="h-4 w-4 shrink-0 text-[#5E5CE6]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/kayit" className={`mt-6 block rounded-lg py-2.5 text-center text-[13px] font-semibold transition-all ${p.pop ? 'bg-[#5E5CE6] text-white hover:bg-[#4B49C8]' : 'border border-[#e5e5e5] text-[#333] hover:bg-[#fafafa]'}`}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SCIENTIFIC */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#5E5CE6]">Bilimsel Temel</p>
          <h2 className="mt-3 text-[24px] font-bold text-[#111]">Peer-reviewed araştırmalarla desteklenen</h2>
          <div className="mx-auto mt-8 grid max-w-3xl gap-4 text-left md:grid-cols-2">
            {[
              { fw: 'JD-R Model', cite: 'Bakker & Demerouti (2007)', use: 'Burnout prediction' },
              { fw: 'BAT-12-TR', cite: 'Koçak, Gençay & Schaufeli (2022)', use: 'Burnout assessment' },
              { fw: 'COPSOQ-III-TR', cite: 'Şahan, Baydur & Demiral (2019)', use: 'JD-R pulse measurement' },
              { fw: 'Job Crafting', cite: 'Wrzesniewski & Dutton (2001)', use: 'Role optimization' },
            ].map((r) => (
              <div key={r.fw} className="rounded-lg border border-[#f0f0f0] p-4">
                <div className="text-[14px] font-semibold text-[#111]">{r.fw}</div>
                <div className="mt-1 text-[12px] text-[#888]">{r.cite}</div>
                <div className="mt-1 text-[12px] text-[#5E5CE6]">{r.use}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#f0f0f0] bg-[#111] py-16">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-[28px] font-bold text-white">Türkiye&apos;nin İK karar verme biçimini değiştirmeye hazır mısınız?</h2>
          <p className="mt-3 text-[15px] text-[#888]">14 gün ücretsiz deneyin. Kredi kartı gerekmez.</p>
          <Link href="/kayit" className="mt-8 inline-flex h-11 items-center gap-2 rounded-lg bg-[#5E5CE6] px-8 text-[14px] font-semibold text-white transition-all hover:bg-[#4B49C8]">
            Ücretsiz Başla
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#f0f0f0] py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-[#111]"><span className="text-[9px] font-extrabold text-white">U</span></div>
            <span className="text-[13px] text-[#aaa]">© 2026 Upcore</span>
          </div>
          <div className="flex gap-6 text-[12px] text-[#aaa]">
            <Link href="/bilimsel-temel" className="hover:text-[#666]">Bilimsel Temel</Link>
            <Link href="/iletisim" className="hover:text-[#666]">İletişim</Link>
            <span>KVKK Uyumlu</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
