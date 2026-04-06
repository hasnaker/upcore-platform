'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Send,
  Shield,
  Info,
  Printer,
  BookOpen,
  Heart,
  Brain,
  Frown,
  Zap,
  Lock,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  BAT12_ITEMS,
  LIKERT_OPTIONS,
  scoreBAT12,
  RISK_COLORS,
  RISK_BG_COLORS,
  RISK_LABELS,
} from '@/lib/bat12-scoring';
import type { BAT12Result, SubscaleKey } from '@/lib/bat12-scoring';

type SurveyPhase = 'answering' | 'results';

const SUBSCALE_ORDER: SubscaleKey[] = ['exhaustion', 'mentalDistance', 'cognitive', 'emotional'];

/* ─── Subscale interpretation data ─── */

const SUBSCALE_INTERPRETATIONS: Record<
  SubscaleKey,
  { icon: React.ReactNode; green: string; amber: string; red: string; norms: number }
> = {
  exhaustion: {
    icon: <Zap className="h-4 w-4" />,
    green:
      'Enerji seviyeniz iyi durumda. Is yuku ve dinlenme arasinda saglikli bir denge kurabiliyorsunuz.',
    amber:
      'Fiziksel ve zihinsel yorgunluk belirtileri gorulmektedir. Dinlenme rutinlerinizi gozden gecirin.',
    red:
      'Ciddi tukenmislik belirtileri. Kronik yorgunluk, motivasyon kaybi yasaniyor olabilir. Profesyonel destek onerilir.',
    norms: 2.4,
  },
  mentalDistance: {
    icon: <Brain className="h-4 w-4" />,
    green:
      'Isinize karsi olumlu bir tutum sergiliyorsunuz. Anlamlilik duygusu korunuyor.',
    amber:
      'Ise karsi mesafe duygulari beliriyor. Is anlamliligini yeniden kesfetmek icin adimlar atilabilir.',
    red:
      'Isten ciddi kopma belirtileri. Sinizm ve ilgisizlik hakim. Kariyer koclugu veya rol degisikligi degerlendirilmeli.',
    norms: 2.1,
  },
  cognitive: {
    icon: <BookOpen className="h-4 w-4" />,
    green:
      'Bilissel islev duzeyiniz normal. Konsantrasyon ve karar verme becerileriniz saglikli.',
    amber:
      'Dikkat dagilmasi ve unutkanlik belirtileri var. Calisma ortamini ve multitasking aliskanliklarini gozden gecirin.',
    red:
      'Ciddi bilissel bozulma. Karar verme ve konsantrasyon sorunlari is performansini etkiliyor olabilir.',
    norms: 1.9,
  },
  emotional: {
    icon: <Frown className="h-4 w-4" />,
    green:
      'Duygusal dengeniz iyi. Is yerinde duygularinizi saglikli sekilde yonetebiliyorsunuz.',
    amber:
      'Duygusal tepkilerde artis gorulmektedir. Stres yonetimi teknikleri faydali olabilir.',
    red:
      'Duygusal kontrol kaybi belirtileri. Sinirlilik, asiri tepki veya duygusal tukenme mevcut. Destek onerilir.',
    norms: 2.0,
  },
};

/* ─── Recommendations based on subscales ─── */

const SUBSCALE_RECOMMENDATIONS: Record<SubscaleKey, string[]> = {
  exhaustion: [
    'Gunluk 15 dakika mindfulness meditasyonu',
    'Is-yasam sinirlarini belirleyin (mesaj saatleri vb.)',
    'Haftalik fiziksel aktivite rutini olusturun',
    'Uyku hijyeninizi iyilestirin (7-8 saat)',
  ],
  mentalDistance: [
    'Isinizin anlamli yonlerini yeniden kesfetmeye calisin',
    'Yeni bir proje veya sorumluluk alanini arastirin',
    'Meslektaslarinizla olumlu etkilesimler kurun',
    'Kariyer hedeflerinizi gozden gecirin',
  ],
  cognitive: [
    'Pomodoro teknigi ile calisma araliklarini duzenleyin',
    'Multitasking\'i azaltin, tek goreve odaklanin',
    'Calisma ortaminizi dikkat dagitici unsurlardan temizleyin',
    'Gunluk kisa yuruyusler ile beyin dinlendirin',
  ],
  emotional: [
    'Duygusal farkindaliginizi artirmak icin gunluk tutun',
    'Guvendiginiz biriyle duygularinizi paylasin',
    'Nefes egzersizleri ve gevselik teknikleri uygulayın',
    'Gerekirse profesyonel psikolojik destek alin',
  ],
};

/* ─── InfoBanner local component ─── */

const InfoBanner = ({
  tone,
  title,
  children,
}: {
  tone: 'info' | 'warning' | 'success';
  title: string;
  children: React.ReactNode;
}) => {
  const toneConfig = {
    info: { bg: 'bg-[#EEF0FD]', border: 'border-[#D0D1FF]', text: 'text-[#5E5CE6]' },
    warning: { bg: 'bg-[#FEF3C7]', border: 'border-[#FDE68A]', text: 'text-[#D97706]' },
    success: { bg: 'bg-[#D1FAE5]', border: 'border-[#6EE7B7]', text: 'text-[#059669]' },
  };
  const c = toneConfig[tone];
  return (
    <div className={`rounded-lg border ${c.border} ${c.bg} p-4`}>
      <p className={`mb-1 text-[12px] font-semibold ${c.text}`}>{title}</p>
      <div className="text-[12px] leading-relaxed text-[#525252]">{children}</div>
    </div>
  );
};

/* ─── Button local component ─── */

const Button = ({
  children,
  onClick,
  disabled,
  variant = 'primary',
  size = 'md',
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
  size?: 'sm' | 'md';
  className?: string;
}) => {
  const base =
    'inline-flex items-center gap-1.5 font-medium transition-all active:scale-[0.97] rounded-lg';
  const sizeClass = size === 'sm' ? 'px-3 py-1.5 text-[13px]' : 'px-4 py-2 text-[14px]';
  const variantClass =
    variant === 'primary'
      ? 'bg-[#0A0A0A] text-white hover:bg-[#262626] disabled:opacity-40 disabled:cursor-not-allowed'
      : 'text-[#525252] hover:bg-[#FAFAFA]';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizeClass} ${variantClass} ${className}`}
    >
      {children}
    </button>
  );
};

export default function BAT12CevapPage() {
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [phase, setPhase] = useState<SurveyPhase>('answering');
  const [result, setResult] = useState<BAT12Result | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const answeredCount = Object.keys(answers).length;
  const allAnswered = answeredCount === 12;
  const progressPercent = Math.round((answeredCount / 12) * 100);

  const handleAnswer = useCallback(
    (itemId: number, value: number) => {
      setAnswers((prev) => ({ ...prev, [itemId]: value }));
      if (currentQuestion < 11) {
        setTimeout(() => {
          setCurrentQuestion((prev) => Math.min(prev + 1, 11));
        }, 300);
      }
    },
    [currentQuestion],
  );

  const handleSubmit = () => {
    if (!allAnswered) return;
    const responses = BAT12_ITEMS.map((item) => answers[item.id] ?? 1) as number[];
    const scored = scoreBAT12(responses);
    setResult(scored);
    setPhase('results');
    // Store result in localStorage for history
    try {
      const history = JSON.parse(localStorage.getItem('bat12-history') || '[]');
      history.unshift({
        date: new Date().toISOString(),
        total: scored.total,
        level: scored.level,
        subscales: {
          exhaustion: scored.subscales.exhaustion.mean,
          mentalDistance: scored.subscales.mentalDistance.mean,
          cognitive: scored.subscales.cognitive.mean,
          emotional: scored.subscales.emotional.mean,
        },
      });
      localStorage.setItem('bat12-history', JSON.stringify(history.slice(0, 20)));
    } catch {
      // Ignore storage errors
    }
    // Save to backend DB
    try {
      fetch('/api/survey/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscales: {
            exhaustion: scored.subscales.exhaustion.mean,
            mentalDistance: scored.subscales.mentalDistance.mean,
            cognitive: scored.subscales.cognitive.mean,
            emotional: scored.subscales.emotional.mean,
          },
          total: scored.total,
          level: scored.level,
          rawResponses: responses, // Send raw answers for backend ML scoring
        }),
      });
    } catch {
      // Non-blocking — localStorage is primary
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToSonuclar = () => {
    if (result) {
      sessionStorage.setItem('bat12-result', JSON.stringify(result));
      router.push('/anketler/sonuclar');
    }
  };

  if (phase === 'results' && result) {
    return <InlineResults result={result} onViewDetailed={goToSonuclar} />;
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/anketler"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#EDEDED] text-[#888] transition-colors hover:border-[#D4D4D4] hover:text-[#0A0A0A]"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-[18px] font-semibold text-[#0A0A0A]">
            BAT-12-TR Haftalik Pulse Anketi
          </h1>
          <p className="text-[13px] text-[#888]">
            Asagidaki ifadeleri is deneyiminize gore degerlendiriniz.
          </p>
        </div>
      </div>

      {/* Privacy notice */}
      <InfoBanner tone="info" title="Gizlilik Guvencesi">
        <span className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 shrink-0" />
          Bu anket anonimdir. Bireysel yanitlariniz kimseyle paylasilmayacaktir.
          Sonuclar yalnizca departman bazinda ve en az 5 katilimci oldugunda gosterilir.
        </span>
      </InfoBanner>

      {/* Progress bar */}
      <div className="sticky top-0 z-10 rounded-lg border border-[#EDEDED] bg-white/95 p-4 backdrop-blur-sm">
        <div className="flex items-center justify-between text-[13px]">
          <span className="font-medium text-[#0A0A0A]">{answeredCount}/12 tamamlandi</span>
          <span className="tabular-nums text-[#888]">%{progressPercent}</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#F5F5F5]">
          <div
            className="h-full rounded-full bg-[#5E5CE6] transition-[width] duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="mt-2.5 flex gap-1.5">
          {BAT12_ITEMS.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCurrentQuestion(idx)}
              className={`h-2 flex-1 rounded-full transition-all duration-200 ${
                answers[item.id]
                  ? 'bg-[#5E5CE6]'
                  : idx === currentQuestion
                    ? 'bg-[#5E5CE6] opacity-40'
                    : 'bg-[#EDEDED]'
              }`}
              aria-label={`Soru ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Questions */}
      <div className="flex flex-col gap-4">
        {BAT12_ITEMS.map((item, idx) => {
          const isActive = idx === currentQuestion;
          const isAnswered = answers[item.id] !== undefined;

          return (
            <div
              key={item.id}
              id={`question-${item.id}`}
              className={`rounded-xl border p-5 transition-all duration-200 ${
                isActive
                  ? 'border-[#5E5CE6] bg-white shadow-[0_0_0_1px_rgba(94,92,230,0.1)]'
                  : isAnswered
                    ? 'border-[#D1FAE5] bg-[#FAFFFE]'
                    : 'border-[#EDEDED] bg-white'
              }`}
              onClick={() => setCurrentQuestion(idx)}
            >
              <div className="mb-4 flex items-start gap-3">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
                    isAnswered
                      ? 'bg-[#059669] text-white'
                      : isActive
                        ? 'bg-[#5E5CE6] text-white'
                        : 'bg-[#F5F5F5] text-[#888]'
                  }`}
                >
                  {isAnswered ? '\u2713' : idx + 1}
                </span>
                <p className="pt-0.5 text-[14px] font-medium leading-relaxed text-[#0A0A0A]">
                  {item.text}
                </p>
              </div>

              <div className="ml-10 flex flex-col gap-2 sm:flex-row sm:gap-0">
                {LIKERT_OPTIONS.map((option) => {
                  const isSelected = answers[item.id] === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAnswer(item.id, option.value);
                      }}
                      className={`group flex flex-1 items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all duration-150 sm:flex-col sm:items-center sm:gap-1 sm:px-2 sm:py-3 sm:text-center ${
                        isSelected
                          ? 'border-[#5E5CE6] bg-[#5E5CE6] text-white shadow-sm'
                          : 'border-[#EDEDED] bg-white text-[#555] hover:border-[#D4D4D4] hover:bg-[#FAFAFA]'
                      }`}
                    >
                      <span
                        className={`text-[15px] font-semibold tabular-nums sm:text-[16px] ${
                          isSelected ? 'text-white' : 'text-[#0A0A0A]'
                        }`}
                      >
                        {option.value}
                      </span>
                      <span
                        className={`text-[11px] leading-tight sm:text-[10px] ${
                          isSelected ? 'text-white/90' : 'text-[#888]'
                        }`}
                      >
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation + Submit */}
      <div className="flex items-center justify-between border-t border-[#EDEDED] pt-6">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrentQuestion((prev) => Math.max(prev - 1, 0))}
            disabled={currentQuestion === 0}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-[#EDEDED] px-3 text-[13px] text-[#555] transition-colors hover:border-[#D4D4D4] disabled:opacity-40"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Onceki
          </button>
          <button
            type="button"
            onClick={() => setCurrentQuestion((prev) => Math.min(prev + 1, 11))}
            disabled={currentQuestion === 11}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-[#EDEDED] px-3 text-[13px] text-[#555] transition-colors hover:border-[#D4D4D4] disabled:opacity-40"
          >
            Sonraki
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <Button onClick={handleSubmit} disabled={!allAnswered}>
          <Send className="h-4 w-4" />
          Gonder
        </Button>
      </div>

      {/* Citation */}
      <p className="text-[11px] italic text-[#AAA]">
        Kocak, H., Gencay, O. A., & Schaufeli, W. B. (2022). BAT-12-TR: Tukenmislik
        Degerlendirme Aracinin Turkcye uyarlanmasi.
      </p>
    </div>
  );
}

/* ─── Inline Results (shown right after submit) ─── */

interface InlineResultsProps {
  result: BAT12Result;
  onViewDetailed: () => void;
}

const SUBSCALE_LABELS_TR: Record<SubscaleKey, string> = {
  exhaustion: 'Tukenmislik',
  mentalDistance: 'Zihinsel Uzaklasma',
  cognitive: 'Bilissel Bozulma',
  emotional: 'Duygusal Bozulma',
};

const InlineResults = ({ result, onViewDetailed }: InlineResultsProps) => {
  const [showRecommendations, setShowRecommendations] = useState(false);

  // Check for previous score in localStorage
  const [previousScore, setPreviousScore] = useState<number | null>(null);

  useEffect(() => {
    try {
      const history = JSON.parse(localStorage.getItem('bat12-history') || '[]');
      // Index 0 is the current one we just saved, index 1 is previous
      if (history.length > 1) {
        setPreviousScore(history[1].total);
      }
    } catch {
      // Ignore
    }
  }, []);

  const trendDiff = previousScore !== null ? result.total - previousScore : null;

  // Find worst subscale for targeted recommendations
  const worstSubscale: SubscaleKey = SUBSCALE_ORDER.reduce<SubscaleKey>((worst, key) => {
    if (result.subscales[key].mean > result.subscales[worst].mean) return key;
    return worst;
  }, 'exhaustion');

  // Risk-level interpretation text
  const getInterpretation = (level: string): { title: string; body: string; color: string } => {
    if (level === 'green') {
      return {
        title: 'Tukenmislik riskiniz dusuk',
        body: 'Mevcut durumunuzu korumak icin saglikli aliskanliklariniza devam edin. Duzgun uyku, egzersiz ve sosyal etkilesimler koruyucu faktorlerdir.',
        color: '#059669',
      };
    }
    if (level === 'amber') {
      return {
        title: 'Orta duzey belirtiler mevcut',
        body: 'Dikkat edilmesi gereken alanlar bulunmaktadir. Asagidaki onerileri inceleyerek erken mudahale adimlarini atabilirsiniz. Stres yonetimi stratejileri uygulamaniz onerilir.',
        color: '#D97706',
      };
    }
    return {
      title: 'Yuksek tukenmislik belirtileri',
      body: 'Profesyonel destek onerilir. Is yukunu gozden gecirmeniz, yoneticinizle gorusmeniz ve gerekirse psikolojik danismanlik almaniz onemle tavsiye edilir.',
      color: '#DC2626',
    };
  };

  const interp = getInterpretation(result.level);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col gap-6 print:gap-4">
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-area, .print-area * { visibility: visible; }
          .print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          .print-break { page-break-before: always; }
        }
      `}</style>

      <div className="print-area">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[20px] font-semibold text-[#0A0A0A]">Anket Sonuclariniz</h1>
            <p className="mt-1 text-[13px] text-[#888]">
              BAT-12-TR Tukenmislik Degerlendirmesi tamamlandi.
            </p>
          </div>
          <button
            type="button"
            onClick={handlePrint}
            className="no-print inline-flex items-center gap-1.5 rounded-lg border border-[#EDEDED] px-3 py-1.5 text-[12px] font-medium text-[#555] transition-colors hover:border-[#D4D4D4] hover:bg-[#FAFAFA]"
          >
            <Printer className="h-3.5 w-3.5" />
            Yazdir
          </button>
        </div>

        {/* Total score card */}
        <div
          className="rounded-xl border-2 p-6 text-center"
          style={{ borderColor: RISK_COLORS[result.level] }}
        >
          <p className="text-[12px] font-medium uppercase tracking-wider text-[#888]">
            Genel Tukenmislik Skoru
          </p>
          <div className="mt-2 flex items-center justify-center gap-3">
            <span className="text-[48px] font-bold tabular-nums text-[#0A0A0A]">
              {result.total.toFixed(2)}
            </span>
            <span className="text-[18px] text-[#888]">/5.00</span>
          </div>
          <span
            className="mt-2 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-semibold"
            style={{
              backgroundColor: RISK_BG_COLORS[result.level],
              color: RISK_COLORS[result.level],
            }}
          >
            {RISK_LABELS[result.level]}
          </span>

          {/* Trend comparison */}
          {trendDiff !== null && (
            <div className="mt-3 flex items-center justify-center gap-2">
              {trendDiff > 0 ? (
                <TrendingUp className="h-4 w-4 text-[#DC2626]" />
              ) : trendDiff < 0 ? (
                <TrendingDown className="h-4 w-4 text-[#059669]" />
              ) : null}
              <span
                className={`text-[13px] font-medium ${
                  trendDiff > 0 ? 'text-[#DC2626]' : trendDiff < 0 ? 'text-[#059669]' : 'text-[#888]'
                }`}
              >
                Gecen haftaya gore: {trendDiff > 0 ? '+' : ''}{trendDiff.toFixed(2)} puan{' '}
                {trendDiff > 0 ? 'artis' : trendDiff < 0 ? 'azalis' : 'degisim yok'}
              </span>
            </div>
          )}
        </div>

        {/* Personalized interpretation */}
        <div
          className="rounded-xl border p-5"
          style={{ borderColor: `${interp.color}40`, backgroundColor: `${interp.color}08` }}
        >
          <h3 className="text-[14px] font-semibold" style={{ color: interp.color }}>
            {interp.title}
          </h3>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#525252]">{interp.body}</p>
        </div>

        {/* Norm comparison */}
        <div className="rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-4">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-[#5E5CE6]" />
            <span className="text-[13px] font-medium text-[#0A0A0A]">
              Sektor Karsilastirmasi
            </span>
          </div>
          <p className="mt-1 text-[12px] text-[#525252]">
            Sektor ortalamasi: <span className="font-semibold">2.40</span> · Sizin skorunuz:{' '}
            <span className="font-semibold" style={{ color: RISK_COLORS[result.level] }}>
              {result.total.toFixed(2)}
            </span>
            {result.total > 2.4
              ? ' (Sektor ortalamasinin uzerinde)'
              : result.total < 2.4
                ? ' (Sektor ortalamasinin altinda)'
                : ' (Sektor ortalamasinda)'}
          </p>
          <p className="mt-1 text-[10px] text-[#A3A3A3]">
            Kaynak: Provisional European norms (Schaufeli, 2023)
          </p>
        </div>

        {/* Subscale bars with interpretation */}
        <div className="rounded-xl border border-[#EDEDED] bg-white p-5">
          <h2 className="mb-4 text-[14px] font-semibold text-[#0A0A0A]">
            Alt Boyut Analizi ve Yorum
          </h2>
          <div className="flex flex-col gap-6">
            {SUBSCALE_ORDER.map((key) => {
              const sub = result.subscales[key];
              const interps = SUBSCALE_INTERPRETATIONS[key];
              const interpText =
                sub.level === 'green'
                  ? interps.green
                  : sub.level === 'amber'
                    ? interps.amber
                    : interps.red;

              return (
                <div key={key}>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <div className="flex items-center gap-2">
                      <span style={{ color: RISK_COLORS[sub.level] }}>{interps.icon}</span>
                      <div>
                        <p className="text-[13px] font-medium text-[#0A0A0A]">{sub.labelTR}</p>
                        <p className="text-[11px] text-[#AAA]">{sub.label}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#A3A3A3]">
                        norm: {interps.norms.toFixed(1)}
                      </span>
                      <span
                        className="text-[14px] font-semibold tabular-nums"
                        style={{ color: RISK_COLORS[sub.level] }}
                      >
                        {sub.mean.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  <div className="h-3 w-full overflow-hidden rounded-full bg-[#F5F5F5]">
                    <div
                      className="h-full rounded-full transition-[width] duration-700 ease-out"
                      style={{
                        width: `${(sub.mean / 5) * 100}%`,
                        backgroundColor: RISK_COLORS[sub.level],
                      }}
                    />
                  </div>
                  {/* Subscale interpretation */}
                  <p className="mt-1.5 text-[12px] leading-relaxed text-[#525252]">{interpText}</p>
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
            className="no-print flex w-full items-center justify-between px-5 py-4"
          >
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-[#5E5CE6]" />
              <span className="text-[14px] font-semibold text-[#0A0A0A]">
                Kisisel Oneriler
              </span>
              <span className="text-[12px] text-[#888]">
                ({SUBSCALE_LABELS_TR[worstSubscale]} ozelinde)
              </span>
            </div>
            <ArrowRight
              className={`h-4 w-4 text-[#888] transition-transform ${showRecommendations ? 'rotate-90' : ''}`}
            />
          </button>

          {/* Always visible in print */}
          <div
            className={`overflow-hidden transition-all duration-300 print:!max-h-[500px] print:!opacity-100 ${
              showRecommendations ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
            }`}
          >
            <div className="border-t border-[#EDEDED] px-5 py-4">
              <p className="mb-3 text-[12px] text-[#888]">
                En yuksek alt boyutunuz <span className="font-semibold text-[#0A0A0A]">{SUBSCALE_LABELS_TR[worstSubscale]}</span> icin oneriler:
              </p>
              <ul className="flex flex-col gap-2.5">
                {SUBSCALE_RECOMMENDATIONS[worstSubscale].map((rec, idx) => (
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
            <p className="text-[12px] font-semibold text-[#059669]">
              Gizlilik Hatirlatmasi
            </p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-[#525252]">
              Bu sonuclar yalnizca size ozeldir. Yoneticiniz bireysel sonuclarinizi goremez.
              Departman bazli sonuclar yalnizca en az 5 kisi katildiginda anonimlestirilmis
              olarak paylasılir.
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="no-print flex items-center justify-between">
        <Link
          href="/anketler"
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium text-[#525252] transition-colors hover:bg-[#FAFAFA]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Anketlere Don
        </Link>
        <Button onClick={onViewDetailed}>
          Detayli Sonuclar
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Citation */}
      <p className="text-[11px] italic text-[#AAA]">
        Kocak, H., Gencay, O. A., & Schaufeli, W. B. (2022). BAT-12-TR.
        Provisional European norms (Schaufeli, 2023).
      </p>
    </div>
  );
};
