import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#FAFAFA] border-b border-[#EDEDED]">
      {/* Subtle gradient accent */}
      <div
        className="pointer-events-none absolute -top-40 right-0 h-[600px] w-[600px] rounded-full opacity-[0.08]"
        style={{ background: 'radial-gradient(circle, #5E5CE6 0%, transparent 70%)' }}
        aria-hidden="true"
      />

      <div className="relative mx-auto w-full max-w-[1280px] px-6 py-20 md:py-28 lg:py-36">
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#EDEDED] bg-white px-3.5 py-1.5 text-[11px] font-semibold text-[#525252] shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-[#5E5CE6]" aria-hidden="true" />
            Bilim-temelli İK platformu
          </div>

          {/* Heading */}
          <h1 className="mt-8 text-[40px] font-extrabold leading-[1.08] tracking-tight text-[#0A0A0A] md:text-[56px] lg:text-[64px]">
            Türkiye&apos;nin İK
            <br />
            <span className="text-[#5E5CE6]">karar verme biçimini</span>
            <br />
            değiştiriyoruz.
          </h1>

          {/* Subtitle */}
          <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-[#525252] md:text-[18px]">
            JD-R modeli, BAT-TR, Job Crafting — peer-reviewed bilimsel çerçevelerle
            çalışan deneyimini ölç, tükenmişliği öngör, müdahale et. Tek platformdan.
          </p>

          {/* CTA */}
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/kayit"
              className="inline-flex h-12 items-center justify-center rounded-lg bg-[#0A0A0A] px-7 text-[14px] font-semibold text-white shadow-sm transition-all hover:bg-[#262626] hover:shadow-md"
            >
              Ücretsiz Başla
              <svg className="ml-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/iletisim"
              className="inline-flex h-12 items-center justify-center rounded-lg border border-[#EDEDED] bg-white px-7 text-[14px] font-semibold text-[#0A0A0A] transition-all hover:border-[#D4D4D4] hover:shadow-sm"
            >
              Demo İste
            </Link>
          </div>

          {/* Trust line */}
          <p className="mt-8 text-[12px] text-[#A3A3A3]">
            Kredi kartı gerekmez · 14 gün ücretsiz · KVKK uyumlu
          </p>
        </div>

        {/* Stats strip */}
        <div className="mt-16 grid grid-cols-2 gap-6 border-t border-[#EDEDED] pt-10 md:grid-cols-4">
          <div>
            <div className="text-[28px] font-bold tracking-tight text-[#0A0A0A]">6</div>
            <div className="mt-1 text-[13px] text-[#A3A3A3]">Bilimsel çerçeve</div>
          </div>
          <div>
            <div className="text-[28px] font-bold tracking-tight text-[#0A0A0A]">BAT-TR</div>
            <div className="mt-1 text-[13px] text-[#A3A3A3]">Türkçe validate edilmiş</div>
          </div>
          <div>
            <div className="text-[28px] font-bold tracking-tight text-[#0A0A0A]">N=2.778</div>
            <div className="mt-1 text-[13px] text-[#A3A3A3]">Validasyon örneklemi</div>
          </div>
          <div>
            <div className="text-[28px] font-bold tracking-tight text-[#5E5CE6]">0₺</div>
            <div className="mt-1 text-[13px] text-[#A3A3A3]">Lisans ücreti (BAT-TR)</div>
          </div>
        </div>
      </div>
    </section>
  );
}
