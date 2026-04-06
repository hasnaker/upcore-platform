'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { STRENGTH_DOMAINS, DEPARTMENT_AVERAGES } from '../lib/strengths-data';
import {
  loadResults,
  clearStrengthsData,
  getScoreLabel,
  getScoreColor,
  type StrengthsResult,
  type DomainScore,
} from '../lib/strengths-scoring';

export default function SonuclarPage() {
  const router = useRouter();
  const [results, setResults] = useState<StrengthsResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = loadResults();
    setResults(saved);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div style={{ fontFamily: 'Inter, sans-serif' }} className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <svg className="h-8 w-8 animate-spin text-[#5E5CE6]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span style={{ fontSize: 14, color: '#888' }}>Sonuçlar yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div style={{ fontFamily: 'Inter, sans-serif' }} className="flex flex-col items-center gap-6 py-20">
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: '#FEF3C7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg className="h-8 w-8 text-[#D97706]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: '#111' }}>Sonuç Bulunamadı</h2>
        <p style={{ fontSize: 14, color: '#888', textAlign: 'center', maxWidth: 400 }}>
          Henüz bir güçlü yön değerlendirmesi tamamlamadınız. Sonuçlarınızı görmek için önce
          değerlendirmeyi tamamlayın.
        </p>
        <Link
          href="/guclu-yonler/kesfet"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 24px',
            background: '#5E5CE6',
            color: '#fff',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 600,
          }}
          className="hover:opacity-90"
        >
          Değerlendirmeye Başla
        </Link>
      </div>
    );
  }

  return <ResultsView results={results} router={router} />;
}

function ResultsView({
  results,
  router,
}: {
  results: StrengthsResult;
  router: ReturnType<typeof useRouter>;
}) {
  const [selectedDept] = useState('Mühendislik');
  const deptAvg = DEPARTMENT_AVERAGES[selectedDept] ?? {};

  const resultDate = useMemo(() => {
    try {
      return new Date(results.timestamp).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  }, [results.timestamp]);

  const handleRetake = () => {
    clearStrengthsData();
    router.push('/guclu-yonler/kesfet');
  };

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }} className="flex flex-col gap-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111', letterSpacing: '-0.02em' }}>
            Güçlü Yön Sonuçları
          </h1>
          <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>
            UpStrengths-TR · Değerlendirme tarihi: {resultDate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRetake}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #f0f0f0',
              background: '#fff',
              fontSize: 13,
              fontWeight: 500,
              color: '#555',
              cursor: 'pointer',
            }}
            className="hover:bg-[#fafafa]"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Yeniden Değerlendir
          </button>
          <Link
            href="/guclu-yonler"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 16px',
              borderRadius: 8,
              border: '1px solid #f0f0f0',
              background: '#fff',
              fontSize: 13,
              fontWeight: 500,
              color: '#555',
            }}
            className="hover:bg-[#fafafa]"
          >
            Genel Bakış
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard
          label="Profil Tamamlanma"
          value={`%${results.overallProfile}`}
          color="#5E5CE6"
        />
        <SummaryCard label="Rol Uyumu" value={`%${results.roleFitScore}`} color="#059669" />
        <SummaryCard
          label="En Güçlü Alan"
          value={results.top5[0]?.name_tr ?? '—'}
          color={results.top5[0]?.color ?? '#111'}
        />
        <SummaryCard
          label="En Güçlü Skor"
          value={results.top5[0]?.score.toFixed(1) ?? '—'}
          color={results.top5[0]?.color ?? '#111'}
        />
      </div>

      {/* TOP 5 SIGNATURE STRENGTHS */}
      <section>
        <SectionHeader
          title="Güçlü Yönleriniz"
          subtitle="VIA taksonomisi bazlı imza güçlü yönleriniz (Top 5)"
        />
        <div className="flex flex-col gap-3">
          {results.top5.map((domain, index) => (
            <Top5Card key={domain.domainId} domain={domain} rank={index + 1} />
          ))}
        </div>
      </section>

      {/* 8-DOMAIN BAR CHART */}
      <section>
        <SectionHeader
          title="8 Alan Profili"
          subtitle="Tüm güçlü yön alanlarınızın karşılaştırmalı görünümü"
        />
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #f0f0f0',
            padding: 24,
          }}
        >
          <div className="flex flex-col gap-4">
            {results.domains.map((domain) => (
              <DomainBar key={domain.domainId} domain={domain} />
            ))}
          </div>
        </div>
      </section>

      {/* RADAR CHART (SVG) */}
      <section>
        <SectionHeader
          title="Güçlü Yön Haritası"
          subtitle="8 alanın radar görselleştirmesi"
        />
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #f0f0f0',
            padding: 24,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <RadarChart domains={results.domains} />
        </div>
      </section>

      {/* SHADOW STRENGTHS */}
      {results.shadow.length > 0 && (
        <section>
          <SectionHeader
            title="Gelişim Potansiyeli Olan Alanlar"
            subtitle="Shadow strengths (#6-#7) — Geliştirme potansiyeli yüksek alanlar"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {results.shadow.map((domain) => (
              <ShadowCard key={domain.domainId} domain={domain} />
            ))}
          </div>
        </section>
      )}

      {/* WEAKNESS AREAS */}
      {results.weaknesses.length > 0 && (
        <section>
          <SectionHeader
            title="Dikkat Edilmesi Gereken Alanlar"
            subtitle="Düşük skorlu alanlar — Farkındalık ve gelişim odağı"
          />
          <div className="flex flex-col gap-3">
            {results.weaknesses.map((domain) => (
              <WeaknessCard key={domain.domainId} domain={domain} />
            ))}
          </div>
        </section>
      )}

      {/* ROLE FIT ANALYSIS */}
      <section>
        <SectionHeader
          title="Rol Uyum Analizi"
          subtitle="Mevcut pozisyonunuzla güçlü yön uyumu"
        />
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #f0f0f0',
            padding: 24,
          }}
        >
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
            {/* Circular gauge */}
            <RoleFitGauge score={results.roleFitScore} />

            <div className="flex-1">
              <h4 style={{ fontSize: 15, fontWeight: 600, color: '#111', marginBottom: 8 }}>
                Mevcut Pozisyonunuzla Uyum: %{results.roleFitScore}
              </h4>
              <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6, marginBottom: 16 }}>
                Güçlü yön profiliniz mevcut pozisyonunuzla{' '}
                {results.roleFitScore >= 80
                  ? 'yüksek düzeyde uyumlu'
                  : results.roleFitScore >= 60
                    ? 'orta düzeyde uyumlu'
                    : 'düşük düzeyde uyumlu'}
                . En güçlü alanlarınız olan{' '}
                <strong>{results.top5[0]?.name_tr}</strong> ve{' '}
                <strong>{results.top5[1]?.name_tr}</strong> bu rol için kritik öneme sahip.
              </p>
              <div className="flex flex-wrap gap-2">
                {results.top5.slice(0, 3).map((d) => (
                  <span
                    key={d.domainId}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#059669',
                      background: '#D1FAE5',
                    }}
                  >
                    {d.name_tr} — Uyumlu
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DEVELOPMENT SUGGESTIONS */}
      <section>
        <SectionHeader
          title="Gelişim Önerileri"
          subtitle="Güçlü yönlerinizi daha da geliştirmek için öneriler"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          {results.developmentSuggestions.map((item) => (
            <div
              key={item.domain}
              style={{
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #f0f0f0',
                padding: 20,
              }}
            >
              <h4 style={{ fontSize: 14, fontWeight: 600, color: '#111', marginBottom: 12 }}>
                {item.domain}
              </h4>
              <ul className="flex flex-col gap-2">
                {item.suggestions.map((suggestion, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        background: '#5E5CE6',
                        marginTop: 6,
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* PEER COMPARISON */}
      <section>
        <SectionHeader
          title="Departman Karşılaştırması"
          subtitle={`${selectedDept} departmanı ortalaması ile anonim karşılaştırma`}
        />
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            border: '1px solid #f0f0f0',
            padding: 24,
          }}
        >
          <div className="flex flex-col gap-4">
            {results.domains.map((domain) => {
              const avg = deptAvg[domain.domainId] ?? 3.0;
              const diff = domain.score - avg;
              return (
                <div key={domain.domainId} className="flex items-center gap-3">
                  <span style={{ fontSize: 12, color: '#555', width: 130, flexShrink: 0 }}>
                    {domain.name_tr}
                  </span>
                  <div style={{ flex: 1, position: 'relative', height: 20 }}>
                    {/* Background */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 6,
                        left: 0,
                        right: 0,
                        height: 8,
                        background: '#f0f0f0',
                        borderRadius: 4,
                      }}
                    />
                    {/* Dept avg marker */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: `${(avg / 5) * 100}%`,
                        width: 2,
                        height: 20,
                        background: '#aaa',
                        transform: 'translateX(-1px)',
                      }}
                      title={`Departman ort: ${avg.toFixed(1)}`}
                    />
                    {/* Your score bar */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 6,
                        left: 0,
                        width: `${(domain.score / 5) * 100}%`,
                        height: 8,
                        background: domain.color,
                        borderRadius: 4,
                        opacity: 0.8,
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#111', width: 30, textAlign: 'right' }}>
                    {domain.score.toFixed(1)}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: diff >= 0 ? '#059669' : '#DC2626',
                      width: 40,
                      textAlign: 'right',
                    }}
                  >
                    {diff >= 0 ? '+' : ''}
                    {diff.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>
          <div
            style={{
              marginTop: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontSize: 11,
              color: '#aaa',
            }}
          >
            <span className="flex items-center gap-2">
              <span style={{ width: 12, height: 2, background: '#aaa', display: 'inline-block' }} />
              Departman ortalaması
            </span>
            <span className="flex items-center gap-2">
              <span style={{ width: 12, height: 8, background: '#5E5CE6', borderRadius: 2, display: 'inline-block', opacity: 0.8 }} />
              Sizin skorunuz
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─── COMPONENTS ─── */

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ fontSize: 17, fontWeight: 700, color: '#111' }}>{title}</h3>
      <p style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{subtitle}</p>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #f0f0f0',
        padding: 16,
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 500, color: '#888' }}>{label}</span>
      <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 6 }}>{value}</div>
    </div>
  );
}

function Top5Card({ domain, rank }: { domain: DomainScore; rank: number }) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #f0f0f0',
        padding: 20,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 16,
      }}
    >
      {/* Rank Badge */}
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: rank <= 3 ? `${domain.color}14` : '#f8f8f8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 18,
          fontWeight: 800,
          color: rank <= 3 ? domain.color : '#aaa',
          flexShrink: 0,
        }}
      >
        {rank}
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="flex items-center gap-3" style={{ marginBottom: 6 }}>
          <h4 style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{domain.name_tr}</h4>
          <span
            style={{
              padding: '2px 10px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 700,
              color: domain.color,
              background: `${domain.color}14`,
            }}
          >
            {domain.score.toFixed(1)}/5.0
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: getScoreColor(domain.score),
            }}
          >
            {getScoreLabel(domain.score)}
          </span>
        </div>
        <p style={{ fontSize: 13, color: '#555', lineHeight: 1.5, marginBottom: 10 }}>
          {domain.description_tr}
        </p>
        {/* Facets */}
        <div className="flex flex-wrap gap-2">
          {domain.facets.map((facet) => (
            <span
              key={facet.name}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 10px',
                borderRadius: 16,
                fontSize: 11,
                fontWeight: 500,
                color: '#555',
                background: '#f8f8f8',
                border: '1px solid #f0f0f0',
              }}
            >
              {facet.name}
              <span style={{ fontWeight: 700, color: getScoreColor(facet.score) }}>
                {facet.score}/5
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Score visual */}
      <div className="hidden sm:flex sm:flex-col sm:items-center sm:gap-1">
        <MiniGauge value={domain.score} max={5} color={domain.color} />
      </div>
    </div>
  );
}

function MiniGauge({ value, max, color }: { value: number; max: number; color: string }) {
  const size = 52;
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / max) * circumference;
  const center = size / 2;

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={center} cy={center} r={radius} fill="none" stroke="#f0f0f0" strokeWidth={strokeWidth} />
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${progress} ${circumference - progress}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

function ShadowCard({ domain }: { domain: DomainScore }) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #f0f0f0',
        padding: 20,
      }}
    >
      <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
        <div className="flex items-center gap-2">
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: '#FEF3C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              color: '#D97706',
            }}
          >
            {domain.rank}
          </span>
          <h4 style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{domain.name_tr}</h4>
        </div>
        <span
          style={{
            padding: '2px 8px',
            borderRadius: 16,
            fontSize: 12,
            fontWeight: 700,
            color: '#D97706',
            background: '#FEF3C7',
          }}
        >
          {domain.score.toFixed(1)}
        </span>
      </div>
      <p style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>
        Bu alan gelişim potansiyeli taşıyor. Hedefli çalışmayla güçlü yönleriniz arasına
        girebilir.
      </p>
      <div
        style={{
          width: '100%',
          height: 4,
          background: '#f0f0f0',
          borderRadius: 2,
          overflow: 'hidden',
          marginTop: 12,
        }}
      >
        <div
          style={{
            width: `${(domain.score / 5) * 100}%`,
            height: '100%',
            background: '#D97706',
            borderRadius: 2,
          }}
        />
      </div>
    </div>
  );
}

function WeaknessCard({ domain }: { domain: DomainScore }) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #FEE2E2',
        padding: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: '#FEE2E2',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg className="h-4 w-4 text-[#DC2626]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{domain.name_tr}</h4>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#DC2626' }}>
            {domain.score.toFixed(1)}/5.0
          </span>
        </div>
        <p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
          Bu alan dikkat gerektiriyor. Farkındalık oluşturarak ve destek alarak geliştirebilirsiniz.
        </p>
      </div>
    </div>
  );
}

function RoleFitGauge({ score }: { score: number }) {
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const center = size / 2;
  const color = score >= 80 ? '#059669' : score >= 60 ? '#D97706' : '#DC2626';

  return (
    <div className="relative flex flex-col items-center">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#f0f0f0" strokeWidth={strokeWidth} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${progress} ${circumference - progress}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ width: size, height: size }}
      >
        <span style={{ fontSize: 24, fontWeight: 800, color: '#111' }}>%{score}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color }}>Uyum</span>
      </div>
    </div>
  );
}

function RadarChart({ domains }: { domains: DomainScore[] }) {
  const size = 300;
  const center = size / 2;
  const levels = 5;
  const angleStep = (2 * Math.PI) / domains.length;
  const maxRadius = 120;

  const getPoint = (index: number, value: number) => {
    const angle = angleStep * index - Math.PI / 2;
    const r = (value / 5) * maxRadius;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle),
    };
  };

  // Grid lines
  const gridLevels = Array.from({ length: levels }, (_, i) => i + 1);

  // Data polygon
  const dataPoints = domains.map((d, i) => getPoint(i, d.score));
  const dataPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') + ' Z';

  return (
    <svg width={size} height={size} style={{ overflow: 'visible' }}>
      {/* Grid circles */}
      {gridLevels.map((level) => {
        const r = (level / 5) * maxRadius;
        return (
          <circle key={level} cx={center} cy={center} r={r} fill="none" stroke="#f0f0f0" strokeWidth={1} />
        );
      })}

      {/* Axis lines */}
      {domains.map((_, i) => {
        const end = getPoint(i, 5);
        return (
          <line
            key={i}
            x1={center}
            y1={center}
            x2={end.x}
            y2={end.y}
            stroke="#f0f0f0"
            strokeWidth={1}
          />
        );
      })}

      {/* Data area */}
      <path d={dataPath} fill="#5E5CE620" stroke="#5E5CE6" strokeWidth={2} />

      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill={domains[i]?.color ?? '#5E5CE6'} stroke="#fff" strokeWidth={2} />
      ))}

      {/* Labels */}
      {domains.map((domain, i) => {
        const labelPoint = getPoint(i, 5.8);
        return (
          <text
            key={domain.domainId}
            x={labelPoint.x}
            y={labelPoint.y}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{ fontSize: 10, fontWeight: 600, fill: '#555' }}
          >
            {domain.name_tr}
          </text>
        );
      })}
    </svg>
  );
}

function DomainBar({ domain }: { domain: DomainScore }) {
  const pct = (domain.score / 5) * 100;

  return (
    <div className="flex items-center gap-3">
      <span style={{ fontSize: 12, color: '#555', width: 130, flexShrink: 0, fontWeight: 500 }}>
        {domain.name_tr}
      </span>
      <div className="flex-1" style={{ height: 10, background: '#f0f0f0', borderRadius: 5, overflow: 'hidden' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: domain.color,
            borderRadius: 5,
            transition: 'width 0.6s ease',
          }}
        />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#111', width: 35, textAlign: 'right' }}>
        {domain.score.toFixed(1)}
      </span>
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: getScoreColor(domain.score),
          width: 75,
          textAlign: 'right',
        }}
      >
        {getScoreLabel(domain.score)}
      </span>
    </div>
  );
}
