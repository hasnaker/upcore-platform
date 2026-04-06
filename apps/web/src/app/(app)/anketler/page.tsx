'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Plus,
  ArrowRight,
  BarChart3,
  Clock,
  Users,
  CalendarDays,
  History,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Activity,
  Settings,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
} from 'lucide-react';

/* ─── Types ─── */

interface SurveyItem {
  id: string;
  name: string;
  description: string;
  questionCount: number;
  status: 'OPEN' | 'CLOSED' | 'SCHEDULED';
  responseCount: number;
  targetCount: number;
  openAt: string;
  closeAt: string;
}

interface SurveyHistoryEntry {
  date: string;
  total: number;
  level: 'green' | 'amber' | 'red';
  subscales: {
    exhaustion: number;
    mentalDistance: number;
    cognitive: number;
    emotional: number;
  };
}

interface PastSurveyRow {
  id: string;
  week: string;
  instrument: string;
  participation: number;
  avgScore: number;
  level: 'green' | 'amber' | 'red';
  trend: 'up' | 'down' | 'same';
  trendDiff: number;
  subscaleBreakdown: {
    dept: string;
    exhaustion: number;
    mentalDistance: number;
    cognitive: number;
    emotional: number;
  }[];
}

interface DeptParticipation {
  dept: string;
  rate: number;
  filled: number;
  total: number;
  warning: boolean;
}

interface NormRow {
  dimension: string;
  org: number;
  sector: number;
  turkey: number;
  diff: number;
  warning: boolean;
}

/* ─── Config ─── */

const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
  OPEN: { label: 'Acik', bg: 'bg-[#D1FAE5]', text: 'text-[#059669]' },
  CLOSED: { label: 'Kapali', bg: 'bg-[#F5F5F5]', text: 'text-[#888]' },
  SCHEDULED: { label: 'Planli', bg: 'bg-[#FEF3C7]', text: 'text-[#D97706]' },
};

const RISK_COLORS: Record<string, string> = {
  green: '#059669',
  amber: '#D97706',
  red: '#DC2626',
};

const RISK_BG_COLORS: Record<string, string> = {
  green: '#D1FAE5',
  amber: '#FEF3C7',
  red: '#FEE2E2',
};

const RISK_LABELS: Record<string, string> = {
  green: 'Dusuk Risk',
  amber: 'Orta Risk',
  red: 'Yuksek Risk',
};

/* ─── Mock Data ─── */

const surveys: SurveyItem[] = [
  {
    id: '1',
    name: 'BAT-12-TR Haftalik Pulse — Hafta 14',
    description:
      'Kocak, Gencay & Schaufeli (2022) tarafindan Turkceye uyarlanan BAT-12-TR olcegi ile haftalik tukenmislik ve baglilik olcumu.',
    questionCount: 12,
    status: 'OPEN',
    responseCount: 42,
    targetCount: 48,
    openAt: '2026-03-30',
    closeAt: '2026-04-06',
  },
  {
    id: '2',
    name: 'Calisan Memnuniyeti Q1 2026',
    description:
      'Ceyreklik calisan memnuniyeti ve baglilik anketi. 8 boyut uzerinden degerlendirme.',
    questionCount: 8,
    status: 'OPEN',
    responseCount: 15,
    targetCount: 48,
    openAt: '2026-04-01',
    closeAt: '2026-04-10',
  },
  {
    id: '3',
    name: 'BAT-12-TR Haftalik Pulse — Hafta 13',
    description:
      'Kocak, Gencay & Schaufeli (2022) tarafindan Turkceye uyarlanan BAT-12-TR olcegi ile haftalik tukenmislik ve baglilik olcumu.',
    questionCount: 12,
    status: 'CLOSED',
    responseCount: 45,
    targetCount: 48,
    openAt: '2026-03-23',
    closeAt: '2026-03-30',
  },
];

const participationByDept = [
  { dept: 'Muhendislik', rate: 94, count: 17 },
  { dept: 'Satis', rate: 92, count: 11 },
  { dept: 'Pazarlama', rate: 88, count: 7 },
  { dept: 'Musteri Hizmetleri', rate: 75, count: 6 },
  { dept: 'Urun', rate: 100, count: 6 },
  { dept: 'IK', rate: 80, count: 4 },
];

/* ─── Past Survey History Data ─── */
const pastSurveys: PastSurveyRow[] = [
  {
    id: 'ps1',
    week: 'Mart Hf4',
    instrument: 'BAT-12-TR',
    participation: 87,
    avgScore: 2.45,
    level: 'green',
    trend: 'up',
    trendDiff: 0.12,
    subscaleBreakdown: [
      { dept: 'Satis', exhaustion: 2.8, mentalDistance: 2.5, cognitive: 2.1, emotional: 2.3 },
      { dept: 'Muhendislik', exhaustion: 2.3, mentalDistance: 2.1, cognitive: 1.8, emotional: 1.9 },
      { dept: 'Urun', exhaustion: 2.0, mentalDistance: 1.9, cognitive: 1.7, emotional: 1.8 },
      { dept: 'Musteri Hizmetleri', exhaustion: 3.1, mentalDistance: 2.7, cognitive: 2.4, emotional: 2.8 },
      { dept: 'IK', exhaustion: 2.2, mentalDistance: 2.0, cognitive: 1.9, emotional: 2.1 },
    ],
  },
  {
    id: 'ps2',
    week: 'Mart Hf3',
    instrument: 'BAT-12-TR',
    participation: 82,
    avgScore: 2.33,
    level: 'green',
    trend: 'same',
    trendDiff: 0,
    subscaleBreakdown: [
      { dept: 'Satis', exhaustion: 2.7, mentalDistance: 2.4, cognitive: 2.0, emotional: 2.2 },
      { dept: 'Muhendislik', exhaustion: 2.2, mentalDistance: 2.0, cognitive: 1.7, emotional: 1.8 },
      { dept: 'Urun', exhaustion: 1.9, mentalDistance: 1.8, cognitive: 1.6, emotional: 1.7 },
      { dept: 'Musteri Hizmetleri', exhaustion: 3.0, mentalDistance: 2.6, cognitive: 2.3, emotional: 2.7 },
      { dept: 'IK', exhaustion: 2.1, mentalDistance: 1.9, cognitive: 1.8, emotional: 2.0 },
    ],
  },
  {
    id: 'ps3',
    week: 'Mart Hf2',
    instrument: 'BAT-12-TR',
    participation: 91,
    avgScore: 2.33,
    level: 'green',
    trend: 'down',
    trendDiff: -0.15,
    subscaleBreakdown: [
      { dept: 'Satis', exhaustion: 2.6, mentalDistance: 2.3, cognitive: 1.9, emotional: 2.1 },
      { dept: 'Muhendislik', exhaustion: 2.1, mentalDistance: 1.9, cognitive: 1.6, emotional: 1.7 },
      { dept: 'Urun', exhaustion: 1.8, mentalDistance: 1.7, cognitive: 1.5, emotional: 1.6 },
      { dept: 'Musteri Hizmetleri', exhaustion: 2.9, mentalDistance: 2.5, cognitive: 2.2, emotional: 2.6 },
      { dept: 'IK', exhaustion: 2.0, mentalDistance: 1.8, cognitive: 1.7, emotional: 1.9 },
    ],
  },
];

/* ─── Department Participation Detail ─── */
const deptParticipationDetail: DeptParticipation[] = [
  { dept: 'Satis', rate: 92, filled: 22, total: 24, warning: false },
  { dept: 'Muhendislik', rate: 89, filled: 16, total: 18, warning: false },
  { dept: 'Urun', rate: 100, filled: 8, total: 8, warning: false },
  { dept: 'Musteri Hizmetleri', rate: 80, filled: 8, total: 10, warning: false },
  { dept: 'IK', rate: 75, filled: 3, total: 4, warning: true },
];

/* ─── Norm Comparison Data ─── */
const normData: NormRow[] = [
  { dimension: 'Tukenmislik', org: 2.65, sector: 2.40, turkey: 2.55, diff: 0.25, warning: true },
  { dimension: 'Zihinsel Uzaklasma', org: 2.31, sector: 2.10, turkey: 2.20, diff: 0.21, warning: true },
  { dimension: 'Bilissel Bozulma', org: 1.95, sector: 1.90, turkey: 1.85, diff: 0.05, warning: false },
  { dimension: 'Duygusal Bozulma', org: 2.12, sector: 2.00, turkey: 2.10, diff: 0.12, warning: false },
];

/* ─── Component ─── */

export default function AnketlerPage() {
  const [showHistory, setShowHistory] = useState(false);
  const [surveyHistory, setSurveyHistory] = useState<SurveyHistoryEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'results'>('active');
  const [expandedPastSurvey, setExpandedPastSurvey] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('bat12-history');
      if (raw) {
        setSurveyHistory(JSON.parse(raw));
      }
    } catch {
      // Ignore
    }
  }, []);

  // Calculate next survey date (next Monday)
  const getNextSurveyDate = (): string => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 7 : 8 - dayOfWeek;
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    return nextMonday.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'long',
    });
  };

  const completionRate = 87;

  return (
    <div className="flex flex-col gap-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">Anketler</h1>
          <p className="mt-1 text-sm text-[#525252]">
            Duzenlipulse anketleriyle calisan bagliligi ve tukenmislik riskini olcun.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#262626] active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" />
          Yeni Anket Baslat
        </button>
      </div>

      {/* BAT-12-TR Featured Card */}
      <div className="relative overflow-hidden rounded-xl border border-[#E0E0FF] bg-gradient-to-br from-[#FAFAFF] via-white to-[#F5F5FF] p-6">
        <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-[#5E5CE6] opacity-[0.04]" />
        <div className="absolute bottom-0 right-16 h-20 w-20 translate-y-6 rounded-full bg-[#5E5CE6] opacity-[0.03]" />

        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#5E5CE6]/10">
                <Activity className="h-5 w-5 text-[#5E5CE6]" />
              </div>
              <div>
                <h3 className="text-[16px] font-semibold text-[#0A0A0A]">
                  BAT-12-TR Haftalik Pulse
                </h3>
                <p className="text-[12px] text-[#888]">
                  Tukenmislik Degerlendirme Araci — 12 Madde
                </p>
              </div>
            </div>

            <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-[#666]">
              Kocak, Gencay & Schaufeli (2022) tarafindan Turkceye uyarlanan BAT-12-TR olcegi ile
              haftalik tukenmislik riskini olcun. 4 boyut: Tukenmislik, Zihinsel Uzaklasma,
              Bilissel Bozulma ve Duygusal Bozulma.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-5 text-[12px] text-[#888]">
              <span className="flex items-center gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                12 soru · ~3 dakika
              </span>
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Bu hafta: %{completionRate} katilim
              </span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
              <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="#F0F0F0" strokeWidth="4" />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  fill="none"
                  stroke="#5E5CE6"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={`${(completionRate / 100) * 175.93} 175.93`}
                />
              </svg>
              <span className="absolute text-[13px] font-semibold tabular-nums text-[#0A0A0A]">
                {completionRate}%
              </span>
            </div>

            <Link
              href="/anketler/cevapla"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#5E5CE6] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#4B4AC5] active:scale-[0.97]"
            >
              Anketi Baslat
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <p className="mt-5 border-t border-[#EDEDED] pt-3 text-[11px] italic text-[#AAA]">
          Kocak, H., Gencay, O. A., & Schaufeli, W. B. (2022). BAT-12-TR: Tukenmislik
          Degerlendirme Aracinin Turkceye uyarlanmasi. Provisional European norms (Schaufeli, 2023).
        </p>
      </div>

      {/* Info cards row: Next survey + Participation + Scientific note */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Next survey date */}
        <div className="rounded-lg border border-[#EDEDED] bg-white p-4">
          <div className="flex items-center gap-2 text-[#5E5CE6]">
            <CalendarDays className="h-4 w-4" />
            <span className="text-[12px] font-semibold uppercase tracking-wider">
              Sonraki Anket
            </span>
          </div>
          <p className="mt-2 text-[14px] font-semibold text-[#0A0A0A]">{getNextSurveyDate()}</p>
          <p className="mt-0.5 text-[11px] text-[#888]">
            BAT-12-TR Haftalik Pulse — Hafta 15
          </p>
        </div>

        {/* Participation stats */}
        <div className="rounded-lg border border-[#EDEDED] bg-white p-4">
          <div className="flex items-center gap-2 text-[#059669]">
            <Users className="h-4 w-4" />
            <span className="text-[12px] font-semibold uppercase tracking-wider">
              Katilim Orani
            </span>
          </div>
          <p className="mt-2 text-[14px] font-semibold text-[#0A0A0A]">%87 genel katilim</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {participationByDept.slice(0, 3).map((d) => (
              <span
                key={d.dept}
                className="inline-flex items-center rounded bg-[#F5F5F5] px-1.5 py-0.5 text-[10px] font-medium text-[#525252]"
              >
                {d.dept}: %{d.rate}
              </span>
            ))}
          </div>
        </div>

        {/* Scientific note */}
        <div className="rounded-lg border border-[#E0E0FF] bg-[#FAFAFF] p-4">
          <div className="flex items-center gap-2 text-[#5E5CE6]">
            <BookOpen className="h-4 w-4" />
            <span className="text-[12px] font-semibold uppercase tracking-wider">
              Bilimsel Kaynak
            </span>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-[#525252]">
            BAT-12-TR: Kocak, Gencay & Schaufeli (2022), N=2.778. Turkiye ornekleminde
            gecerlilik ve guvenilirlik calismasi yapilmistir.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div>
        <div className="flex gap-1 border-b border-[#EDEDED]">
          <button
            type="button"
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2.5 text-[13px] font-medium transition-colors ${
              activeTab === 'active'
                ? 'border-b-2 border-[#0A0A0A] text-[#0A0A0A]'
                : 'text-[#888] hover:text-[#525252]'
            }`}
          >
            Aktif Anketler
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('results')}
            className={`px-4 py-2.5 text-[13px] font-medium transition-colors ${
              activeTab === 'results'
                ? 'border-b-2 border-[#0A0A0A] text-[#0A0A0A]'
                : 'text-[#888] hover:text-[#525252]'
            }`}
          >
            Sonuclar
          </button>
        </div>

        {/* Active Surveys Tab */}
        {activeTab === 'active' && (
          <div className="mt-6 flex flex-col gap-4">
            {surveys.map((survey) => {
              const config = statusConfig[survey.status] ?? { label: survey.status, bg: 'bg-[#F5F5F5]', text: 'text-[#888]' };
              const completionPercent = Math.round(
                (survey.responseCount / survey.targetCount) * 100,
              );

              return (
                <div
                  key={survey.id}
                  className="rounded-lg border border-[#EDEDED] bg-white p-5 transition-colors hover:border-[#D4D4D4]"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-[15px] font-semibold text-[#0A0A0A]">{survey.name}</h3>
                        <span
                          className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold ${config.bg} ${config.text}`}
                        >
                          {config.label}
                        </span>
                      </div>
                      <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-[#888]">
                        {survey.description}
                      </p>
                      <div className="mt-3 flex items-center gap-5 text-[12px] text-[#888]">
                        <span className="flex items-center gap-1.5">
                          <BarChart3 className="h-3.5 w-3.5" />
                          {survey.questionCount} soru
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5" />
                          {survey.responseCount}/{survey.targetCount} katilim
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(survey.closeAt).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                          })}{' '}
                          kapanis
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-5">
                      <div className="relative flex h-16 w-16 shrink-0 items-center justify-center">
                        <svg className="h-16 w-16 -rotate-90" viewBox="0 0 64 64">
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            fill="none"
                            stroke="#F5F5F5"
                            strokeWidth="4"
                          />
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            fill="none"
                            stroke={
                              completionPercent >= 80
                                ? '#059669'
                                : completionPercent >= 50
                                  ? '#5E5CE6'
                                  : '#D97706'
                            }
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={`${(completionPercent / 100) * 175.93} 175.93`}
                          />
                        </svg>
                        <span className="absolute text-[13px] font-semibold tabular-nums text-[#0A0A0A]">
                          {completionPercent}%
                        </span>
                      </div>

                      {survey.status === 'OPEN' ? (
                        <Link
                          href="/anketler/cevapla"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0A0A0A] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[#262626] active:scale-[0.97]"
                        >
                          Anketi Cevapla
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      ) : (
                        <Link
                          href="/anketler/sonuclar"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#EDEDED] px-4 py-2 text-sm font-medium text-[#525252] transition-all hover:border-[#D4D4D4] hover:bg-[#FAFAFA]"
                        >
                          Sonuclari Gor
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <p className="mt-2 text-[11px] italic text-[#AAA]">
              BAT-12-TR: Kocak, Gencay & Schaufeli (2022). Turkceye uyarlanmis Tukenmislik
              Degerlendirme Araci.
            </p>
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div className="mt-6 flex flex-col gap-6">

            {/* ── Survey History Section ── */}
            <div className="rounded-lg border border-[#EDEDED] bg-white">
              <div className="border-b border-[#EDEDED] px-5 py-4">
                <h3 className="text-base font-semibold text-[#0A0A0A]">Gecmis Anket Sonuclari</h3>
                <p className="mt-0.5 text-xs text-[#A3A3A3]">
                  Tamamlanan anketlerin haftalik ozeti — satira tiklayarak departman kirilimini gorun
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#EDEDED] text-xs font-medium text-[#A3A3A3]">
                      <th className="px-5 py-3">Tarih</th>
                      <th className="px-4 py-3">Instrument</th>
                      <th className="px-4 py-3">Katilim</th>
                      <th className="px-4 py-3">Ort. Skor</th>
                      <th className="px-4 py-3 text-right">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDEDED]">
                    {pastSurveys.map((ps) => (
                      <tr key={ps.id} className="group">
                        <td colSpan={5} className="p-0">
                          <button
                            type="button"
                            onClick={() => setExpandedPastSurvey(expandedPastSurvey === ps.id ? null : ps.id)}
                            className="flex w-full items-center text-left transition-colors hover:bg-[#FAFAFA]"
                          >
                            <span className="px-5 py-3.5 text-[13px] font-medium text-[#0A0A0A]">{ps.week}</span>
                            <span className="px-4 py-3.5 text-[13px] text-[#525252]">{ps.instrument}</span>
                            <span className="px-4 py-3.5 text-[13px] tabular-nums text-[#525252]">%{ps.participation}</span>
                            <span className="px-4 py-3.5">
                              <span
                                className="inline-flex items-center rounded-full px-2 py-0.5 text-[12px] font-semibold tabular-nums"
                                style={{
                                  backgroundColor: RISK_BG_COLORS[ps.level],
                                  color: RISK_COLORS[ps.level],
                                }}
                              >
                                {ps.avgScore.toFixed(2)}
                              </span>
                            </span>
                            <span className="ml-auto px-4 py-3.5 text-right">
                              <span className={`inline-flex items-center gap-1 text-[12px] font-semibold tabular-nums ${
                                ps.trend === 'up' ? 'text-[#DC2626]' : ps.trend === 'down' ? 'text-[#059669]' : 'text-[#888]'
                              }`}>
                                {ps.trend === 'up' && <TrendingUp className="h-3.5 w-3.5" />}
                                {ps.trend === 'down' && <TrendingDown className="h-3.5 w-3.5" />}
                                {ps.trend === 'same' && <Minus className="h-3.5 w-3.5" />}
                                {ps.trend === 'up' ? `+${ps.trendDiff.toFixed(2)}` : ps.trend === 'down' ? ps.trendDiff.toFixed(2) : 'ayni'}
                              </span>
                            </span>
                          </button>

                          {/* Expanded subscale breakdown per department */}
                          {expandedPastSurvey === ps.id && (
                            <div className="border-t border-[#F0F0F0] bg-[#FAFAFF] px-5 py-4">
                              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-[#A3A3A3]">
                                Departman Bazli Alt Boyut Kirilimi
                              </p>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-[12px]">
                                  <thead>
                                    <tr className="text-[11px] font-medium text-[#A3A3A3]">
                                      <th className="pb-2 pr-4">Departman</th>
                                      <th className="pb-2 px-3 text-center">Tukenmislik</th>
                                      <th className="pb-2 px-3 text-center">Zihinsel Uz.</th>
                                      <th className="pb-2 px-3 text-center">Bilissel Boz.</th>
                                      <th className="pb-2 px-3 text-center">Duygusal Boz.</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {ps.subscaleBreakdown.map((row) => (
                                      <tr key={row.dept} className="border-t border-[#EDEDED]">
                                        <td className="py-2 pr-4 font-medium text-[#0A0A0A]">{row.dept}</td>
                                        {[row.exhaustion, row.mentalDistance, row.cognitive, row.emotional].map((val, i) => (
                                          <td key={i} className="py-2 px-3 text-center">
                                            <span
                                              className="inline-flex min-w-[40px] items-center justify-center rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums"
                                              style={{
                                                backgroundColor: val >= 3.02 ? '#FEE2E2' : val >= 2.58 ? '#FEF3C7' : '#D1FAE5',
                                                color: val >= 3.02 ? '#DC2626' : val >= 2.58 ? '#D97706' : '#059669',
                                              }}
                                            >
                                              {val.toFixed(1)}
                                            </span>
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Department Participation Rates (Detailed) ── */}
            <div className="rounded-lg border border-[#EDEDED] bg-white">
              <div className="border-b border-[#EDEDED] px-5 py-4">
                <h3 className="text-base font-semibold text-[#0A0A0A]">
                  Departman Katilim Oranlari
                </h3>
                <p className="mt-0.5 text-xs text-[#A3A3A3]">Hafta 14 katilim dagilimi — kisi bazinda detay</p>
              </div>
              <div className="p-5">
                <div className="flex flex-col gap-3">
                  {deptParticipationDetail.map((dept) => (
                    <div key={dept.dept}>
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="flex items-center gap-2 font-medium text-[#525252]">
                          {dept.dept}
                          <span className="text-[11px] text-[#A3A3A3]">
                            ({dept.filled}/{dept.total} kisi)
                          </span>
                          {dept.warning && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-semibold text-[#D97706]">
                              <AlertTriangle className="h-3 w-3" />
                              Dusuk katilim
                            </span>
                          )}
                        </span>
                        <span className="font-semibold tabular-nums text-[#0A0A0A]">
                          %{dept.rate}
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-[#F5F5F5]">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${dept.rate}%`,
                            backgroundColor:
                              dept.rate >= 90 ? '#059669' : dept.rate >= 70 ? '#5E5CE6' : '#D97706',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Norm Comparison Table ── */}
            <div className="rounded-lg border border-[#EDEDED] bg-white">
              <div className="border-b border-[#EDEDED] px-5 py-4">
                <h3 className="text-base font-semibold text-[#0A0A0A]">Norm Karsilastirma Tablosu</h3>
                <p className="mt-0.5 text-xs text-[#A3A3A3]">Kurum, sektor ve Turkiye normlari ile kiyaslama</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[#EDEDED] text-xs font-medium text-[#A3A3A3]">
                      <th className="px-5 py-3">Boyut</th>
                      <th className="px-4 py-3 text-center">Kurum</th>
                      <th className="px-4 py-3 text-center">Sektor</th>
                      <th className="px-4 py-3 text-center">Turkiye</th>
                      <th className="px-4 py-3 text-right">Fark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDEDED]">
                    {normData.map((row) => (
                      <tr key={row.dimension} className="transition-colors hover:bg-[#FAFAFA]">
                        <td className="px-5 py-3.5 font-medium text-[#0A0A0A]">{row.dimension}</td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="font-semibold tabular-nums text-[#0A0A0A]">{row.org.toFixed(2)}</span>
                        </td>
                        <td className="px-4 py-3.5 text-center tabular-nums text-[#525252]">{row.sector.toFixed(2)}</td>
                        <td className="px-4 py-3.5 text-center tabular-nums text-[#525252]">{row.turkey.toFixed(2)}</td>
                        <td className="px-4 py-3.5 text-right">
                          <span className={`inline-flex items-center gap-1 font-semibold tabular-nums text-[12px] ${
                            row.warning ? 'text-[#D97706]' : 'text-[#059669]'
                          }`}>
                            {row.diff > 0 ? '+' : ''}{row.diff.toFixed(2)}
                            {row.warning && <AlertTriangle className="h-3 w-3" />}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-[#EDEDED] px-5 py-3">
                <p className="text-[11px] italic text-[#AAA]">
                  Not: Sektor ve Turkiye normlari provisional European norms&apos;a dayanmaktadir (Schaufeli 2023).
                </p>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ── Survey Configuration Panel ── */}
      <div>
        <button
          type="button"
          onClick={() => setShowConfig((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-lg border border-[#EDEDED] bg-white px-5 py-3 transition-colors hover:border-[#D4D4D4]"
        >
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-[#5E5CE6]" />
            <span className="text-[13px] font-semibold text-[#0A0A0A]">
              Anket Yapilandirma Paneli
            </span>
          </div>
          {showConfig ? (
            <ChevronUp className="h-4 w-4 text-[#888]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[#888]" />
          )}
        </button>

        <div
          className={`overflow-hidden transition-all duration-300 ${
            showConfig ? 'mt-2 max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {/* BAT-12-TR Pulse Config */}
            <div className="rounded-lg border border-[#E0E0FF] bg-[#FAFAFF] p-5">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="h-4 w-4 text-[#5E5CE6]" />
                <h4 className="text-[14px] font-semibold text-[#0A0A0A]">BAT-12-TR Pulse Ayarlari</h4>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { label: 'Siklik', value: 'Haftalik (Pazartesi 09:00)' },
                  { label: 'Hedef', value: 'Tum calisanlar' },
                  { label: 'Hatirlatma', value: '72 saat sonra, max 3 kez' },
                  { label: 'Anonimlik', value: 'Aktif (min N=5)' },
                  { label: 'Dil', value: 'Turkce' },
                  { label: 'Soru sayisi', value: '12 soru · ~3 dakika' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-[12px]">
                    <span className="text-[#888]">{item.label}</span>
                    <span className="font-medium text-[#0A0A0A]">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 rounded bg-[#D1FAE5] px-2.5 py-1.5">
                <div className="h-2 w-2 rounded-full bg-[#059669]" />
                <span className="text-[11px] font-medium text-[#059669]">Aktif — sonraki gonderim Pazartesi 09:00</span>
              </div>
            </div>

            {/* COPSOQ-III-TR Config */}
            <div className="rounded-lg border border-[#EDEDED] bg-white p-5">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-4 w-4 text-[#D97706]" />
                <h4 className="text-[14px] font-semibold text-[#0A0A0A]">COPSOQ-III-TR Ayarlari</h4>
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { label: 'Siklik', value: 'Aylik (her ayin 1\'i)' },
                  { label: 'Hedef', value: 'Tum calisanlar' },
                  { label: 'Soru sayisi', value: '40 soru · ~8 dakika' },
                  { label: 'Hatirlatma', value: '5 gun sonra, max 2 kez' },
                  { label: 'Anonimlik', value: 'Aktif (min N=5)' },
                  { label: 'Dil', value: 'Turkce' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between text-[12px]">
                    <span className="text-[#888]">{item.label}</span>
                    <span className="font-medium text-[#0A0A0A]">{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 rounded bg-[#FEF3C7] px-2.5 py-1.5">
                <div className="h-2 w-2 rounded-full bg-[#D97706]" />
                <span className="text-[11px] font-medium text-[#D97706]">Planli — sonraki gonderim 1 Mayis 2026</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Survey history from localStorage */}
      <div>
        <button
          type="button"
          onClick={() => setShowHistory((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-lg border border-[#EDEDED] bg-white px-5 py-3 transition-colors hover:border-[#D4D4D4]"
        >
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-[#5E5CE6]" />
            <span className="text-[13px] font-semibold text-[#0A0A0A]">
              Gecmis Anket Sonuclariniz
            </span>
            {surveyHistory.length > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#F5F5F5] px-1.5 text-[11px] font-medium text-[#888]">
                {surveyHistory.length}
              </span>
            )}
          </div>
          {showHistory ? (
            <ChevronUp className="h-4 w-4 text-[#888]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[#888]" />
          )}
        </button>

        <div
          className={`overflow-hidden transition-all duration-300 ${
            showHistory ? 'mt-2 max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          {surveyHistory.length === 0 ? (
            <div className="rounded-lg border border-[#EDEDED] bg-[#FAFAFA] px-5 py-8 text-center">
              <p className="text-xs text-[#A3A3A3]">
                Henuz tamamlanmis anket yok. BAT-12-TR anketini tamamladiginizda sonuclariniz
                burada gorunecek.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-[#EDEDED] bg-white">
              <div className="divide-y divide-[#EDEDED]">
                {surveyHistory.map((entry, idx) => {
                  const dateStr = new Date(entry.date).toLocaleDateString('tr-TR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  const prevEntry = surveyHistory[idx + 1];
                  const diff = prevEntry ? entry.total - prevEntry.total : null;

                  return (
                    <div key={`${entry.date}-${idx}`} className="flex items-center gap-4 px-5 py-3">
                      {/* Score circle */}
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white"
                        style={{ backgroundColor: RISK_COLORS[entry.level] }}
                      >
                        {entry.total.toFixed(1)}
                      </div>

                      {/* Details */}
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-[#0A0A0A]">
                          BAT-12-TR Sonucu
                        </p>
                        <p className="text-[11px] text-[#888]">{dateStr}</p>
                      </div>

                      {/* Subscale mini bars */}
                      <div className="hidden gap-1 sm:flex">
                        {(['exhaustion', 'mentalDistance', 'cognitive', 'emotional'] as const).map(
                          (key) => (
                            <div key={key} className="flex flex-col items-center gap-0.5">
                              <div className="h-6 w-3 overflow-hidden rounded-sm bg-[#F5F5F5]">
                                <div
                                  className="w-full rounded-sm"
                                  style={{
                                    height: `${(entry.subscales[key] / 5) * 100}%`,
                                    backgroundColor:
                                      entry.subscales[key] >= 3.02
                                        ? '#DC2626'
                                        : entry.subscales[key] >= 2.58
                                          ? '#D97706'
                                          : '#059669',
                                    marginTop: `${100 - (entry.subscales[key] / 5) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ),
                        )}
                      </div>

                      {/* Risk badge */}
                      <span
                        className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
                        style={{
                          backgroundColor: RISK_BG_COLORS[entry.level],
                          color: RISK_COLORS[entry.level],
                        }}
                      >
                        {RISK_LABELS[entry.level]}
                      </span>

                      {/* Trend diff */}
                      {diff !== null && (
                        <span
                          className={`text-[12px] font-semibold tabular-nums ${
                            diff > 0 ? 'text-[#DC2626]' : diff < 0 ? 'text-[#059669]' : 'text-[#888]'
                          }`}
                        >
                          {diff > 0 ? '+' : ''}{diff.toFixed(2)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
