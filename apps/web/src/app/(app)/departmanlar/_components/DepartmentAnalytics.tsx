'use client';

import { useState } from 'react';

/* ─────────────────────────────────────────────────
 * DepartmentAnalytics — Advanced department panel
 * Shows health score, headcount trend, leave utilization,
 * top risks, and manager effectiveness for a selected department.
 * Static data — will be replaced with API call
 * ───────────────────────────────────────────────── */

interface DepartmentAnalyticsProps {
  departmentId: string;
  departmentName: string;
}

/* ─── Mini Horizontal Bar ─── */

function MiniBar({ value, max, color, label, suffix = '' }: { value: number; max: number; color: string; label: string; suffix?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="group relative flex items-center gap-3" title={`${label}: ${value}${suffix}`}>
      <span style={{ fontSize: 12, color: '#555', width: 130, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.5s ease' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: '#111', width: 45, textAlign: 'right' }}>
        {value}{suffix}
      </span>
    </div>
  );
}

/* ─── Headcount Bar Chart ─── */

function HeadcountChart({ data }: { data: { month: string; count: number }[] }) {
  const maxCount = Math.max(...data.map(d => d.count));

  return (
    <div className="flex items-end gap-2" style={{ height: 100 }}>
      {data.map((d) => {
        const h = (d.count / (maxCount + 4)) * 100;
        return (
          <div key={d.month} className="group relative flex flex-1 flex-col items-center gap-1">
            <span style={{ fontSize: 11, fontWeight: 600, color: '#111' }}>{d.count}</span>
            <div
              style={{
                width: '100%',
                maxWidth: 36,
                height: `${h}%`,
                background: '#5E5CE6',
                borderRadius: 4,
                minHeight: 8,
                transition: 'height 0.4s ease',
              }}
            />
            <span style={{ fontSize: 10, color: '#888' }}>{d.month}</span>
            {/* Tooltip */}
            <div className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#0A0A0A] px-3 py-1 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              {d.month}: {d.count} kişi
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Leave Utilization Progress ─── */

function LeaveUtilization({ rate, benchmark }: { rate: number; benchmark: number }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-between" style={{ fontSize: 12 }}>
        <span style={{ color: '#555' }}>Departman kullanım oranı</span>
        <span style={{ fontWeight: 600, color: '#111' }}>%{rate}</span>
      </div>
      <div style={{ position: 'relative', height: 12, background: '#f0f0f0', borderRadius: 6 }}>
        <div style={{ width: `${rate}%`, height: '100%', background: '#5E5CE6', borderRadius: 6, transition: 'width 0.5s' }} />
        {/* Benchmark line */}
        <div
          className="group"
          style={{
            position: 'absolute',
            left: `${benchmark}%`,
            top: -3,
            bottom: -3,
            width: 2,
            background: '#DC2626',
            borderRadius: 1,
          }}
          title={`Sektör ortalaması: %${benchmark}`}
        >
          <div className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#0A0A0A] px-2 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
            Sektör ort: %{benchmark}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 12, color: '#888' }}>
        Departman izin kullanım oranı: %{rate} (sektör ort: %{benchmark})
      </div>
    </div>
  );
}

/* ─── Health Score Gauge (mini) ─── */

function HealthGauge({ score }: { score: number }) {
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const center = size / 2;

  const color = score >= 75 ? '#059669' : score >= 50 ? '#D97706' : '#DC2626';
  const label = score >= 75 ? 'İyi' : score >= 50 ? 'Orta' : 'Kritik';

  return (
    <div className="group relative flex flex-col items-center" title={`Departman sağlık skoru: ${score}/100`}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke="#f0f0f0" strokeWidth={strokeWidth} />
        <circle
          cx={center} cy={center} r={radius} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={`${progress} ${circumference - progress}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span style={{ fontSize: 24, fontWeight: 800, color: '#111', lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color, marginTop: 2 }}>{label}</span>
      </div>
    </div>
  );
}

/* ─── Manager Effectiveness ─── */

function ManagerScore({ score }: { score: number }) {
  const maxScore = 10;
  const pct = (score / maxScore) * 100;
  const color = score >= 7 ? '#059669' : score >= 5 ? '#D97706' : '#DC2626';
  const label = score >= 7 ? 'İyi' : score >= 5 ? 'Orta' : 'Zayıf';
  const factors = [
    { name: 'Ekip tükenmişlik trendi', value: 7.5, max: 10 },
    { name: 'İzin kullanım dengesi', value: 6.8, max: 10 },
    { name: 'Çalışan tutma oranı', value: 8.2, max: 10 },
    { name: '1:1 düzenliliği', value: 6.5, max: 10 },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div
          className="group relative flex items-center justify-center"
          style={{
            width: 56, height: 56, borderRadius: '50%',
            background: `${color}15`, border: `2px solid ${color}`,
          }}
          title={`Yönetici etkinlik skoru: ${score}/${maxScore}`}
        >
          <span style={{ fontSize: 18, fontWeight: 800, color }}>{score.toFixed(1)}</span>
          <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#0A0A0A] px-3 py-1 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            10 üzerinden yönetici etkinlik puanı
          </div>
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>Yönetici Etkinliği: {score.toFixed(1)}/10</div>
          <div style={{ fontSize: 12, color, fontWeight: 600 }}>({label})</div>
        </div>
      </div>
      <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3, transition: 'width 0.5s' }} />
      </div>
      <div className="flex flex-col gap-2 mt-2">
        {factors.map(f => (
          <div key={f.name} className="group relative flex items-center gap-2" title={`${f.name}: ${f.value}/${f.max}`}>
            <span style={{ fontSize: 11, color: '#888', width: 160, flexShrink: 0 }}>{f.name}</span>
            <div style={{ flex: 1, height: 5, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${(f.value / f.max) * 100}%`, height: '100%', background: f.value >= 7 ? '#059669' : f.value >= 5 ? '#D97706' : '#DC2626', borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#111', width: 30, textAlign: 'right' }}>{f.value.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Component ─── */

export const DepartmentAnalytics = ({ departmentId, departmentName }: DepartmentAnalyticsProps) => {
  const [hoveredRisk, setHoveredRisk] = useState<number | null>(null);

  // Static data — will be replaced with API call
  const healthScore = 64;

  // Static data — will be replaced with API call
  const headcountData = [
    { month: 'Eki', count: 22 },
    { month: 'Kas', count: 23 },
    { month: 'Ara', count: 24 },
    { month: 'Oca', count: 24 },
    { month: 'Şub', count: 23 },
    { month: 'Mar', count: 24 },
  ];

  // Static data — will be replaced with API call
  const healthBreakdown = [
    { label: 'Tükenmişlik ort.', value: 2.4, max: 5, weight: 30, color: '#D97706' },
    { label: 'JD-R dengesi', value: 62, max: 100, weight: 25, color: '#DC2626' },
    { label: 'İzin kullanımı', value: 68, max: 100, weight: 15, color: '#5E5CE6' },
    { label: 'Ayrılma oranı', value: 12, max: 100, weight: 15, color: '#059669' },
    { label: 'eNPS', value: 32, max: 100, weight: 15, color: '#2563EB' },
  ];

  // Static data — will be replaced with API call
  const risks = [
    { type: 'warning' as const, text: '2 çalışan tükenmişlik riskinde (BAT > 3.0)', severity: 'high' },
    { type: 'warning' as const, text: 'JD-R dengesi negatif — kaynak eksikliği', severity: 'high' },
    { type: 'info' as const, text: '1 çalışan 6 ayda 3 kez departman değiştirdi', severity: 'medium' },
    { type: 'info' as const, text: 'Ortalama kıdem 2.1 yıl — sektör ort: 3.8 yıl', severity: 'low' },
  ];

  return (
    <div className="flex flex-col gap-6" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center gap-3" style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 16 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#5E5CE6' }} />
        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0A0A0A' }}>{departmentName} — Analitik</h2>
      </div>

      {/* Top Row: Health Score + Headcount */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Health Score */}
        <div style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0', padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 4 }}>Departman Sağlık Skoru</h3>
          <p style={{ fontSize: 11, color: '#888', marginBottom: 16 }}>5 boyutun ağırlıklı ortalaması</p>

          <div className="flex items-start gap-6">
            <HealthGauge score={healthScore} />
            <div className="flex flex-1 flex-col gap-2">
              {healthBreakdown.map(h => (
                <div key={h.label} className="group relative flex items-center gap-2" title={`${h.label} (ağırlık: %${h.weight})`}>
                  <span style={{ fontSize: 11, color: '#555', width: 110, flexShrink: 0 }}>{h.label}</span>
                  <div style={{ flex: 1, height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${(h.value / h.max) * 100}%`, height: '100%', background: h.color, borderRadius: 3 }} />
                  </div>
                  <span style={{ fontSize: 10, color: '#888', width: 30, textAlign: 'right' }}>%{h.weight}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Headcount Trend */}
        <div style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0', padding: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 4 }}>Kadro Trendi</h3>
          <p style={{ fontSize: 11, color: '#888', marginBottom: 16 }}>Son 6 ay personel sayısı değişimi</p>
          <HeadcountChart data={headcountData} />
          <div style={{ fontSize: 12, color: '#059669', fontWeight: 600, marginTop: 12 }}>
            +2 kişi (son 6 ay) — stabil büyüme
          </div>
        </div>
      </div>

      {/* Leave Utilization */}
      <div style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0', padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 4 }}>İzin Kullanım Oranı</h3>
        <p style={{ fontSize: 11, color: '#888', marginBottom: 16 }}>Yıllık izin hakkı kullanım durumu vs sektör ortalaması</p>
        <LeaveUtilization rate={68} benchmark={72} />
      </div>

      {/* Top Risks */}
      <div style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0', padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 4 }}>Risk Alanları</h3>
        <p style={{ fontSize: 11, color: '#888', marginBottom: 16 }}>Dikkat gerektiren konular</p>
        <div className="flex flex-col gap-3">
          {risks.map((risk, i) => {
            const isHovered = hoveredRisk === i;
            const bg = risk.type === 'warning' ? '#FEF3C7' : '#EFF6FF';
            const border = risk.type === 'warning' ? '#FDE68A' : '#BFDBFE';
            const textColor = risk.type === 'warning' ? '#92400E' : '#1E40AF';
            const icon = risk.type === 'warning' ? '⚠️' : 'ℹ️';
            return (
              <div
                key={i}
                onMouseEnter={() => setHoveredRisk(i)}
                onMouseLeave={() => setHoveredRisk(null)}
                style={{
                  background: bg,
                  border: `1px solid ${isHovered ? textColor : border}`,
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontSize: 13,
                  color: textColor,
                  cursor: 'default',
                  transition: 'border-color 150ms',
                }}
              >
                {icon} {risk.text}
              </div>
            );
          })}
        </div>
      </div>

      {/* Manager Effectiveness */}
      <div style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0', padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 4 }}>Yönetici Etkinliği</h3>
        <p style={{ fontSize: 11, color: '#888', marginBottom: 16 }}>Ekip tükenmişlik trendi, izin kalıpları ve tutma oranına dayalı</p>
        <ManagerScore score={7.2} />
      </div>
    </div>
  );
};
