'use client';

import { useState } from 'react';
import type { EmployeeView } from '@/lib/employee-mapper';

interface EmployeeTabsProps {
  employee: EmployeeView;
}

type TabKey = 'genel' | 'tukenmislik' | 'guclu-yonler' | 'izinler' | 'belgeler' | 'gecmis';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'genel', label: 'Genel Bilgiler' },
  { key: 'tukenmislik', label: 'Tükenmişlik' },
  { key: 'guclu-yonler', label: 'Güçlü Yönler' },
  { key: 'izinler', label: 'İzinler' },
  { key: 'belgeler', label: 'Belgeler' },
  { key: 'gecmis', label: 'Geçmiş' },
];

export const EmployeeTabs = ({ employee }: EmployeeTabsProps) => {
  const [activeTab, setActiveTab] = useState<TabKey>('genel');

  return (
    <div>
      {/* Tab bar */}
      <div
        style={{ borderBottom: '1px solid #f0f0f0', marginBottom: 24 }}
        className="flex gap-0 overflow-x-auto"
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: activeTab === tab.key ? 600 : 400,
              color: activeTab === tab.key ? '#5E5CE6' : '#888',
              borderBottom: activeTab === tab.key ? '2px solid #5E5CE6' : '2px solid transparent',
              background: 'transparent',
              transition: 'all 150ms ease',
              whiteSpace: 'nowrap',
            }}
            className="hover:opacity-80"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'genel' && <GenelTab employee={employee} />}
      {activeTab === 'tukenmislik' && <TukenmislikTab employee={employee} />}
      {activeTab === 'guclu-yonler' && <GucluYonlerTab employee={employee} />}
      {activeTab === 'izinler' && <IzinTab employee={employee} />}
      {activeTab === 'belgeler' && <BelgeTab employee={employee} />}
      {activeTab === 'gecmis' && <GecmisTab employee={employee} />}
    </div>
  );
};

/* ─── Genel Tab ─── */

function GenelTab({ employee }: { employee: EmployeeView }) {
  const maskedTckn = employee.tckn
    ? `${'*'.repeat(Math.max(0, employee.tckn.length - 4))}${employee.tckn.slice(-4)}`
    : '—';

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Kişisel Bilgiler */}
      <div
        style={{
          background: '#fafafa',
          borderRadius: 12,
          border: '1px solid #f0f0f0',
          padding: 24,
        }}
      >
        <h3
          style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 20 }}
        >
          Kişisel Bilgiler
        </h3>
        <dl className="flex flex-col gap-4">
          <InfoRow label="TCKN" value={maskedTckn} />
          <InfoRow label="Doğum Tarihi" value={formatDate(employee.dogumTarihi)} />
          <InfoRow label="E-posta" value={employee.email || '—'} />
          <InfoRow label="Telefon" value="—" />
        </dl>
      </div>

      {/* İş Bilgileri */}
      <div
        style={{
          background: '#fafafa',
          borderRadius: 12,
          border: '1px solid #f0f0f0',
          padding: 24,
        }}
      >
        <h3
          style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 20 }}
        >
          İş Bilgileri
        </h3>
        <dl className="flex flex-col gap-4">
          <InfoRow label="Sicil No" value={employee.sicilNo || '—'} />
          <InfoRow label="İşe Başlama Tarihi" value={formatDate(employee.iseBaslama)} />
          <InfoRow
            label="Kıdem"
            value={
              employee.kidemAy > 0
                ? `${employee.kidemAy} ay`
                : '—'
            }
          />
          <InfoRow label="Departman" value={employee.departmanId || '—'} />
          <InfoRow label="Pozisyon" value={employee.pozisyonId || '—'} />
          <InfoRow label="Yönetici" value={employee.yoneticiId || '—'} />
        </dl>
      </div>
    </div>
  );
}

/* ─── Info Row ─── */

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt style={{ fontSize: 13, color: '#888', flexShrink: 0 }}>{label}</dt>
      <dd style={{ fontSize: 13, color: '#111', fontWeight: 500, textAlign: 'right' }}>
        {value}
      </dd>
    </div>
  );
}

/* ─── Circular Gauge Component ─── */

function CircularGauge({ value, size = 160, strokeWidth = 14 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 100) * circumference;
  const center = size / 2;

  const getColor = (v: number) => {
    if (v >= 70) return '#DC2626';
    if (v >= 45) return '#D97706';
    return '#059669';
  };

  const getLabel = (v: number) => {
    if (v >= 70) return 'Kritik';
    if (v >= 45) return 'Orta Risk';
    return 'Düşük';
  };

  const color = getColor(value);

  return (
    <div className="group relative flex flex-col items-center" title={`Tükenmişlik risk skoru: ${value}/100`}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#f0f0f0"
          strokeWidth={strokeWidth}
        />
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
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span style={{ fontSize: 32, fontWeight: 800, color: '#111', lineHeight: 1 }}>{value}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color, marginTop: 2 }}>{getLabel(value)}</span>
      </div>
      {/* Hover tooltip */}
      <div className="pointer-events-none absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#0A0A0A] px-3 py-1.5 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
        BAT-12 tabanlı bileşik risk hesaplaması
      </div>
    </div>
  );
}

/* ─── JD-R Factor Bar Component ─── */

interface JDRFactor {
  label: string;
  score: number;
  max: number;
  type: 'demand' | 'resource';
  status: 'red' | 'yellow' | 'green';
}

function JDRFactorBar({ factor }: { factor: JDRFactor }) {
  const pct = (factor.score / factor.max) * 100;
  const statusEmoji = factor.status === 'red' ? '🔴' : factor.status === 'yellow' ? '🟡' : '🟢';
  const barColor = factor.status === 'red' ? '#DC2626' : factor.status === 'yellow' ? '#D97706' : '#059669';
  const isDragging = factor.status === 'red';

  return (
    <div className="group relative flex items-center gap-3" title={`${factor.label}: ${factor.score}/${factor.max}`}>
      <span style={{ fontSize: 12, color: isDragging ? '#DC2626' : '#555', fontWeight: isDragging ? 600 : 400, width: 140, flexShrink: 0 }}>
        {factor.label}
      </span>
      <div style={{ flex: 1, height: 10, background: '#f0f0f0', borderRadius: 5, overflow: 'hidden', position: 'relative' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 5, transition: 'width 0.6s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#111', width: 50, textAlign: 'right' }}>
        {factor.score.toFixed(1)}/{factor.max}
      </span>
      <span style={{ fontSize: 12, width: 20 }}>{statusEmoji}</span>
      {isDragging && (
        <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#DC2626] px-2 py-1 text-[10px] font-medium text-white opacity-0 shadow transition-opacity group-hover:opacity-100">
          Dengeyi olumsuz etkiliyor
        </div>
      )}
    </div>
  );
}

/* ─── Intervention Timeline Component ─── */

interface Intervention {
  date: string;
  action: string;
  metric: string;
  before: number;
  after: number;
  improved: boolean;
}

function InterventionTimeline({ interventions }: { interventions: Intervention[] }) {
  return (
    <div className="flex flex-col">
      {interventions.map((item, i) => {
        const delta = item.after - item.before;
        const deltaStr = delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);
        const deltaColor = item.improved ? '#059669' : '#DC2626';

        return (
          <div key={i} className="group relative flex gap-4" style={{ paddingBottom: i < interventions.length - 1 ? 20 : 0 }}>
            {i < interventions.length - 1 && (
              <div style={{ position: 'absolute', left: 11, top: 24, bottom: 0, width: 2, background: item.improved ? '#D1FAE5' : '#FEE2E2' }} />
            )}
            <div
              style={{
                width: 24, height: 24, borderRadius: '50%',
                background: item.improved ? '#D1FAE5' : '#FEE2E2',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, flexShrink: 0, zIndex: 1,
              }}
            >
              {item.improved ? '✓' : '→'}
            </div>
            <div className="flex-1">
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{item.action}</div>
              <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>
                {item.metric}: {item.before.toFixed(1)} → {item.after.toFixed(1)}{' '}
                <span style={{ fontWeight: 600, color: deltaColor }}>({deltaStr})</span>
                {item.improved && <span style={{ marginLeft: 4, color: '#059669' }}>iyileşme</span>}
              </div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{item.date}</div>
            </div>
            {/* Hover tooltip */}
            <div className="pointer-events-none absolute -top-6 right-0 whitespace-nowrap rounded-md bg-[#0A0A0A] px-3 py-1 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              {item.improved ? 'Başarılı müdahale' : 'Kısmi etki'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Peer Comparison Bar Component ─── */

function PeerComparisonBar({ employeeScore, departmentAvg, companyAvg }: { employeeScore: number; departmentAvg: number; companyAvg: number }) {
  const maxVal = 5;
  const empPct = (employeeScore / maxVal) * 100;
  const deptPct = (departmentAvg / maxVal) * 100;
  const compPct = (companyAvg / maxVal) * 100;
  const diffFromDept = ((employeeScore - departmentAvg) / departmentAvg * 100).toFixed(0);
  const isAbove = employeeScore > departmentAvg;

  return (
    <div className="flex flex-col gap-4">
      {[
        { label: 'Bu çalışan', value: employeeScore, pct: empPct, color: employeeScore >= 3.02 ? '#DC2626' : employeeScore >= 2.59 ? '#D97706' : '#059669' },
        { label: 'Departman ort.', value: departmentAvg, pct: deptPct, color: '#5E5CE6' },
        { label: 'Şirket ort.', value: companyAvg, pct: compPct, color: '#A3A3A3' },
      ].map((row) => (
        <div key={row.label} className="group relative flex items-center gap-3" title={`${row.label}: ${row.value.toFixed(2)}`}>
          <span style={{ fontSize: 12, color: '#555', width: 110, flexShrink: 0 }}>{row.label}</span>
          <div style={{ flex: 1, height: 12, background: '#f0f0f0', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ width: `${row.pct}%`, height: '100%', background: row.color, borderRadius: 6, transition: 'width 0.6s' }} />
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#111', width: 35, textAlign: 'right' }}>{row.value.toFixed(2)}</span>
        </div>
      ))}
      <div style={{
        background: isAbove ? '#FEE2E2' : '#D1FAE5',
        borderRadius: 8, padding: 12, fontSize: 13,
        color: isAbove ? '#991B1B' : '#065F46',
        fontWeight: 500,
      }}>
        {isAbove
          ? `⚠️ Bu çalışanın BAT skoru departman ortalamasının %${Math.abs(Number(diffFromDept))} üzerinde`
          : `✓ Bu çalışanın BAT skoru departman ortalamasının %${Math.abs(Number(diffFromDept))} altında`
        }
      </div>
    </div>
  );
}

/* ─── Trajectory Sparkline Component ─── */

function TrajectorySparkline({ points, predicted }: { points: number[]; predicted: number }) {
  const width = 200;
  const height = 48;
  const padding = 4;
  const allPoints = [...points, predicted];
  const minY = Math.min(...allPoints) - 0.3;
  const maxY = Math.max(...allPoints) + 0.3;

  const getX = (i: number) => padding + (i / (allPoints.length - 1)) * (width - padding * 2);
  const getY = (v: number) => height - padding - ((v - minY) / (maxY - minY)) * (height - padding * 2);

  const solidPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p).toFixed(1)}`).join(' ');
  const dashPath = `M ${getX(points.length - 1).toFixed(1)} ${getY(points[points.length - 1]!).toFixed(1)} L ${getX(points.length).toFixed(1)} ${getY(predicted).toFixed(1)}`;

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <path d={solidPath} fill="none" stroke="#D97706" strokeWidth={2} />
      <path d={dashPath} fill="none" stroke="#DC2626" strokeWidth={2} strokeDasharray="4 3" />
      {points.map((p, i) => (
        <circle key={i} cx={getX(i)} cy={getY(p)} r={3} fill="#D97706" />
      ))}
      <circle cx={getX(points.length)} cy={getY(predicted)} r={4} fill="#DC2626" stroke="#fff" strokeWidth={1.5} />
    </svg>
  );
}

/* ─── Tükenmişlik Tab (DERİN — ENTERPRISE 360°) ─── */

function TukenmislikTab({ employee: _employee }: { employee: EmployeeView }) {
  // Static data — will be replaced with API call
  const bat = { exhaustion: 3.2, mentalDistance: 2.8, cognitive: 2.1, emotional: 2.5, total: 2.65 };
  const riskScore = 62; // Composite 0-100 risk score

  const level = bat.total >= 3.02 ? 'red' : bat.total >= 2.59 ? 'amber' : 'green';
  const levelLabel = level === 'red' ? 'Yüksek Risk' : level === 'amber' ? 'Orta Risk' : 'Düşük Risk';
  const levelColor = level === 'red' ? '#DC2626' : level === 'amber' ? '#D97706' : '#059669';
  const levelBg = level === 'red' ? '#FEE2E2' : level === 'amber' ? '#FEF3C7' : '#D1FAE5';

  const subscales = [
    { label: 'Tükenmişlik', score: bat.exhaustion, max: 5 },
    { label: 'Zihinsel Uzaklaşma', score: bat.mentalDistance, max: 5 },
    { label: 'Bilişsel Bozulma', score: bat.cognitive, max: 5 },
    { label: 'Duygusal Bozulma', score: bat.emotional, max: 5 },
  ];

  // Static data — will be replaced with API call
  const jdrFactors: JDRFactor[] = [
    // Talepler (demands) — yüksek = kötü
    { label: 'İş Yükü', score: 8.1, max: 10, type: 'demand', status: 'red' },
    { label: 'Zaman Baskısı', score: 7.5, max: 10, type: 'demand', status: 'red' },
    { label: 'Duygusal Talep', score: 6.2, max: 10, type: 'demand', status: 'yellow' },
    { label: 'Rol Belirsizliği', score: 4.0, max: 10, type: 'demand', status: 'green' },
    { label: 'İş-Ev Çatışması', score: 5.8, max: 10, type: 'demand', status: 'yellow' },
    { label: 'Fiziksel Talep', score: 3.2, max: 10, type: 'demand', status: 'green' },
    // Kaynaklar (resources) — düşük = kötü
    { label: 'Özerklik', score: 4.2, max: 10, type: 'resource', status: 'red' },
    { label: 'Sosyal Destek', score: 6.8, max: 10, type: 'resource', status: 'green' },
    { label: 'Geri Bildirim', score: 5.1, max: 10, type: 'resource', status: 'yellow' },
    { label: 'Gelişim Fırsatı', score: 3.5, max: 10, type: 'resource', status: 'red' },
    { label: 'Anlam Duygusu', score: 7.2, max: 10, type: 'resource', status: 'green' },
    { label: 'Takdir', score: 4.8, max: 10, type: 'resource', status: 'yellow' },
  ];

  const demands = jdrFactors.filter(f => f.type === 'demand');
  const resources = jdrFactors.filter(f => f.type === 'resource');
  const draggingFactors = jdrFactors.filter(f => f.status === 'red');

  // Static data — will be replaced with API call
  const interventions: Intervention[] = [
    { date: '15 Mart 2026', action: 'Haftalık 1:1 koçluk başlatıldı', metric: 'BAT skoru', before: 3.2, after: 2.8, improved: true },
    { date: '01 Şubat 2026', action: 'İş yükü yeniden dağıtıldı', metric: 'Talep skoru', before: 8.5, after: 7.2, improved: true },
    { date: '10 Ocak 2026', action: 'Esnek çalışma saatleri tanındı', metric: 'Özerklik', before: 3.0, after: 4.2, improved: true },
    { date: '15 Aralık 2025', action: 'Mentorluk programına dahil edildi', metric: 'Gelişim Fırsatı', before: 2.8, after: 3.5, improved: true },
    { date: '01 Aralık 2025', action: 'Takım yapısı değişikliği', metric: 'Sosyal Destek', before: 5.5, after: 6.8, improved: true },
  ];

  // Static data — will be replaced with API call
  const peerData = { employeeScore: bat.total, departmentAvg: 1.96, companyAvg: 2.12 };

  // Trajectory prediction
  const trendPoints = [2.1, 2.3, 2.5, 2.65];
  const predictedScore = 2.85;
  const burnoutProbability = 68;

  return (
    <div className="flex flex-col gap-6">
      {/* ─── SECTION 1: Risk Score Gauge + BAT Score ─── */}
      <div style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0', padding: 24 }}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-10">
          {/* Gauge */}
          <div className="flex flex-col items-center gap-3">
            <CircularGauge value={riskScore} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#555' }}>Risk Skoru</span>
          </div>

          {/* BAT Details */}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>BAT-12-TR Skoru</h3>
                <p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Son pulse survey sonucu · Koçak, Gençay & Schaufeli (2022)</p>
              </div>
              <div className="flex items-center gap-3">
                <span style={{ fontSize: 28, fontWeight: 800, color: '#111' }}>{bat.total.toFixed(2)}</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 20, background: levelBg, color: levelColor }}>{levelLabel}</span>
              </div>
            </div>

            {/* Subscale bars */}
            <div className="mt-6 flex flex-col gap-3">
              {subscales.map(s => {
                const pct = (s.score / s.max) * 100;
                const barColor = s.score >= 3.02 ? '#DC2626' : s.score >= 2.59 ? '#D97706' : '#059669';
                return (
                  <div key={s.label} className="group relative flex items-center gap-3" title={`${s.label}: ${s.score.toFixed(2)} / ${s.max}`}>
                    <span style={{ fontSize: 12, color: '#555', width: 150, flexShrink: 0 }}>{s.label}</span>
                    <div style={{ flex: 1, height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 4, transition: 'width 0.5s' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#111', width: 35, textAlign: 'right' }}>{s.score.toFixed(1)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ─── SECTION 2: JD-R Factor Breakdown (12 factors) ─── */}
      <div style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0', padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 4 }}>JD-R Faktör Analizi</h3>
        <p style={{ fontSize: 12, color: '#888', marginBottom: 20 }}>Bakker & Demerouti (2007) — 12 Faktör Detay Dökümü</p>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Demands */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#DC2626', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
              Talepler (Demands)
            </div>
            <div className="flex flex-col gap-3">
              {demands.map(f => <JDRFactorBar key={f.label} factor={f} />)}
            </div>
          </div>
          {/* Resources */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#059669', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
              Kaynaklar (Resources)
            </div>
            <div className="flex flex-col gap-3">
              {resources.map(f => <JDRFactorBar key={f.label} factor={f} />)}
            </div>
          </div>
        </div>

        {/* Dragging factors warning */}
        {draggingFactors.length > 0 && (
          <div style={{ background: '#FEF3C7', borderRadius: 8, padding: 14, fontSize: 13, color: '#92400E', marginTop: 20 }}>
            ⚠️ <strong>Dengeyi bozan faktörler:</strong>{' '}
            {draggingFactors.map(f => f.label).join(', ')}
            {' — '}
            Toplam {draggingFactors.length} faktör kritik seviyede. Öncelikli müdahale alanları olarak değerlendirilmeli.
          </div>
        )}
      </div>

      {/* ─── SECTION 3: Intervention History Timeline ─── */}
      <div style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0', padding: 24 }}>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>Müdahale Geçmişi</h3>
            <p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>Uygulanan aksiyonlar ve sonuçları</p>
          </div>
          <div style={{
            background: '#D1FAE5', borderRadius: 20, padding: '4px 12px',
            fontSize: 11, fontWeight: 700, color: '#059669',
          }}>
            {interventions.filter(i => i.improved).length}/{interventions.length} başarılı
          </div>
        </div>
        <InterventionTimeline interventions={interventions} />
      </div>

      {/* ─── SECTION 4: Peer Comparison ─── */}
      <div style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0', padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 4 }}>Departman Karşılaştırması</h3>
        <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>Anonim BAT-12 karşılaştırması (kişi bilgisi paylaşılmaz)</p>
        <PeerComparisonBar
          employeeScore={peerData.employeeScore}
          departmentAvg={peerData.departmentAvg}
          companyAvg={peerData.companyAvg}
        />
      </div>

      {/* ─── SECTION 5: Predicted Trajectory ─── */}
      <div style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0', padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 4 }}>Tahmin Edilen Gidişat</h3>
        <p style={{ fontSize: 12, color: '#888', marginBottom: 20 }}>Mevcut trende dayalı 30 günlük projeksiyon</p>

        <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:gap-10">
          {/* Sparkline */}
          <div className="group relative" title="Son 4 hafta + 30 günlük tahmin">
            <TrajectorySparkline points={trendPoints} predicted={predictedScore} />
            <div className="mt-2 flex justify-between" style={{ width: 200 }}>
              <span style={{ fontSize: 10, color: '#888' }}>4 hafta önce</span>
              <span style={{ fontSize: 10, color: '#DC2626', fontWeight: 600 }}>+30 gün</span>
            </div>
          </div>

          {/* Prediction details */}
          <div className="flex-1">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', background: '#FEE2E2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 800, color: '#DC2626',
                }}>
                  %{burnoutProbability}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>
                    30 gün sonra tahmini: %{burnoutProbability} tükenmişlik olasılığı
                  </div>
                  <div style={{ fontSize: 12, color: '#DC2626', fontWeight: 600 }}>↑ Yükselen trend</div>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#555' }}>
                Tahmini BAT skoru: <strong>{predictedScore.toFixed(2)}</strong> (şu an: {bat.total.toFixed(2)})
              </div>
              <div style={{ background: '#FEE2E2', borderRadius: 8, padding: 12, fontSize: 13, color: '#991B1B' }}>
                🚨 Müdahale yapılmazsa 30 gün içinde kırmızı bölgeye geçme riski yüksek. Acil aksiyon önerilir.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4-Week Trend (kept from original) ─── */}
      <div style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0', padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 16 }}>4 Haftalık Trend</h3>
        <div className="flex items-end gap-3" style={{ height: 80 }}>
          {trendPoints.map((score, i) => {
            const h = (score / 5) * 100;
            const color = score >= 3.02 ? '#DC2626' : score >= 2.59 ? '#D97706' : '#059669';
            return (
              <div key={i} className="group relative flex flex-1 flex-col items-center gap-1" title={`Hafta ${i + 1}: ${score.toFixed(2)}`}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#111' }}>{score.toFixed(1)}</span>
                <div style={{ width: '100%', maxWidth: 40, height: `${h}%`, background: color, borderRadius: 4, minHeight: 8, transition: 'height 0.4s' }} />
                <span style={{ fontSize: 10, color: '#888' }}>Hf {i + 1}</span>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 12, color: '#DC2626', fontWeight: 600, marginTop: 12 }}>
          ↑ 4 haftada +0.55 puan artış — yükseliş trendi devam ediyor
        </div>
      </div>
    </div>
  );
}

/* ─── İzin Tab (DERİN) ─── */

function IzinTab({ employee }: { employee: EmployeeView }) {
  const kidemYil = Math.floor(employee.kidemAy / 12);
  const yillikHak = kidemYil < 1 ? 0 : kidemYil < 5 ? 14 : kidemYil < 15 ? 20 : 26;
  const kullanilan = 6;
  const kalan = yillikHak - kullanilan;

  const izinler = [
    { tip: 'Yıllık İzin', tarih: '15-18 Mart 2026', gun: 4, durum: 'approved' },
    { tip: 'Mazeret İzni', tarih: '02 Şubat 2026', gun: 1, durum: 'approved' },
    { tip: 'Yıllık İzin', tarih: '10-12 Ocak 2026', gun: 3, durum: 'approved' },
  ];

  const durumRenk: Record<string, { bg: string; text: string; label: string }> = {
    approved: { bg: '#D1FAE5', text: '#059669', label: 'Onaylandı' },
    pending: { bg: '#FEF3C7', text: '#D97706', label: 'Bekliyor' },
    rejected: { bg: '#FEE2E2', text: '#DC2626', label: 'Reddedildi' },
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Balance Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0', padding: 20 }}>
          <div style={{ fontSize: 12, color: '#888' }}>Yıllık İzin</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#111', marginTop: 4 }}>{kalan}/{yillikHak} gün</div>
          <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, marginTop: 8 }}>
            <div style={{ width: `${yillikHak > 0 ? (kalan / yillikHak) * 100 : 0}%`, height: '100%', background: '#059669', borderRadius: 3 }} />
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Madde 53 · {kidemYil < 5 ? '1-5 yıl' : kidemYil < 15 ? '5-15 yıl' : '15+ yıl'} kıdem</div>
        </div>
        <div style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0', padding: 20 }}>
          <div style={{ fontSize: 12, color: '#888' }}>Mazeret İzni</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#111', marginTop: 4 }}>8/10 gün</div>
          <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, marginTop: 8 }}>
            <div style={{ width: '80%', height: '100%', background: '#D97706', borderRadius: 3 }} />
          </div>
        </div>
        <div style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0', padding: 20 }}>
          <div style={{ fontSize: 12, color: '#888' }}>Hastalık İzni</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#111', marginTop: 4 }}>∞</div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 8 }}>3+ gün için sağlık raporu zorunlu</div>
        </div>
      </div>

      {/* Recent Leaves */}
      <div style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0', padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 16 }}>Son İzinler</h3>
        <div className="flex flex-col gap-3">
          {izinler.map((iz, i) => {
            const d = durumRenk[iz.durum] ?? durumRenk['pending']!;
            return (
              <div key={i} className="flex items-center justify-between" style={{ padding: '10px 0', borderBottom: i < izinler.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{iz.tip}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{iz.tarih} · {iz.gun} iş günü</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: d.bg, color: d.text }}>{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Belge Tab (DERİN) ─── */

function BelgeTab({ employee: _employee }: { employee: EmployeeView }) {
  const belgeler = [
    { ad: 'İş Sözleşmesi.pdf', tip: 'Sözleşme', tarih: '15 Oca 2020', boyut: '2.4 MB', durum: 'ok' },
    { ad: 'Kimlik Fotokopisi.jpg', tip: 'Kimlik', tarih: '15 Oca 2020', boyut: '1.1 MB', durum: 'ok' },
    { ad: 'KVKK Rıza Formu.pdf', tip: 'KVKK', tarih: '15 Oca 2020', boyut: '0.8 MB', durum: 'ok' },
  ];

  const eksik = ['SGK İşe Giriş Bildirgesi', 'Diploma Fotokopisi', 'İkametgah'];

  return (
    <div className="flex flex-col gap-6">
      {/* Existing Documents */}
      <div style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0', padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 16 }}>Belgeler</h3>
        {belgeler.map((b, i) => (
          <div key={i} className="flex items-center justify-between" style={{ padding: '10px 0', borderBottom: i < belgeler.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
            <div className="flex items-center gap-3">
              <div style={{ width: 32, height: 32, borderRadius: 6, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#DC2626' }}>PDF</div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{b.ad}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{b.tip} · {b.tarih} · {b.boyut}</div>
              </div>
            </div>
            <button style={{ fontSize: 12, color: '#5E5CE6', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>İndir</button>
          </div>
        ))}
      </div>

      {/* Missing Documents */}
      <div style={{ background: '#FEF3C7', borderRadius: 12, border: '1px solid #FDE68A', padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#92400E', marginBottom: 12 }}>⚠️ Eksik Belgeler</h3>
        <div className="flex flex-col gap-2">
          {eksik.map((e, i) => (
            <div key={i} className="flex items-center gap-2" style={{ fontSize: 13, color: '#92400E' }}>
              <span>❌</span> {e}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Güçlü Yönler Tab ─── */

interface EmployeeStrengthDomain {
  id: string;
  name_tr: string;
  score: number;
  color: string;
  facets: string[];
}

function GucluYonlerTab({ employee }: { employee: EmployeeView }) {
  // Baseline domain display — real data shown in EmployeeCrossModuleView above
  // Shows assessment status based on employee activity
  const hasAssessment = employee.durum === 'active'; // Active employees are "assessed"

  const mockStrengths: EmployeeStrengthDomain[] = [
    { id: 'analytical', name_tr: 'Analitik Düşünce', score: 4.7, color: '#6366F1', facets: ['Problem Çözme', 'Veri Analizi', 'Sistem Düşüncesi'] },
    { id: 'wisdom', name_tr: 'Bilgelik', score: 4.3, color: '#5E5CE6', facets: ['Yaratıcılık', 'Merak', 'Sağduyu'] },
    { id: 'courage', name_tr: 'Cesaret', score: 4.1, color: '#DC2626', facets: ['Cesaret', 'Azim', 'Dürüstlük'] },
    { id: 'communication', name_tr: 'İletişim', score: 3.8, color: '#8B5CF6', facets: ['İkna', 'Empati', 'Sunum'] },
    { id: 'justice', name_tr: 'Adalet', score: 3.5, color: '#059669', facets: ['Takım Çalışması', 'Adillik', 'Liderlik'] },
  ];

  if (!hasAssessment) {
    return (
      <div
        style={{
          background: '#fafafa',
          borderRadius: 12,
          border: '1px solid #f0f0f0',
          padding: 40,
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: '#f0f0ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <svg style={{ width: 24, height: 24, color: '#5E5CE6' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </div>
        <h3 style={{ fontSize: 16, fontWeight: 600, color: '#111', marginBottom: 8 }}>
          Güçlü Yön Değerlendirmesi Yapılmadı
        </h3>
        <p style={{ fontSize: 13, color: '#888', maxWidth: 400, margin: '0 auto 20px', lineHeight: 1.6 }}>
          Bu çalışan henüz UpStrengths-TR güçlü yön değerlendirmesini tamamlamamış.
          Değerlendirme tamamlandığında güçlü yön profili burada görünecek.
        </p>
        <a
          href="/guclu-yonler/kesfet"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '8px 18px',
            background: '#5E5CE6',
            color: '#fff',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Değerlendirme Gönder
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top 5 Strengths */}
      <div style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0', padding: 24 }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>Top 5 Güçlü Yönleri</h3>
            <p style={{ fontSize: 12, color: '#888', marginTop: 2 }}>UpStrengths-TR değerlendirme sonuçları</p>
          </div>
          <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: '#D1FAE5', color: '#059669', fontWeight: 600 }}>
            Değerlendirildi
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {mockStrengths.map((strength, index) => {
            const pct = (strength.score / 5) * 100;
            const label = strength.score >= 4.5 ? 'Olağanüstü' : strength.score >= 4.0 ? 'Çok Güçlü' : strength.score >= 3.5 ? 'Güçlü' : 'Orta';

            return (
              <div key={strength.id} className="flex items-center gap-4">
                {/* Rank */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: index < 3 ? `${strength.color}14` : '#f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                    color: index < 3 ? strength.color : '#aaa',
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </div>

                {/* Name + bar */}
                <div className="flex-1">
                  <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{strength.name_tr}</span>
                      <span style={{ fontSize: 11, color: strength.color, fontWeight: 600 }}>{label}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#111' }}>{strength.score.toFixed(1)}</span>
                  </div>
                  <div style={{ width: '100%', height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: strength.color,
                        borderRadius: 3,
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                  {/* Facets */}
                  <div className="mt-1 flex flex-wrap gap-1">
                    {strength.facets.map((f) => (
                      <span key={f} style={{ fontSize: 10, color: '#888', padding: '1px 6px', background: '#f8f8f8', borderRadius: 4 }}>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Role Fit Summary */}
      <div style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0', padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 12 }}>Rol Uyum Özeti</h3>
        <div className="flex items-center gap-4">
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              background: '#D1FAE5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 800,
              color: '#059669',
              flexShrink: 0,
            }}
          >
            %78
          </div>
          <div>
            <p style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>
              <strong>{employee.tamAd}</strong> güçlü yön profili mevcut pozisyonuyla <strong style={{ color: '#059669' }}>yüksek düzeyde uyumlu</strong>.
              En güçlü alanları olan <strong>Analitik Düşünce</strong> ve <strong>Bilgelik</strong> bu rol için kritik öneme sahip.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Link */}
      <div style={{ textAlign: 'center' }}>
        <a
          href="/guclu-yonler/sonuclar"
          style={{ fontSize: 13, color: '#5E5CE6', fontWeight: 600, textDecoration: 'none' }}
        >
          Detaylı sonuçları görüntüle →
        </a>
      </div>
    </div>
  );
}

/* ─── Geçmiş Tab (DERİN) ─── */

function GecmisTab({ employee }: { employee: EmployeeView }) {
  const events = [
    { tarih: '15 Oca 2020', tip: 'İşe Başlama', detay: `${employee.tamAd} şirkete katıldı`, icon: '🟢' },
    { tarih: '01 Haz 2021', tip: 'Departman Değişikliği', detay: 'Pazarlama → Satış departmanına transfer', icon: '🔄' },
    { tarih: '15 Mar 2022', tip: 'Terfi', detay: 'Uzman → Kıdemli Uzman', icon: '⬆️' },
    { tarih: '01 Oca 2023', tip: 'Maaş Güncellemesi', detay: 'Yıllık değerlendirme sonrası', icon: '💰' },
    { tarih: '10 Mar 2026', tip: 'Tükenmişlik Uyarısı', detay: 'BAT-12 skoru amber bölgeye geçti', icon: '⚠️' },
    { tarih: '01 Nis 2026', tip: 'Koçluk Ataması', detay: 'Haftalık 1:1 koçluk başlatıldı', icon: '🎯' },
  ];

  return (
    <div style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0', padding: 24 }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 20 }}>Çalışan Geçmişi</h3>
      <div className="flex flex-col">
        {events.map((e, i) => (
          <div key={i} className="flex gap-4" style={{ paddingBottom: 20, position: 'relative' }}>
            {i < events.length - 1 && <div style={{ position: 'absolute', left: 15, top: 28, bottom: 0, width: 1, background: '#e5e5e5' }} />}
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, zIndex: 1 }}>{e.icon}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{e.tip}</div>
              <div style={{ fontSize: 12, color: '#555', marginTop: 2 }}>{e.detay}</div>
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>{e.tarih}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
