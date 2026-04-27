/* eslint-disable react/no-unknown-property */
// Saf sunucu komponenti — SVG + CSS animasyonlar kullanır, JS yok.

import React from 'react';

/**
 * JD-R Terazisi — İş Talepleri (sol) vs İş Kaynakları (sağ) dengesizliği.
 * Dengesiz ise kırmızı, dengeli ise yeşil.
 */
export function JDRBalanceVisual() {
  return (
    <div className="upc-anim-fade-up relative overflow-hidden rounded-md border border-[#E5E7EB] bg-white p-8 md:p-10">
      <div className="mb-6 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FF5400]">İş Denge Modeli (JD-R)</p>
        <h3 className="mt-2 font-display text-[22px] font-semibold tracking-tight text-[#0F1419] md:text-[26px]">
          Çalışanın iş talepleri vs kaynakları dengesi
        </h3>
      </div>

      <svg viewBox="0 0 600 260" className="w-full" aria-hidden>
        <defs>
          <linearGradient id="scaleLeft" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id="scaleRight" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Denge merkezi - üçgen */}
        <g className="upc-anim-fade upc-delay-2">
          <polygon points="300,180 290,230 310,230" fill="#0F1419" />
          <rect x="285" y="228" width="30" height="4" rx="1" fill="#0F1419" />
        </g>

        {/* Denge çubuğu (hafif sola eğik = talep ağır basıyor) */}
        <g className="upc-anim-fade upc-delay-3" transform="rotate(-4 300 180)">
          <line x1="80" y1="180" x2="520" y2="180" stroke="#0F1419" strokeWidth="3" strokeLinecap="round" />

          {/* Sol kefe: Talepler */}
          <g>
            <line x1="120" y1="180" x2="120" y2="140" stroke="#0F1419" strokeWidth="1" strokeDasharray="2 2" />
            <rect x="50" y="80" width="140" height="65" rx="10" fill="url(#scaleLeft)" stroke="#EF4444" strokeWidth="1.5" />
            <text x="120" y="105" textAnchor="middle" fontSize="11" fill="#EF4444" fontWeight="600" letterSpacing="1">
              İŞ TALEPLERİ
            </text>
            <text x="120" y="125" textAnchor="middle" fontSize="10" fill="#525252">
              İş yükü · Rol baskısı
            </text>
            <text x="120" y="140" textAnchor="middle" fontSize="10" fill="#525252">
              Zaman baskısı
            </text>
          </g>

          {/* Sağ kefe: Kaynaklar */}
          <g>
            <line x1="480" y1="180" x2="480" y2="150" stroke="#0F1419" strokeWidth="1" strokeDasharray="2 2" />
            <rect x="410" y="95" width="140" height="55" rx="10" fill="url(#scaleRight)" stroke="#10B981" strokeWidth="1.5" />
            <text x="480" y="118" textAnchor="middle" fontSize="11" fill="#10B981" fontWeight="600" letterSpacing="1">
              İŞ KAYNAKLARI
            </text>
            <text x="480" y="136" textAnchor="middle" fontSize="10" fill="#525252">
              Otonomi · Takdir
            </text>
          </g>
        </g>

        {/* Alt etiketler */}
        <g className="upc-anim-fade-up upc-delay-6">
          <text x="120" y="255" textAnchor="middle" fontSize="22" fontWeight="700" fill="#EF4444">
            7.2
          </text>
          <text x="480" y="255" textAnchor="middle" fontSize="22" fontWeight="700" fill="#10B981">
            4.8
          </text>
        </g>

        {/* Ortada BAT tahmini */}
        <g className="upc-anim-stamp upc-delay-8">
          <rect x="245" y="10" width="110" height="48" rx="10" fill="#FF5400" />
          <text x="300" y="28" textAnchor="middle" fontSize="9" fill="white" letterSpacing="1" fontWeight="600">
            DENGESİZLİK
          </text>
          <text x="300" y="48" textAnchor="middle" fontSize="16" fill="white" fontWeight="700">
            BAT risk: 62
          </text>
        </g>

        {/* Ok - talepten BAT'a */}
        <g className="upc-anim-fade upc-delay-10" opacity="0.6">
          <path d="M 120 80 Q 180 30, 250 30" fill="none" stroke="#FF5400" strokeWidth="1.5" strokeDasharray="3 3" />
          <polygon points="245,25 255,30 245,35" fill="#FF5400" />
        </g>
      </svg>

      <div className="mt-8 grid grid-cols-3 gap-3 text-center">
        <div className="upc-anim-fade-up upc-delay-5 rounded-xl bg-[#FEF2F2] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#EF4444]">Dengesiz</p>
          <p className="mt-1 font-display text-[14px] font-semibold text-[#0F1419]">Kırmızı Band</p>
          <p className="mt-1 text-[11px] text-[#525252]">Acil müdahale gerekir</p>
        </div>
        <div className="upc-anim-fade-up upc-delay-6 rounded-xl bg-[#FEF3C7] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#D97706]">Dikkat</p>
          <p className="mt-1 font-display text-[14px] font-semibold text-[#0F1419]">Sarı Band</p>
          <p className="mt-1 text-[11px] text-[#525252]">İzleme + önleyici</p>
        </div>
        <div className="upc-anim-fade-up upc-delay-7 rounded-xl bg-[#F0FDF4] p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#10B981]">Dengeli</p>
          <p className="mt-1 font-display text-[14px] font-semibold text-[#0F1419]">Yeşil Band</p>
          <p className="mt-1 text-[11px] text-[#525252]">Güçlü yanları besle</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Heatmap görseli — Departman × Hafta animasyonu.
 */
export function HeatmapVisual() {
  const depts = ['Zabıta', 'Temizlik', 'Büro', 'Maliye', 'Park', 'İletişim'];
  // Simulated risk values 0-1 over 8 weeks
  const data: number[][] = [
    [0.8, 0.75, 0.85, 0.9, 0.65, 0.5, 0.4, 0.35],
    [0.7, 0.7, 0.75, 0.8, 0.6, 0.55, 0.45, 0.3],
    [0.3, 0.25, 0.35, 0.3, 0.25, 0.2, 0.25, 0.2],
    [0.35, 0.4, 0.45, 0.35, 0.3, 0.25, 0.2, 0.2],
    [0.5, 0.55, 0.6, 0.55, 0.45, 0.4, 0.35, 0.3],
    [0.4, 0.45, 0.4, 0.35, 0.3, 0.25, 0.2, 0.2],
  ];
  const color = (v: number): string => {
    if (v >= 0.7) return '#EF4444';
    if (v >= 0.5) return '#F59E0B';
    if (v >= 0.35) return '#FEF3C7';
    return '#D1FAE5';
  };
  const weeks = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8'];

  return (
    <div className="upc-anim-fade-up rounded-md border border-[#E5E7EB] bg-white p-8 md:p-10">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FF5400]">Tükenmişlik Haritası</p>
        <h3 className="mt-2 font-display text-[22px] font-semibold tracking-tight text-[#0F1419] md:text-[26px]">
          Departman × Hafta — 8 haftalık trend
        </h3>
        <p className="mt-2 text-[13px] text-[#525252]">
          Samsun Büyükşehir pilotunda: Zabıta birimi 8 haftada kırmızıdan yeşile.
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-grid gap-1" style={{ gridTemplateColumns: `120px repeat(${weeks.length}, minmax(38px, 1fr))` }}>
          <div />
          {weeks.map((w) => (
            <div key={w} className="text-center text-[10px] font-mono text-[#8A8A8A]">
              {w}
            </div>
          ))}
          {depts.map((d, di) => (
            <React.Fragment key={d}>
              <div className="flex items-center text-[12px] font-medium text-[#0F1419]">{d}</div>
              {data[di]!.map((v, wi) => {
                const delayMs = (di * 8 + wi * 3) * 25;
                return (
                  <div
                    key={wi}
                    className="upc-anim-cell relative aspect-square rounded-md"
                    style={{
                      backgroundColor: color(v),
                      animationDelay: `${delayMs}ms`,
                      transformOrigin: 'center',
                    }}
                    title={`${d} · ${weeks[wi]} · risk ${Math.round(v * 100)}%`}
                  >
                    <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono text-[#0F1419]">
                      {Math.round(v * 100)}
                    </span>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-[11px]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-[#D1FAE5]" /> Yeşil (düşük)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-[#FEF3C7]" /> Açık Sarı
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-[#F59E0B]" /> Sarı (dikkat)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm bg-[#EF4444]" /> Kırmızı (acil)
        </span>
      </div>
    </div>
  );
}

/**
 * Entegrasyon akış görseli — sol tarafta 3 kaynak, ortada UpCore, sağda 3 hedef.
 */
export function IntegrationFlowVisual() {
  return (
    <div className="upc-anim-fade-up overflow-hidden rounded-md border border-[#E5E7EB] bg-white p-8 md:p-10">
      <div className="mb-8 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FF5400]">Veri Akışı</p>
        <h3 className="mt-2 font-display text-[22px] font-semibold tracking-tight text-[#0F1419] md:text-[26px]">
          Kaynaklarınızdan UpCore&apos;a, tek yönlü değil
        </h3>
        <p className="mt-2 text-[13px] text-[#525252]">
          Başvuru · bordro · bildirim — hepsi iki yönlü senkron.
        </p>
      </div>

      <svg viewBox="0 0 800 300" className="w-full" aria-hidden>
        <defs>
          <linearGradient id="flowIn" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5E5CE6" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#FF5400" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="flowOut" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FF5400" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        {/* Sol kaynaklar */}
        <g>
          {[
            { y: 40, label: 'Kariyer.net', sub: 'Başvurular' },
            { y: 130, label: 'LinkedIn', sub: 'İlanlar' },
            { y: 220, label: 'SAP / Oracle', sub: 'Çalışan master' },
          ].map((src, i) => (
            <g key={src.label} className={`upc-anim-fade-up upc-delay-${i + 1}`}>
              <rect x="20" y={src.y} width="150" height="48" rx="10" fill="white" stroke="#E8E8E8" strokeWidth="1" />
              <text x="95" y={src.y + 22} textAnchor="middle" fontSize="13" fontWeight="600" fill="#0F1419">
                {src.label}
              </text>
              <text x="95" y={src.y + 38} textAnchor="middle" fontSize="10" fill="#8A8A8A">
                {src.sub}
              </text>
            </g>
          ))}
        </g>

        {/* Akan çizgiler (kaynaklardan UpCore'a) */}
        <g>
          <path
            d="M 170 64 Q 300 64, 340 140"
            fill="none"
            stroke="url(#flowIn)"
            strokeWidth="2"
            className="upc-anim-flow"
          />
          <path
            d="M 170 154 L 340 154"
            fill="none"
            stroke="url(#flowIn)"
            strokeWidth="2"
            className="upc-anim-flow"
          />
          <path
            d="M 170 244 Q 300 244, 340 170"
            fill="none"
            stroke="url(#flowIn)"
            strokeWidth="2"
            className="upc-anim-flow"
          />
        </g>

        {/* UpCore merkez — logo ile */}
        <g className="upc-anim-stamp upc-delay-4">
          <rect x="330" y="95" width="140" height="110" rx="14" fill="#0F1419" />
          {/* Logo — invert beyaz */}
          <image
            href="/upcore-logo.svg"
            x="345"
            y="115"
            width="110"
            height="36"
            preserveAspectRatio="xMidYMid meet"
            style={{ filter: 'brightness(0) invert(1)' }}
          />
          <text x="400" y="175" textAnchor="middle" fontSize="10" fill="#FF5400" letterSpacing="2" fontWeight="600">
            PLATFORM
          </text>
          <text x="400" y="192" textAnchor="middle" fontSize="9" fill="white" opacity="0.6">
            Gerçek zamanlı · Bilim-temelli
          </text>
        </g>

        {/* UpCore'dan hedeflere */}
        <g>
          <path
            d="M 460 140 Q 560 80, 630 64"
            fill="none"
            stroke="url(#flowOut)"
            strokeWidth="2"
            className="upc-anim-flow"
          />
          <path
            d="M 460 154 L 630 154"
            fill="none"
            stroke="url(#flowOut)"
            strokeWidth="2"
            className="upc-anim-flow"
          />
          <path
            d="M 460 170 Q 560 240, 630 244"
            fill="none"
            stroke="url(#flowOut)"
            strokeWidth="2"
            className="upc-anim-flow"
          />
        </g>

        {/* Sağ hedefler */}
        <g>
          {[
            { y: 40, label: 'Slack / Teams', sub: 'Pulse + uyarı' },
            { y: 130, label: 'Logo / Paraşüt', sub: 'Bordro + SGK' },
            { y: 220, label: 'DocuSign', sub: 'E-imza' },
          ].map((tgt, i) => (
            <g key={tgt.label} className={`upc-anim-fade-up upc-delay-${i + 5}`}>
              <rect x="630" y={tgt.y} width="150" height="48" rx="10" fill="white" stroke="#E8E8E8" strokeWidth="1" />
              <text x="705" y={tgt.y + 22} textAnchor="middle" fontSize="13" fontWeight="600" fill="#0F1419">
                {tgt.label}
              </text>
              <text x="705" y={tgt.y + 38} textAnchor="middle" fontSize="10" fill="#8A8A8A">
                {tgt.sub}
              </text>
            </g>
          ))}
        </g>

        {/* Akan parçacıklar */}
        {[0, 0.5, 1].map((offset, i) => (
          <circle key={i} r="3" fill="#FF5400" opacity="0.8">
            <animateMotion dur={`${2.5 + offset}s`} repeatCount="indefinite" begin={`${offset}s`}>
              <mpath href="#flowPath1" />
            </animateMotion>
          </circle>
        ))}
        <path id="flowPath1" d="M 170 154 L 340 154 L 460 154 L 630 154" fill="none" opacity="0" />
      </svg>
    </div>
  );
}

/**
 * Güvenlik Referans Mimarisi — 4 katmanlı teknik diagram.
 * Enterprise security reference architecture formatında.
 */
export function SecurityLayersVisual() {
  const layers = [
    {
      code: 'L.01',
      zone: 'Perimeter',
      title: 'Ağ Katmanı',
      controls: ['Cloudflare WAF', 'DDoS Protection', 'IP Allowlist', 'Rate Limiting'],
      standards: 'ISO 27001 A.13.1',
    },
    {
      code: 'L.02',
      zone: 'Edge',
      title: 'Kimlik Katmanı',
      controls: ['OAuth 2.0 · OIDC', 'SAML 2.0 SSO', 'MFA (FIDO2)', 'Session Mgmt'],
      standards: 'ISO 27001 A.9.1 · A.9.2',
    },
    {
      code: 'L.03',
      zone: 'Application',
      title: 'Yetkilendirme',
      controls: ['RBAC · 40+ role', 'Row-Level Security', 'Tenant Isolation', 'Audit Logging'],
      standards: 'KVKK Madde 12 · ISO 27001 A.9.4',
    },
    {
      code: 'L.04',
      zone: 'Data',
      title: 'Veri Katmanı',
      controls: ['AES-256 At-Rest', 'TLS 1.3 In-Transit', 'pgcrypto Field', 'HSM Key Mgmt'],
      standards: 'ISO 27001 A.10 · GDPR Art. 32',
    },
  ];

  return (
    <div className="overflow-hidden rounded-md border border-white/10 bg-[#0F1419]">
      <div className="border-b border-white/10 px-6 py-4 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#FF5400]">
              Güvenlik Mimarisi · Referans Diyagramı
            </span>
          </div>
          <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white/40">
            v2.4 · 2026-Q1
          </span>
        </div>
      </div>

      <div className="p-6 md:p-8">
        <div className="grid grid-cols-1 gap-px overflow-hidden border border-white/10" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
          {layers.map((layer) => (
            <div key={layer.code} className="grid grid-cols-[auto_1fr] gap-0 bg-[#0F1419] md:grid-cols-[140px_1fr_200px]">
              <div className="border-r border-white/10 bg-[#1F2937] px-5 py-5">
                <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#FF5400]">
                  {layer.code}
                </span>
                <p className="mt-2 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-white/50">
                  {layer.zone}
                </p>
              </div>
              <div className="px-5 py-5 md:px-6">
                <h4 className="font-display text-[14px] font-semibold tracking-tight text-white">
                  {layer.title}
                </h4>
                <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {layer.controls.map((c) => (
                    <li key={c} className="flex items-center gap-2 font-mono text-[10.5px] text-white/70">
                      <span className="h-[3px] w-[3px] bg-[#FF5400]" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="col-span-2 border-t border-white/10 bg-[#1F2937]/50 px-5 py-3 md:col-span-1 md:border-l md:border-t-0 md:px-6">
                <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-white/40">
                  Uyumluluk
                </p>
                <p className="mt-1 font-mono text-[10.5px] text-white/70">
                  {layer.standards}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-2 gap-px overflow-hidden border border-white/10 md:grid-cols-4" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
          {[
            { label: 'Şifreleme', value: 'AES-256', sub: 'At-rest + in-transit' },
            { label: 'İletim', value: 'TLS 1.3', sub: 'HSTS preload' },
            { label: 'Audit Log', value: '7 yıl', sub: 'WORM storage' },
            { label: 'RTO / RPO', value: '4h / 15dk', sub: 'DR tested' },
          ].map((s, i) => (
            <div key={s.label} className="bg-[#0F1419] px-5 py-4">
              <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white/40">
                M.0{i + 1}
              </span>
              <p className="mt-2 font-display text-[18px] font-semibold tracking-[-0.01em] text-white">
                {s.value}
              </p>
              <p className="mt-1 font-mono text-[9px] font-medium uppercase tracking-[0.08em] text-white/50">
                {s.label} · {s.sub}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
          <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-white/40">
            Standartlar
          </span>
          {['ISO 27001:2022', 'SOC 2 Type II', 'KVKK', 'GDPR', 'NIST CSF 2.0'].map((s) => (
            <span
              key={s}
              className="border border-white/15 bg-white/[0.03] px-2 py-1 font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] text-white/70"
            >
              {s}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 8 haftalık tükenmişlik iyileşme grafiği — öncesi/sonrası.
 */
export function RecoveryChartVisual() {
  // 8 haftalık BAT-TR skorları (4 = yüksek risk, 1 = düşük risk)
  const data = [3.5, 3.3, 3.1, 2.8, 2.5, 2.3, 2.1, 1.9];
  const max = 4;
  const width = 100;
  const height = 60;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - (v / max) * height * 0.8;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="upc-anim-fade-up rounded-md border border-[#E5E7EB] bg-white p-8 md:p-10">
      <div className="mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FF5400]">Müdahale Etkisi</p>
        <h3 className="mt-2 font-display text-[22px] font-semibold tracking-tight text-[#0F1419] md:text-[26px]">
          8 haftada tükenmişlik 3.5 → 1.9
        </h3>
        <p className="mt-2 text-[13px] leading-relaxed text-[#525252]">
          Samsun Belediyesi zabıta ekibi · Cohen&apos;s d = 0.58 (bilimsel olarak büyük etki).
        </p>
      </div>

      <div className="relative h-48">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <defs>
            <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Tehlike bantları */}
          <rect x="0" y="0" width={width} height={height * 0.2} fill="#EF4444" opacity="0.08" />
          <rect x="0" y={height * 0.2} width={width} height={height * 0.2} fill="#F59E0B" opacity="0.08" />
          <rect x="0" y={height * 0.4} width={width} height={height * 0.4} fill="#10B981" opacity="0.08" />
          {/* Alan doldurma */}
          <polyline
            points={`0,${height} ${points} ${width},${height}`}
            fill="url(#recGrad)"
            stroke="none"
            className="upc-anim-fade upc-delay-10"
            style={{ opacity: 0 }}
          />
          {/* Çizgi */}
          <polyline
            points={points}
            fill="none"
            stroke="#10B981"
            strokeWidth="0.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
            className="upc-anim-draw upc-delay-3"
            style={{ ['--draw-length' as string]: '200' } as React.CSSProperties}
          />
          {/* Noktalar */}
          {data.map((v, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - (v / max) * height * 0.8;
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="1.2"
                fill="#10B981"
                vectorEffect="non-scaling-stroke"
                className={`upc-anim-stamp upc-delay-${Math.min(i + 3, 10)}`}
                style={{ transformOrigin: `${x}px ${y}px`, transformBox: 'fill-box' }}
              />
            );
          })}
        </svg>
        {/* Y ekseni etiketleri */}
        <div className="absolute left-0 top-0 h-full w-12 flex flex-col justify-between text-[10px] font-mono text-[#8A8A8A]">
          <span>Kırmızı</span>
          <span>Sarı</span>
          <span>Yeşil</span>
        </div>
      </div>

      <div className="mt-4 flex justify-between pl-12 text-[10px] font-mono text-[#8A8A8A]">
        {['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8'].map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="upc-anim-fade-up upc-delay-8 rounded-lg bg-[#FEF2F2] p-3 text-center">
          <p className="font-display text-[24px] font-semibold text-[#EF4444]">3.5</p>
          <p className="mt-1 text-[10px] text-[#525252]">Başlangıç · yüksek risk</p>
        </div>
        <div className="upc-anim-fade-up upc-delay-9 rounded-lg bg-[#FEF3C7] p-3 text-center">
          <p className="font-display text-[24px] font-semibold text-[#F59E0B]">2.5</p>
          <p className="mt-1 text-[10px] text-[#525252]">4. hafta · dikkat</p>
        </div>
        <div className="upc-anim-fade-up upc-delay-10 rounded-lg bg-[#F0FDF4] p-3 text-center">
          <p className="font-display text-[24px] font-semibold text-[#10B981]">1.9</p>
          <p className="mt-1 text-[10px] text-[#525252]">8. hafta · sağlıklı</p>
        </div>
      </div>
    </div>
  );
}
