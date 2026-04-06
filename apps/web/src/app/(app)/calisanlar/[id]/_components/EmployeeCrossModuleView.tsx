'use client';

import { useEffect, useState } from 'react';

// ─── Types mirroring API responses ───

interface RiskSignal {
  source: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
}

interface RiskScore {
  score: number;
  level: 'low' | 'medium' | 'high' | 'critical';
  signals: RiskSignal[];
  recommendations: string[];
}

interface EmployeeSynthesis {
  id: string;
  name: string;
  department: string;
  synthesis: {
    riskScore: RiskScore;
    nineBox: {
      performance: 'low' | 'medium' | 'high';
      potential: 'low' | 'medium' | 'high';
      performanceScore: number;
      potentialScore: number;
    };
    okrProgress: number | null;
    burnoutScore: number | null;
    feedbackAvg: number | null;
    strengthsDepth: number;
    overallHealth: 'critical' | 'poor' | 'fair' | 'good' | 'excellent';
  };
}

interface StrengthEmployee {
  id: string;
  name: string;
  department: string;
  domainScores: Record<string, number>;
  top5: string[] | null;
  roleFitScore: number | null;
  percentiles: Record<string, { z: number; percentile: number }> | null;
}

interface EmployeeCrossModuleViewProps {
  employeeId: string;
}

// ─── Design tokens ───

const CARD_STYLE: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #f0f0f0',
  borderRadius: 12,
  padding: 24,
};

const ACCENT = '#5E5CE6';

const RISK_LEVEL_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  low: { bg: '#DCFCE7', text: '#16A34A', label: 'Dusuk' },
  medium: { bg: '#FEF3C7', text: '#D97706', label: 'Orta' },
  high: { bg: '#FEE2E2', text: '#DC2626', label: 'Yuksek' },
  critical: { bg: '#FEE2E2', text: '#991B1B', label: 'Kritik' },
};

const HEALTH_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: '#FEE2E2', text: '#991B1B', label: 'Kritik' },
  poor: { bg: '#FEE2E2', text: '#DC2626', label: 'Kotu' },
  fair: { bg: '#FEF3C7', text: '#D97706', label: 'Orta' },
  good: { bg: '#DCFCE7', text: '#16A34A', label: 'Iyi' },
  excellent: { bg: '#DCFCE7', text: '#166534', label: 'Mukemmel' },
};

const SEVERITY_DOT: Record<string, string> = {
  info: '#3B82F6',
  warning: '#F59E0B',
  critical: '#DC2626',
};

const NINE_BOX_LABELS: Record<string, string> = {
  low: 'Dusuk',
  medium: 'Orta',
  high: 'Yuksek',
};

// ─── Component ───

export const EmployeeCrossModuleView = ({ employeeId }: EmployeeCrossModuleViewProps) => {
  const [synthesis, setSynthesis] = useState<EmployeeSynthesis | null>(null);
  const [strengths, setStrengths] = useState<StrengthEmployee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [intelligenceRes, strengthsRes] = await Promise.allSettled([
          fetch('/api/employee-intelligence').then((r) => r.json()),
          fetch('/api/strengths').then((r) => r.json()),
        ]);

        if (cancelled) return;

        // Find matching employee from intelligence API
        if (intelligenceRes.status === 'fulfilled' && intelligenceRes.value.employees) {
          const match = (intelligenceRes.value.employees as EmployeeSynthesis[]).find(
            (e) => e.id === employeeId,
          );
          if (match) setSynthesis(match);
        }

        // Find matching employee from strengths API
        if (strengthsRes.status === 'fulfilled' && strengthsRes.value.employees) {
          const match = (strengthsRes.value.employees as StrengthEmployee[]).find(
            (e) => e.id === employeeId,
          );
          if (match) setStrengths(match);
        }
      } catch {
        if (!cancelled) setError('Veriler yuklenemedi');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  if (loading) {
    return (
      <div style={{ marginTop: 32 }}>
        <SectionTitle>360 Calisma Profili</SectionTitle>
        <div
          className="grid grid-cols-1 gap-4 md:grid-cols-3"
          style={{ marginTop: 16 }}
        >
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ ...CARD_STYLE, minHeight: 160 }} className="animate-pulse">
              <div style={{ height: 14, width: '40%', background: '#f0f0f0', borderRadius: 4 }} />
              <div style={{ height: 10, width: '70%', background: '#f0f0f0', borderRadius: 4, marginTop: 16 }} />
              <div style={{ height: 10, width: '55%', background: '#f0f0f0', borderRadius: 4, marginTop: 8 }} />
              <div style={{ height: 10, width: '60%', background: '#f0f0f0', borderRadius: 4, marginTop: 8 }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ marginTop: 32 }}>
        <SectionTitle>360 Calisma Profili</SectionTitle>
        <div style={{ ...CARD_STYLE, marginTop: 16, color: '#888', fontSize: 14 }}>
          {error}
        </div>
      </div>
    );
  }

  if (!synthesis) {
    return null;
  }

  const { riskScore, nineBox, okrProgress, burnoutScore, feedbackAvg, overallHealth } =
    synthesis.synthesis;

  return (
    <div style={{ marginTop: 32 }}>
      <SectionTitle>360 Calisma Profili</SectionTitle>

      <div
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
        style={{ marginTop: 16 }}
      >
        {/* ── Card 1: Risk & Health ── */}
        <div style={CARD_STYLE}>
          <CardHeader icon={<ShieldIcon />} title="Risk & Saglik" />

          <div className="mt-4 flex flex-col gap-3">
            {/* Risk Score */}
            <MetricRow label="Risk Skoru">
              <span style={{ fontWeight: 700, fontSize: 18, color: '#111' }}>
                {riskScore.score}
              </span>
              <span style={{ fontSize: 13, color: '#888' }}>/100</span>
              <Badge config={RISK_LEVEL_CONFIG[riskScore.level]} />
            </MetricRow>

            {/* Overall Health */}
            <MetricRow label="Genel Saglik">
              <Badge config={HEALTH_CONFIG[overallHealth]} />
            </MetricRow>

            {/* Risk Signals */}
            {riskScore.signals.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <span style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>Sinyaller</span>
                <div className="mt-1 flex flex-col gap-1">
                  {riskScore.signals.map((signal, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2"
                      style={{ fontSize: 12, color: '#555' }}
                    >
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: SEVERITY_DOT[signal.severity] ?? '#999',
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ fontWeight: 500 }}>{signal.source}</span>
                      <span style={{ color: '#999' }}>{signal.metric}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {riskScore.recommendations.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <span style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>Oneriler</span>
                <ul className="mt-1 flex flex-col gap-1" style={{ paddingLeft: 16 }}>
                  {riskScore.recommendations.map((rec, idx) => (
                    <li key={idx} style={{ fontSize: 12, color: '#555', listStyleType: 'disc' }}>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* ── Card 2: Performance Snapshot ── */}
        <div style={CARD_STYLE}>
          <CardHeader icon={<ChartIcon />} title="Performans Ozeti" />

          <div className="mt-4 flex flex-col gap-3">
            {/* OKR Progress */}
            <MetricRow label="OKR Ilerleme">
              {okrProgress !== null ? (
                <div className="flex items-center gap-2">
                  <div
                    style={{
                      width: 80,
                      height: 6,
                      background: '#f0f0f0',
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, okrProgress)}%`,
                        height: '100%',
                        background: ACCENT,
                        borderRadius: 3,
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>
                    %{Math.round(okrProgress)}
                  </span>
                </div>
              ) : (
                <NoData />
              )}
            </MetricRow>

            {/* 9-Box */}
            <MetricRow label="9-Box">
              <span style={{ fontSize: 13, color: '#111', fontWeight: 500 }}>
                {NINE_BOX_LABELS[nineBox.performance]} x {NINE_BOX_LABELS[nineBox.potential]}
              </span>
              <span style={{ fontSize: 11, color: '#999' }}>
                ({nineBox.performanceScore.toFixed(0)} / {nineBox.potentialScore.toFixed(0)})
              </span>
            </MetricRow>

            {/* Burnout */}
            <MetricRow label="Tukenmislik">
              {burnoutScore !== null ? (
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: burnoutScore >= 3.0 ? '#DC2626' : burnoutScore >= 2.0 ? '#D97706' : '#16A34A',
                  }}
                >
                  {burnoutScore.toFixed(2)}
                </span>
              ) : (
                <NoData />
              )}
            </MetricRow>

            {/* Feedback */}
            <MetricRow label="360 Ortalama">
              {feedbackAvg !== null ? (
                <span style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>
                  {feedbackAvg.toFixed(1)} / 5
                </span>
              ) : (
                <NoData />
              )}
            </MetricRow>
          </div>
        </div>

        {/* ── Card 3: Strengths Mini ── */}
        <div style={CARD_STYLE}>
          <CardHeader icon={<StarIcon />} title="Guclu Yonler" />

          <div className="mt-4 flex flex-col gap-3">
            {/* Top 5 */}
            {strengths?.top5 && strengths.top5.length > 0 ? (
              <div>
                <span style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>Top 5</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {strengths.top5.map((strength) => (
                    <span
                      key={strength}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '3px 10px',
                        borderRadius: 9999,
                        fontSize: 12,
                        fontWeight: 500,
                        background: `${ACCENT}14`,
                        color: ACCENT,
                        border: `1px solid ${ACCENT}30`,
                      }}
                    >
                      {strength}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <span style={{ fontSize: 12, color: '#888', fontWeight: 500 }}>Top 5</span>
                <div className="mt-1">
                  <NoData />
                </div>
              </div>
            )}

            {/* Role Fit Score */}
            <MetricRow label="Rol Uyum">
              {strengths?.roleFitScore !== null && strengths?.roleFitScore !== undefined ? (
                <div className="flex items-center gap-2">
                  <div
                    style={{
                      width: 80,
                      height: 6,
                      background: '#f0f0f0',
                      borderRadius: 3,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${Math.min(100, strengths.roleFitScore)}%`,
                        height: '100%',
                        background:
                          strengths.roleFitScore >= 70
                            ? '#16A34A'
                            : strengths.roleFitScore >= 40
                              ? '#D97706'
                              : '#DC2626',
                        borderRadius: 3,
                      }}
                    />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>
                    %{Math.round(strengths.roleFitScore)}
                  </span>
                </div>
              ) : (
                <NoData />
              )}
            </MetricRow>

            {/* Strengths Depth */}
            <MetricRow label="Derinlik">
              <span style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>
                {synthesis.synthesis.strengthsDepth} alan
              </span>
              <span style={{ fontSize: 11, color: '#999' }}>
                (skor &ge; 4.0)
              </span>
            </MetricRow>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Sub-components ───

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111', letterSpacing: -0.3 }}>
    {children}
  </h2>
);

const CardHeader = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
  <div className="flex items-center gap-2">
    <span style={{ color: ACCENT }}>{icon}</span>
    <span style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{title}</span>
  </div>
);

const MetricRow = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-2">
    <span style={{ fontSize: 13, color: '#888', flexShrink: 0 }}>{label}</span>
    <div className="flex items-center gap-1.5">{children}</div>
  </div>
);

const Badge = ({ config }: { config: { bg: string; text: string; label: string } | undefined }) => {
  if (!config) return null;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 9999,
        fontSize: 11,
        fontWeight: 600,
        background: config.bg,
        color: config.text,
      }}
    >
      {config.label}
    </span>
  );
};

const NoData = () => (
  <span style={{ fontSize: 12, color: '#ccc', fontStyle: 'italic' }}>Veri yok</span>
);

// ─── Icons (inline SVG, 16px) ───

const ShieldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
    />
  </svg>
);

const ChartIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16l4-8 4 4 5-10" />
  </svg>
);

const StarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <polygon
      strokeLinecap="round"
      strokeLinejoin="round"
      points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
    />
  </svg>
);
