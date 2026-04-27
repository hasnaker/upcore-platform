'use client';

import { useState, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  usePriorityActions,
  useWeeklyRecap,
  useActionFeedback,
  type RankedAction,
} from '@/hooks/useActions';

/* ─── URL-safe filters ─── */
type FilterKey = 'all' | 'burnout' | 'hiring' | 'leave' | 'development';

const FILTERS: { key: FilterKey; label: string; match: (a: RankedAction) => boolean }[] = [
  { key: 'all', label: 'Tümü', match: () => true },
  { key: 'burnout', label: 'Tükenmişlik', match: (a) => /burnout|tukenmislik|risk/i.test(a.type) },
  { key: 'hiring', label: 'İşe Alım', match: (a) => /hiring|ats|recruit/i.test(a.type) },
  { key: 'leave', label: 'İzin', match: (a) => /leave|izin/i.test(a.type) },
  { key: 'development', label: 'Gelişim', match: (a) => /development|coach|training|okr/i.test(a.type) },
];

const URGENCY_STYLE = (score: number) => {
  if (score >= 0.7) return { bg: '#FEE2E2', text: '#DC2626', label: 'Acil', stripe: '#DC2626' };
  if (score >= 0.4) return { bg: '#FEF3C7', text: '#D97706', label: 'Uyarı', stripe: '#D97706' };
  return { bg: '#EEF0FD', text: '#5E5CE6', label: 'Bilgi', stripe: '#5E5CE6' };
};

const TYPE_LABEL = (type: string): string => {
  if (/burnout/i.test(type)) return 'Tükenmişlik';
  if (/hiring|ats/i.test(type)) return 'İşe Alım';
  if (/leave|izin/i.test(type)) return 'İzin';
  if (/okr|performance/i.test(type)) return 'Performans';
  if (/coach|training/i.test(type)) return 'Gelişim';
  return 'Aksiyon';
};

const formatHoursAgo = (iso: string): string => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffHours = Math.max(0, Math.round(diffMs / (1000 * 60 * 60)));
  if (diffHours < 1) return 'Şimdi';
  if (diffHours < 24) return `${diffHours} saat önce`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays} gün önce`;
};

export default function AksiyonlarPage() {
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const priority = usePriorityActions();
  const recap = useWeeklyRecap('7d');
  const feedback = useActionFeedback();

  const actions = useMemo(() => priority.data?.actions ?? [], [priority.data]);
  const filtered = useMemo(() => {
    const matcher = FILTERS.find((f) => f.key === filter)?.match ?? (() => true);
    return actions.filter(matcher);
  }, [actions, filter]);

  const handleDecision = (action_id: string, decision: 'complete' | 'dismiss' | 'snooze') => {
    feedback.mutate(
      { action_id, feedback_type: decision, snooze_hours: decision === 'snooze' ? 24 : undefined },
      {
        onSuccess: () => {
          setExpanded(null);
          queryClient.invalidateQueries({ queryKey: ['actions', 'next'] });
          queryClient.invalidateQueries({ queryKey: ['actions', 'recap'] });
        },
      },
    );
  };

  /* ── Loading state ── */
  if (priority.isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111' }}>Aksiyon Merkezi</h1>
          <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>Yükleniyor…</p>
        </div>
        <div className="flex flex-col gap-3" aria-label="aksiyonlar-yukleniyor">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                background: 'white',
                border: '1px solid #f0f0f0',
                borderRadius: 12,
                padding: 24,
                height: 120,
                animation: 'pulse 2s ease-in-out infinite',
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (priority.isError) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111' }}>Aksiyon Merkezi</h1>
        </div>
        <div
          role="alert"
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: 12,
            padding: 24,
            color: '#991B1B',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600 }}>Aksiyonlar alınamadı</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>{priority.error?.message ?? 'Bilinmeyen hata'}</div>
          <button
            onClick={() => priority.refetch()}
            style={{
              marginTop: 12,
              fontSize: 12,
              fontWeight: 600,
              padding: '6px 14px',
              background: '#DC2626',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Tekrar dene
          </button>
        </div>
      </div>
    );
  }

  const metrics = recap.data?.metrics ?? [];
  const generatedMetric = metrics.find((m) => m.key === 'generated' || m.key === 'actions_generated');
  const completedMetric = metrics.find((m) => m.key === 'completed' || m.key === 'actions_completed');
  const dismissedMetric = metrics.find((m) => m.key === 'dismissed' || m.key === 'actions_dismissed');
  const snoozedMetric = metrics.find((m) => m.key === 'snoozed' || m.key === 'actions_snoozed');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111' }}>Aksiyon Merkezi</h1>
        <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>
          Tüm aksiyonları yönetin. Onaylayın, reddedin, takip edin.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #f0f0f0' }}>
        {[
          { key: 'active' as const, label: 'Aktif', count: actions.length },
          { key: 'history' as const, label: 'Geçmiş', count: completedMetric?.value ?? 0 },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: tab === t.key ? 600 : 400,
              color: tab === t.key ? '#5E5CE6' : '#888',
              borderBottom: tab === t.key ? '2px solid #5E5CE6' : '2px solid transparent',
              background: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {t.label}
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: 10,
                background: tab === t.key ? '#EEF0FD' : '#f5f5f5',
                color: tab === t.key ? '#5E5CE6' : '#aaa',
              }}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {tab === 'active' && (
        <>
          {/* Weekly Recap — real data */}
          {metrics.length > 0 && (
            <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 12, padding: 20 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#888',
                  textTransform: 'uppercase',
                  letterSpacing: 1,
                  marginBottom: 16,
                }}
              >
                Son 7 Günün Aksiyon Metrikleri
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
                <MetricStat label="Üretilen" value={generatedMetric?.value ?? 0} color="#111" />
                <MetricStat label="Tamamlanan" value={completedMetric?.value ?? 0} color="#059669" />
                <MetricStat label="Reddedilen" value={dismissedMetric?.value ?? 0} color="#DC2626" />
                <MetricStat label="Ertelenen" value={snoozedMetric?.value ?? 0} color="#D97706" />
              </div>
            </div>
          )}

          {/* Filters */}
          <div style={{ display: 'flex', gap: 6 }}>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                style={{
                  padding: '5px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 20,
                  border: '1px solid',
                  borderColor: filter === f.key ? '#5E5CE6' : '#e5e5e5',
                  background: filter === f.key ? '#EEF0FD' : 'white',
                  color: filter === f.key ? '#5E5CE6' : '#888',
                  cursor: 'pointer',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Action Cards */}
          <div className="flex flex-col gap-3">
            {filtered.map((a) => {
              const urgency = URGENCY_STYLE(a.urgency);
              const isExpanded = expanded === a.action_id;
              return (
                <div
                  key={a.action_id}
                  style={{
                    background: 'white',
                    border: '1px solid #f0f0f0',
                    borderRadius: 12,
                    borderLeft: `3px solid ${urgency.stripe}`,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ padding: '20px 24px' }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 10,
                              background: urgency.bg,
                              color: urgency.text,
                            }}
                          >
                            {urgency.label}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 10,
                              background: '#f5f5f5',
                              color: '#888',
                            }}
                          >
                            {TYPE_LABEL(a.type)}
                          </span>
                          {a.suggested_within_hours > 0 && (
                            <span style={{ fontSize: 11, color: '#aaa' }}>
                              · {a.suggested_within_hours} saat içinde
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{a.title_tr}</div>
                        <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>{a.rationale_tr}</div>
                        {a.target.name_masked && (
                          <div style={{ fontSize: 12, color: '#5E5CE6', fontWeight: 600, marginTop: 6 }}>
                            📌 Hedef: {a.target.name_masked}
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => setExpanded(isExpanded ? null : a.action_id)}
                          style={{
                            fontSize: 12,
                            color: '#888',
                            background: 'none',
                            border: '1px solid #e5e5e5',
                            borderRadius: 8,
                            padding: '6px 12px',
                            cursor: 'pointer',
                          }}
                        >
                          {isExpanded ? 'Kapat' : 'Detay'}
                        </button>
                        <button
                          onClick={() => handleDecision(a.action_id, 'complete')}
                          disabled={feedback.isPending}
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: 'white',
                            background: '#111',
                            border: 'none',
                            borderRadius: 8,
                            padding: '6px 14px',
                            cursor: feedback.isPending ? 'not-allowed' : 'pointer',
                            opacity: feedback.isPending ? 0.6 : 1,
                          }}
                        >
                          Onayla ✓
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#888',
                            textTransform: 'uppercase',
                            letterSpacing: 1,
                            marginBottom: 10,
                          }}
                        >
                          Destekleyici Sinyaller
                        </div>
                        {a.supporting_signals.length === 0 ? (
                          <div style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic' }}>
                            Ek sinyal kaydı yok.
                          </div>
                        ) : (
                          a.supporting_signals.map((s, i) => (
                            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                              <span
                                style={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: '50%',
                                  background: '#EEF0FD',
                                  color: '#5E5CE6',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                {i + 1}
                              </span>
                              <span style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>{s}</span>
                            </div>
                          ))
                        )}

                        {/* Priority breakdown */}
                        <div
                          style={{
                            marginTop: 16,
                            padding: 12,
                            background: '#FAFAFF',
                            border: '1px solid #E0E0FF',
                            borderRadius: 8,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: 8,
                          }}
                        >
                          <ScoreStat label="Öncelik" value={a.priority_score} />
                          <ScoreStat label="Aciliyet" value={a.urgency} />
                          <ScoreStat label="Etki" value={a.impact} />
                          <ScoreStat label="Uygulanabilirlik" value={a.actionability} />
                        </div>

                        <div className="flex gap-2" style={{ marginTop: 12 }}>
                          <button
                            onClick={() => handleDecision(a.action_id, 'complete')}
                            disabled={feedback.isPending}
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: 'white',
                              background: '#059669',
                              border: 'none',
                              borderRadius: 8,
                              padding: '8px 16px',
                              cursor: 'pointer',
                            }}
                          >
                            ✓ Tamamlandı
                          </button>
                          <button
                            onClick={() => handleDecision(a.action_id, 'dismiss')}
                            disabled={feedback.isPending}
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#DC2626',
                              background: '#FEE2E2',
                              border: 'none',
                              borderRadius: 8,
                              padding: '8px 16px',
                              cursor: 'pointer',
                            }}
                          >
                            ✗ Reddet
                          </button>
                          <button
                            onClick={() => handleDecision(a.action_id, 'snooze')}
                            disabled={feedback.isPending}
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#D97706',
                              background: '#FEF3C7',
                              border: 'none',
                              borderRadius: 8,
                              padding: '8px 16px',
                              cursor: 'pointer',
                            }}
                          >
                            ◷ 24 saat ertele
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: 48, color: '#aaa', fontSize: 14 }}>
                {actions.length === 0
                  ? 'Bekleyen aksiyon yok — harika! Veriler her 2 dakikada bir yenileniyor.'
                  : 'Bu filtre için aksiyon yok.'}
              </div>
            )}
          </div>

          {priority.data?.generated_at && (
            <div style={{ fontSize: 11, color: '#aaa', textAlign: 'right' }}>
              Son güncelleme: {formatHoursAgo(priority.data.generated_at)}
            </div>
          )}
        </>
      )}

      {tab === 'history' && (
        <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 12, padding: 24 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 16,
            }}
          >
            Haftalık Özet
          </div>
          {metrics.length === 0 ? (
            <div style={{ color: '#aaa', fontSize: 13, fontStyle: 'italic' }}>Henüz geçmiş veri yok.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {metrics.map((m) => (
                <div
                  key={m.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    background: '#FAFAFF',
                    borderRadius: 8,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{m.label_tr}</div>
                    {m.change_vs_prev !== 0 && (
                      <div
                        style={{
                          fontSize: 11,
                          color: m.change_vs_prev > 0 ? '#059669' : '#DC2626',
                          marginTop: 2,
                        }}
                      >
                        {m.change_vs_prev > 0 ? '↑' : '↓'} Geçen haftaya göre %{Math.abs(m.change_vs_prev)}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#5E5CE6' }}>{m.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const MetricStat = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div style={{ textAlign: 'center' }}>
    <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{label}</div>
  </div>
);

const ScoreStat = ({ label, value }: { label: string; value: number }) => (
  <div>
    <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
    <div style={{ fontSize: 14, fontWeight: 700, color: '#5E5CE6', marginTop: 2 }}>
      {(value * 100).toFixed(0)}%
    </div>
  </div>
);
