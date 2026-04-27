'use client';

import { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Info,
  Printer,
  Lock,
  Heart,
  Zap,
  Brain,
  BookOpen,
  Frown,
  ArrowRight,
} from 'lucide-react';
import {
  scoreBAT12,
  RISK_COLORS,
  RISK_BG_COLORS,
  RISK_LABELS,
  type BAT12Result,
  type SubscaleKey,
} from '@/lib/bat12-scoring';

const SUBSCALE_ORDER: { key: SubscaleKey; labelTR: string }[] = [
  { key: 'exhaustion', labelTR: 'Tukenmislik' },
  { key: 'mentalDistance', labelTR: 'Zihinsel Uzaklasma' },
  { key: 'cognitive', labelTR: 'Bilissel Bozulma' },
  { key: 'emotional', labelTR: 'Duygusal Bozulma' },
];

const DEMO_RESPONSES = [4, 3, 4, 3, 2, 3, 2, 3, 2, 2, 2, 3];

/* ─── Interpretation & recommendations ─── */

const SUBSCALE_INTERPRETATIONS: Record<
  SubscaleKey,
  { icon: React.ReactNode; green: string; amber: string; red: string; norms: number }
> = {
  exhaustion: {
    icon: <Zap className="h-4 w-4" />,
    green: 'Enerji seviyeniz iyi durumda. Is yuku ve dinlenme arasinda saglikli denge var.',
    amber: 'Fiziksel ve zihinsel yorgunluk belirtileri gorulmektedir. Dinlenme rutinlerinizi gozden gecirin.',
    red: 'Ciddi tukenmislik belirtileri. Kronik yorgunluk ve motivasyon kaybi. Profesyonel destek onerilir.',
    norms: 2.4,
  },
  mentalDistance: {
    icon: <Brain className="h-4 w-4" />,
    green: 'Isinize karsi olumlu bir tutum sergiliyorsunuz.',
    amber: 'Ise karsi mesafe duygulari beliriyor. Is anlamliligini yeniden kesfetmeye calisin.',
    red: 'Isten ciddi kopma belirtileri. Sinizm ve ilgisizlik hakim.',
    norms: 2.1,
  },
  cognitive: {
    icon: <BookOpen className="h-4 w-4" />,
    green: 'Bilissel islev duzeyiniz normal. Konsantrasyon saglikli.',
    amber: 'Dikkat dagilmasi ve unutkanlik belirtileri var.',
    red: 'Ciddi bilissel bozulma. Karar verme ve konsantrasyon sorunlari.',
    norms: 1.9,
  },
  emotional: {
    icon: <Frown className="h-4 w-4" />,
    green: 'Duygusal dengeniz iyi.',
    amber: 'Duygusal tepkilerde artis gorulmektedir.',
    red: 'Duygusal kontrol kaybi belirtileri. Sinirlilik, asiri tepki mevcut.',
    norms: 2.0,
  },
};

const SUBSCALE_RECOMMENDATIONS: Record<SubscaleKey, string[]> = {
  exhaustion: [
    'Gunluk 15 dakika mindfulness meditasyonu',
    'Is-yasam sinirlarini belirleyin',
    'Haftalik fiziksel aktivite rutini olusturun',
    'Uyku hijyeninizi iyilestirin (7-8 saat)',
  ],
  mentalDistance: [
    'Isinizin anlamli yonlerini kesfetmeye calisin',
    'Yeni bir proje veya sorumluluk alanini arastirin',
    'Meslektaslarinizla olumlu etkilesimler kurun',
    'Kariyer hedeflerinizi gozden gecirin',
  ],
  cognitive: [
    'Pomodoro teknigi ile calisma araliklarini duzenleyin',
    'Multitasking\'i azaltin, tek goreve odaklanin',
    'Calisma ortaminizi dikkat dagiticilardan temizleyin',
    'Gunluk kisa yuruyusler ile beyin dinlendirin',
  ],
  emotional: [
    'Duygusal farkindaliginizi artirmak icin gunluk tutun',
    'Guvendiginiz biriyle duygularinizi paylasin',
    'Nefes egzersizleri ve gevselik teknikleri',
    'Gerekirse profesyonel psikolojik destek alin',
  ],
};

export default function AnketSonuclarPage() {
  const [responses] = useState<number[]>(DEMO_RESPONSES);
  const [showCitation, setShowCitation] = useState(false);
  const [exported, setExported] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);

  const result: BAT12Result = useMemo(() => scoreBAT12(responses), [responses]);

  const handleExport = () => {
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const getBarWidth = (mean: number): number => {
    return Math.round((mean / 5) * 100);
  };

  const defaultSub = { key: 'exhaustion' as SubscaleKey, labelTR: 'Tukenmislik' };
  const worstSubscale = SUBSCALE_ORDER.reduce((worst, sub) => {
    if (result.subscales[sub.key].mean > result.subscales[worst.key].mean) return sub;
    return worst;
  }, SUBSCALE_ORDER[0] ?? defaultSub);

  const getInterp = (level: string): { title: string; body: string } => {
    if (level === 'green') return { title: 'Tukenmislik riskiniz dusuk', body: 'Mevcut durumunuzu korumak icin saglikli aliskanliklariniza devam edin.' };
    if (level === 'amber') return { title: 'Orta duzey belirtiler mevcut', body: 'Dikkat edilmesi gereken alanlar bulunmaktadir. Stres yonetimi stratejileri uygulamaniz onerilir.' };
    return { title: 'Yuksek tukenmislik belirtileri', body: 'Profesyonel destek onerilir. Is yukunu gozden gecirmeniz ve gerekirse danismanlik almaniz tavsiye edilir.' };
  };
  const interp = getInterp(result.level);

  return (
    <div className="flex flex-col gap-8 print:gap-4" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="print-area">
        {/* Header */}
        <div className="no-print flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#EDEDED] bg-white text-[#525252] transition-colors hover:border-[#D4D4D4] hover:bg-[#FAFAFA]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
                BAT-12-TR Sonuclari
              </h1>
              <p className="mt-0.5 text-sm text-[#525252]">
                Tukenmislik Degerlendirme Araci — 12 Madde Turk Versiyonu
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg border border-[#EDEDED] bg-white px-4 py-2 text-sm font-medium text-[#525252] transition-all hover:border-[#D4D4D4] hover:bg-[#FAFAFA] active:scale-[0.97]"
            >
              <Printer className="h-4 w-4" />
              Yazdir
            </button>
            <button
              type="button"
              onClick={handleExport}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all active:scale-[0.97] ${
                exported
                  ? 'border-[#059669] bg-[#D1FAE5] text-[#059669]'
                  : 'border-[#EDEDED] bg-white text-[#525252] hover:border-[#D4D4D4] hover:bg-[#FAFAFA]'
              }`}
            >
              <Download className="h-4 w-4" />
              {exported ? 'Indirildi!' : 'PDF Indir'}
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 rounded-lg border border-[#EDEDED] bg-white px-4 py-2 text-sm font-medium text-[#525252] transition-all hover:border-[#D4D4D4] hover:bg-[#FAFAFA] active:scale-[0.97]"
            >
              <RefreshCw className="h-4 w-4" />
              Yeniden Hesapla
            </button>
          </div>
        </div>

        {/* Print header (visible only in print) */}
        <div className="hidden print:block">
          <h1 className="text-2xl font-bold text-[#0A0A0A]">BAT-12-TR Sonuclari</h1>
          <p className="text-sm text-[#525252]">
            Tarih: {new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Total Score Card */}
        <div className="rounded-xl border border-[#EDEDED] bg-white p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
            <div className="flex flex-col items-center">
              <span className="text-xs font-medium uppercase tracking-wider text-[#A3A3A3]">
                Genel Skor
              </span>
              <span
                className="mt-1 text-5xl font-bold tabular-nums"
                style={{ color: RISK_COLORS[result.level] }}
              >
                {result.total.toFixed(2)}
              </span>
              <span className="mt-0.5 text-sm text-[#525252]">/ 5.00</span>
            </div>
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-2">
                <span
                  className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    backgroundColor: RISK_BG_COLORS[result.level],
                    color: RISK_COLORS[result.level],
                  }}
                >
                  {RISK_LABELS[result.level]}
                </span>
              </div>
              <h3 className="text-[14px] font-semibold" style={{ color: RISK_COLORS[result.level] }}>
                {interp.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-[#525252]">{interp.body}</p>
            </div>
          </div>

          {/* Norm comparison */}
          <div className="mt-4 rounded-lg bg-[#FAFAFA] p-3">
            <p className="text-[12px] text-[#525252]">
              Sektor ortalamasi: <span className="font-semibold">2.40</span> · Sizin skorunuz:{' '}
              <span className="font-semibold" style={{ color: RISK_COLORS[result.level] }}>
                {result.total.toFixed(2)}
              </span>
              {result.total > 2.4
                ? ' (ortalamanin uzerinde)'
                : result.total < 2.4
                  ? ' (ortalamanin altinda)'
                  : ' (ortalamada)'}
            </p>
          </div>
        </div>

        {/* Subscale Bars with interpretation */}
        <div className="rounded-xl border border-[#EDEDED] bg-white">
          <div className="border-b border-[#EDEDED] px-6 py-4">
            <h2 className="text-base font-semibold text-[#0A0A0A]">Alt Olcek Sonuclari ve Yorum</h2>
            <p className="mt-0.5 text-xs text-[#A3A3A3]">
              Her alt olcek 1-5 arasi puanlanir (3 madde ortalamasi)
            </p>
          </div>
          <div className="flex flex-col gap-6 p-6">
            {SUBSCALE_ORDER.map((sub) => {
              const data = result.subscales[sub.key];
              const width = getBarWidth(data.mean);
              const interps = SUBSCALE_INTERPRETATIONS[sub.key];
              const interpText =
                data.level === 'green' ? interps.green : data.level === 'amber' ? interps.amber : interps.red;

              return (
                <div key={sub.key}>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span style={{ color: RISK_COLORS[data.level] }}>{interps.icon}</span>
                      <span className="text-sm font-medium text-[#0A0A0A]">{sub.labelTR}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#A3A3A3]">norm: {interps.norms.toFixed(1)}</span>
                      <span
                        className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold"
                        style={{
                          backgroundColor: RISK_BG_COLORS[data.level],
                          color: RISK_COLORS[data.level],
                        }}
                      >
                        {RISK_LABELS[data.level]}
                      </span>
                      <span className="text-sm font-semibold tabular-nums text-[#0A0A0A]">
                        {data.mean.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="h-5 w-full overflow-hidden rounded-full bg-[#F5F5F5]">
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-out"
                      style={{
                        width: `${width}%`,
                        backgroundColor: RISK_COLORS[data.level],
                      }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] text-[#A3A3A3]">
                    <span>1.00</span>
                    <span>Esik: 2.58 (yesil) / 3.01 (sari)</span>
                    <span>5.00</span>
                  </div>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-[#525252]">{interpText}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Item-level breakdown */}
        <div className="rounded-xl border border-[#EDEDED] bg-white">
          <div className="border-b border-[#EDEDED] px-6 py-4">
            <h2 className="text-base font-semibold text-[#0A0A0A]">Madde Bazli Detay</h2>
          </div>
          <div className="divide-y divide-[#EDEDED]">
            {SUBSCALE_ORDER.map((sub) => {
              const data = result.subscales[sub.key];
              return (
                <div key={sub.key} className="px-6 py-4">
                  <p
                    className="mb-2 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: RISK_COLORS[data.level] }}
                  >
                    {sub.labelTR}
                  </p>
                  <div className="flex gap-3">
                    {data.items.map((score, idx) => (
                      <div
                        key={idx}
                        className="flex flex-1 flex-col items-center gap-1 rounded-lg border border-[#EDEDED] bg-[#FAFAFA] py-3"
                      >
                        <span className="text-[11px] text-[#A3A3A3]">M{idx + 1}</span>
                        <span className="text-lg font-semibold tabular-nums text-[#0A0A0A]">
                          {score}
                        </span>
                        <span className="text-[10px] text-[#A3A3A3]">/ 5</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recommended actions */}
        <div className="rounded-xl border border-[#EDEDED] bg-white">
          <button
            type="button"
            onClick={() => setShowRecommendations((prev) => !prev)}
            className="no-print flex w-full items-center justify-between px-6 py-4"
          >
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-[#5E5CE6]" />
              <span className="text-[14px] font-semibold text-[#0A0A0A]">
                Kisisel Oneriler
              </span>
              <span className="text-[12px] text-[#888]">
                ({worstSubscale.labelTR} ozelinde)
              </span>
            </div>
            <ArrowRight
              className={`h-4 w-4 text-[#888] transition-transform ${showRecommendations ? 'rotate-90' : ''}`}
            />
          </button>

          <div
            className={`overflow-hidden transition-all duration-300 print:!max-h-[500px] print:!opacity-100 ${
              showRecommendations ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="border-t border-[#EDEDED] px-6 py-4">
              <ul className="flex flex-col gap-2.5">
                {SUBSCALE_RECOMMENDATIONS[worstSubscale.key].map((rec, idx) => (
                  <li key={idx} className="flex gap-2 text-[13px] leading-relaxed text-[#525252]">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EEF0FD] text-[10px] font-semibold text-[#5E5CE6]">
                      {idx + 1}
                    </span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Anonymity reminder */}
        <div className="flex items-start gap-3 rounded-xl border border-[#D1FAE5] bg-[#F0FFF4] p-4">
          <Lock className="h-4 w-4 shrink-0 text-[#059669]" />
          <div>
            <p className="text-[12px] font-semibold text-[#059669]">Gizlilik Hatirlatmasi</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-[#525252]">
              Bu sonuclar yalnizca size ozeldir. Yoneticiniz bireysel sonuclarinizi goremez.
              Departman bazli sonuclar yalnizca en az 5 kisi katildiginda anonimlestirilmis olarak paylasılir.
            </p>
          </div>
        </div>

        {/* Citation / Transparency Note */}
        <div className="rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-5">
          <button
            type="button"
            onClick={() => setShowCitation(!showCitation)}
            className="no-print flex w-full items-center gap-2 text-left"
          >
            <Info className="h-4 w-4 shrink-0 text-[#5E5CE6]" />
            <span className="text-xs font-medium text-[#525252]">
              Bilimsel Kaynak ve Seffaflik Notu
            </span>
            <span className="ml-auto text-xs text-[#A3A3A3]">
              {showCitation ? 'Gizle' : 'Goster'}
            </span>
          </button>
          {showCitation && (
            <div className="mt-3 space-y-2 border-t border-[#EDEDED] pt-3">
              <p className="text-[11px] leading-relaxed text-[#525252]">
                Kocak, E. E., Gencay, E. & Schaufeli, W. B. (2022). &quot;Burnout Assessment Tool
                — Turkish Adaptation and Validation (BAT-12-TR).&quot; N=2.778. Provisional European
                norms (Schaufeli, 2023) kullanilmaktadir.
              </p>
              <p className="text-[11px] leading-relaxed text-[#A3A3A3]">
                Bu skorlar bireysel performans degerlendirmesi icin kullanilmamalidir.
                Klinik teshis yerine gecmez. Yuksek skor alan bireylerin profesyonel
                destek almasi onerilir.
              </p>
            </div>
          )}
          {/* Always show in print */}
          <div className="mt-3 hidden space-y-2 border-t border-[#EDEDED] pt-3 print:block">
            <p className="text-[11px] leading-relaxed text-[#525252]">
              Kocak, E. E., Gencay, E. & Schaufeli, W. B. (2022). BAT-12-TR. N=2.778.
              Provisional European norms (Schaufeli, 2023).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
