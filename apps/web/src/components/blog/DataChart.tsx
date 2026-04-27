// UpCore blog için SSR güvenli, bağımsız bar chart.
// Recharts kurulu olmadığı için vanilla SVG çizimi kullanılır.
// Veri setleri `CHART_DATA` içinde id ile indekslenir; MDX tarafında
// `<DataChart id="bat-vs-mbi" />` yazmak yeterli.

interface DataPoint {
  label: string;
  value: number;
  hint?: string;
}

interface ChartDef {
  title: string;
  subtitle?: string;
  yUnit: string;
  data: DataPoint[];
  source?: string;
}

const CHART_DATA: Record<string, ChartDef> = {
  'bat-vs-mbi-reliability': {
    title: 'BAT-TR vs MBI — Cronbach α karşılaştırması',
    subtitle: 'İki ölçeğin Türkiye örnekleminde iç tutarlılık katsayıları',
    yUnit: 'α',
    data: [
      { label: 'BAT-TR (Koçak 2022)', value: 0.92, hint: 'N=1012' },
      { label: 'MBI-GS (TR)', value: 0.87, hint: 'N=843' },
      { label: 'Eşik (α ≥ 0.80)', value: 0.8 },
    ],
    source: 'Koçak 2022; Ergin 1993',
  },
  'jdr-demand-resource': {
    title: 'JD-R Modeli — Kaynak/Gereksinim bakiyesi',
    subtitle: 'Negatif bakiye = tükenmişlik riski',
    yUnit: 'std z',
    data: [
      { label: 'Kaynaklar yüksek', value: 1.2 },
      { label: 'Denge', value: 0.0 },
      { label: 'Gereksinim baskın', value: -1.5, hint: 'Risk eşiği' },
    ],
    source: 'Bakker & Demerouti 2017',
  },
  'ninebox-gender-bias': {
    title: '9-Kutu · Cinsiyet dağılımı kalibrasyon öncesi/sonrası',
    subtitle: 'Kadın çalışanların "High Potential" kutusundaki oranı',
    yUnit: '%',
    data: [
      { label: 'Kalibrasyon öncesi', value: 18 },
      { label: 'Kalibrasyon sonrası', value: 41 },
      { label: 'İş gücü dağılımı', value: 44 },
    ],
    source: 'UpCore 2026 anonim müşteri verisi (n=14 kurum)',
  },
  'okr-vs-kpi-usage': {
    title: 'OKR vs KPI — Türkiye kurum anketi',
    subtitle: 'Kurumların hangi çerçeveyi hangi amaçla kullandığı',
    yUnit: '% kurum',
    data: [
      { label: 'OKR — stratejik hedef', value: 62 },
      { label: 'KPI — operasyonel takip', value: 78 },
      { label: 'Hibrit', value: 41 },
    ],
    source: 'PeopleAnalytics Turkey 2026 anket raporu (n=286)',
  },
  'belediye-burnout-2026': {
    title: 'Belediye personelinde BAT-TR ortalamaları',
    subtitle: 'Birim bazında tükenmişlik skoru (0–4 ölçek)',
    yUnit: 'BAT-TR',
    data: [
      { label: 'Zabıta', value: 2.9 },
      { label: 'Temizlik İşleri', value: 2.7 },
      { label: 'Mali Hizmetler', value: 2.1 },
      { label: 'Basın/İletişim', value: 2.4 },
      { label: 'İdari Kadro', value: 1.8 },
    ],
    source: 'UpCore Samsun SBB pilotu · 2026 Q1',
  },
  'holding-mobility-cost': {
    title: 'İç ilan vs dış işe alım ortalama maliyet',
    subtitle: 'Pozisyon başı brüt maliyet (TRY bin)',
    yUnit: 'bin ₺',
    data: [
      { label: 'Dış işe alım (agency)', value: 148 },
      { label: 'Dış (direct)', value: 72 },
      { label: 'İç ilan + rotasyon', value: 24 },
    ],
    source: 'UpCore 2026 · 4 holding · 612 pozisyon analizi',
  },
  'scale-up-hr-tool-adoption': {
    title: 'Çalışan sayısına göre İK teknolojisi kullanımı',
    subtitle: 'Türkiye SaaS müşteri örneklemi',
    yUnit: '% adoption',
    data: [
      { label: '10–50 çalışan', value: 22 },
      { label: '51–200', value: 58 },
      { label: '201–1000', value: 87 },
      { label: '1000+', value: 96 },
    ],
    source: 'UpCore 2026 · n=412',
  },
  'samsun-sbb-burnout-trend': {
    title: 'Samsun SBB · 8 haftalık tükenmişlik eğrisi',
    subtitle: 'BAT-TR ortalama skorun müdahale sonrası değişimi',
    yUnit: 'BAT-TR',
    data: [
      { label: 'Hafta 1', value: 2.74 },
      { label: 'Hafta 3', value: 2.52 },
      { label: 'Hafta 5', value: 2.31 },
      { label: 'Hafta 8', value: 2.04 },
    ],
    source: 'Samsun Büyükşehir Belediyesi pilot · 2026',
  },
  'ankara-holding-burnout-8w': {
    title: 'Ankara Holding 4000 çalışan · 8 hafta tükenmişlik',
    subtitle: 'İş birimleri ortalaması (BAT-TR)',
    yUnit: 'BAT-TR',
    data: [
      { label: 'Hafta 0', value: 2.41 },
      { label: 'Hafta 2', value: 2.38 },
      { label: 'Hafta 4', value: 2.22 },
      { label: 'Hafta 6', value: 2.05 },
      { label: 'Hafta 8', value: 1.88 },
    ],
    source: 'UpCore kurumsal pilot · 2026',
  },
  'psikometrik-kullanim-tr': {
    title: 'Türkiye firmalarında psikometrik test kullanımı',
    subtitle: 'Son 12 ayda kullanılan araç türü',
    yUnit: '% firma',
    data: [
      { label: 'Kişilik envanteri', value: 54 },
      { label: 'Bilişsel yetenek', value: 38 },
      { label: 'Bağlılık/tükenmişlik', value: 29 },
      { label: 'Değerler/karakter güçleri', value: 12 },
    ],
    source: 'PeopleAnalytics Turkey 2026',
  },
  'kvkk-karar-dagilim': {
    title: 'KVKK Kurulu · çalışan verisi karar dağılımı',
    subtitle: '2022–2025 arası yayımlanmış kararlar',
    yUnit: 'karar sayısı',
    data: [
      { label: 'Açık rıza ihlali', value: 41 },
      { label: 'Aydınlatma eksik', value: 28 },
      { label: 'Veri güvenliği', value: 23 },
      { label: 'Yurt dışı aktarım', value: 14 },
      { label: 'VERBIS kayıt', value: 11 },
    ],
    source: 'KVKK Kurul Karar Özetleri · kvkk.gov.tr',
  },
  'open-science-cost-saving': {
    title: 'UpCap-TR open-license vs Mind Garden PsyCap',
    subtitle: '1000 çalışan · 3 yıl lisans bedeli',
    yUnit: 'bin ₺',
    data: [
      { label: 'Mind Garden PsyCap', value: 840 },
      { label: 'UpCap-TR (CC-BY)', value: 0 },
    ],
    source: 'UpCore finans planlaması · 2026',
  },
};

interface DataChartProps {
  id: string;
  title?: string;
}

export function DataChart({ id, title }: DataChartProps) {
  const chart = CHART_DATA[id];
  if (!chart) {
    return (
      <div className="my-6 rounded-md border border-dashed border-[#D1D5DB] bg-[#F9FAFB] p-4 text-xs text-[#6B7280]">
        Grafik bulunamadı: <code>{id}</code>
      </div>
    );
  }
  const maxVal = Math.max(...chart.data.map((d) => Math.abs(d.value)));
  const hasNeg = chart.data.some((d) => d.value < 0);
  const width = 640;
  const barH = 28;
  const gap = 12;
  const labelWidth = 200;
  const axisW = width - labelWidth - 60;
  const height = chart.data.length * (barH + gap) + 40;

  return (
    <figure className="my-8 rounded-lg border border-[#E5E7EB] bg-white p-5">
      <figcaption className="mb-4 text-sm">
        <div className="font-semibold text-[#0F1419]">{title ?? chart.title}</div>
        {chart.subtitle ? (
          <div className="mt-1 text-xs text-[#6B7280]">{chart.subtitle}</div>
        ) : null}
      </figcaption>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={chart.title}
        className="w-full"
      >
        {chart.data.map((d, i) => {
          const y = i * (barH + gap) + 10;
          const normalized = maxVal === 0 ? 0 : d.value / maxVal;
          const zero = hasNeg ? labelWidth + axisW / 2 : labelWidth;
          const available = hasNeg ? axisW / 2 : axisW;
          const barW = Math.abs(normalized) * available;
          const barX = d.value >= 0 ? zero : zero - barW;
          const color = d.value >= 0 ? '#FF5400' : '#6B7280';
          return (
            <g key={i}>
              <text
                x={labelWidth - 8}
                y={y + barH / 2 + 4}
                textAnchor="end"
                fontSize="12"
                fill="#374151"
              >
                {d.label}
              </text>
              <rect
                x={barX}
                y={y}
                width={barW}
                height={barH}
                fill={color}
                rx={2}
              />
              <text
                x={d.value >= 0 ? barX + barW + 6 : barX - 6}
                y={y + barH / 2 + 4}
                textAnchor={d.value >= 0 ? 'start' : 'end'}
                fontSize="12"
                fontWeight="600"
                fill="#0F1419"
              >
                {d.value}
                {chart.yUnit === '%' ? '%' : ''}
              </text>
              {d.hint ? (
                <text
                  x={d.value >= 0 ? barX + barW + 6 : barX - 6}
                  y={y + barH / 2 + 18}
                  textAnchor={d.value >= 0 ? 'start' : 'end'}
                  fontSize="10"
                  fill="#9CA3AF"
                >
                  {d.hint}
                </text>
              ) : null}
            </g>
          );
        })}
        {/* X ekseni */}
        <line
          x1={labelWidth}
          y1={chart.data.length * (barH + gap) + 12}
          x2={labelWidth + axisW}
          y2={chart.data.length * (barH + gap) + 12}
          stroke="#E5E7EB"
          strokeWidth="1"
        />
        <text
          x={labelWidth + axisW}
          y={chart.data.length * (barH + gap) + 28}
          textAnchor="end"
          fontSize="10"
          fill="#9CA3AF"
        >
          {chart.yUnit}
        </text>
      </svg>
      {chart.source ? (
        <div className="mt-3 text-xs text-[#9CA3AF]">Kaynak: {chart.source}</div>
      ) : null}
    </figure>
  );
}
