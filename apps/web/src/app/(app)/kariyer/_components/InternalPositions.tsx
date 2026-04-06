'use client';

import { useState, useEffect } from 'react';

/* ─── Types ─── */
interface InternalPosition {
  id: string;
  title: string;
  department: string;
  seniorityReq: string;
  strengths: string[];
  fitScore: number;
  description: string;
  jdrProfile: { demands: number; resources: number };
  benefits: string[];
  requiredSkills: string[];
  fitBreakdown?: { profileMatch: number; jdrBalance: number; skillCoverage: number; readinessIndex: number } | null;
  fitInterpretation?: string | null;
}

interface NewPositionForm {
  title: string;
  department: string;
  seniorityReq: string;
  strengths: string;
  description: string;
}

/* ─── Fallback Data ─── */
const FALLBACK_POSITIONS: InternalPosition[] = [
  {
    id: '1',
    title: 'Satis Ekip Lideri',
    department: 'Satis Departmani',
    seniorityReq: '3+ yil',
    strengths: ['Liderlik', 'Iletisim'],
    fitScore: 82,
    description:
      'Satis ekibinin gunluk operasyonlarini yonetmek, hedefleri belirlemek ve ekip uyelerinin gelisimini desteklemek. Musteri iliskilerinde stratejik yonlendirme yapmak.',
    jdrProfile: { demands: 72, resources: 65 },
    benefits: ['Yonetim deneyimi', 'Bonus hakki (+%15)', 'Liderlik egitimi paketi'],
    requiredSkills: ['Ekip yonetimi', 'Hedef belirleme', 'Performans degerlendirme', 'Musteri iliskileri'],
  },
  {
    id: '2',
    title: 'Kidemli Urun Analisti',
    department: 'Urun Departmani',
    seniorityReq: '2+ yil',
    strengths: ['Analitik', 'Problem Cozme'],
    fitScore: 74,
    description:
      'Urun metriklerini analiz etmek, kullanici davranislarini incelemek ve urun yol haritasina veri odakli katkilar saglamak. Cross-functional ekiplerle isbirligi yapmak.',
    jdrProfile: { demands: 65, resources: 70 },
    benefits: ['Urun stratejisi deneyimi', 'Uzaktan calisma esnekligi', 'Konferans butcesi'],
    requiredSkills: ['Veri analizi', 'SQL', 'A/B test tasarimi', 'Kullanici arastirmasi'],
  },
  {
    id: '3',
    title: 'Backend Lead',
    department: 'Muhendislik',
    seniorityReq: '4+ yil',
    strengths: ['Teknik', 'Liderlik'],
    fitScore: 68,
    description:
      'Backend mimarisini tasarlamak, teknik kararlari yonlendirmek ve muhendislik ekibine mentorluk yapmak. Performans ve olceklenebilirlik odakli calismak.',
    jdrProfile: { demands: 78, resources: 60 },
    benefits: ['Teknik liderlik', 'Egitim butcesi (₺15K/yil)', 'Esnek calisma saatleri'],
    requiredSkills: ['Sistem tasarimi', 'Node.js / Go', 'CI/CD', 'Kod inceleme', 'Mentorluk'],
  },
];

/* ─── Fit Score Color ─── */
const fitScoreColor = (score: number) => {
  if (score >= 80) return { bg: '#D1FAE5', text: '#059669' };
  if (score >= 70) return { bg: '#FEF3C7', text: '#D97706' };
  return { bg: '#FEE2E2', text: '#DC2626' };
};

export const InternalPositions = () => {
  const [positions, setPositions] = useState<InternalPosition[]>(FALLBACK_POSITIONS);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/career')
      .then((r) => r.json())
      .then((data) => {
        if (data.positions && data.positions.length > 0) {
          const mapped: InternalPosition[] = data.positions.map((p: {
            id: string; title: string; department: string; seniorityReq: string | null;
            description: string | null; requiredSkills: string[]; jdrProfile: { demands: number; resources: number };
            fitScore?: number | null; fitBreakdown?: Record<string, number> | null; fitInterpretation?: string | null;
          }) => ({
            id: p.id,
            title: p.title,
            department: p.department || '',
            seniorityReq: p.seniorityReq || '',
            strengths: [],
            fitScore: p.fitScore ?? 0,
            description: p.description || '',
            jdrProfile: p.jdrProfile || { demands: 0, resources: 0 },
            benefits: [],
            requiredSkills: Array.isArray(p.requiredSkills) ? p.requiredSkills : [],
            fitBreakdown: p.fitBreakdown || null,
            fitInterpretation: p.fitInterpretation || null,
          }));
          setPositions(mapped);
        }
      })
      .catch(() => {});
  }, []);
  const [confirmModal, setConfirmModal] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newForm, setNewForm] = useState<NewPositionForm>({
    title: '',
    department: '',
    seniorityReq: '',
    strengths: '',
    description: '',
  });

  const handleApply = (id: string) => {
    setConfirmModal(id);
  };

  const confirmApplication = () => {
    if (confirmModal) {
      setApplied((prev) => new Set(prev).add(confirmModal));
      setConfirmModal(null);
      const pos = positions.find((p) => p.id === confirmModal);
      setSuccessToast(pos?.title ?? '');
      setTimeout(() => setSuccessToast(null), 3000);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Privacy banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 16px',
          background: '#FAFAFF',
          border: '1px solid #E0E0FF',
          borderRadius: 10,
        }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#5E5CE6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <span style={{ fontSize: 13, color: '#5E5CE6', fontWeight: 500 }}>
          Gizlilik: Basvurunuz teklif asamasina kadar mevcut yoneticinize bildirilmez.
        </span>
      </div>

      {/* Position cards */}
      {positions.map((pos) => {
        const isExpanded = expanded === pos.id;
        const isApplied = applied.has(pos.id);
        const sc = fitScoreColor(pos.fitScore);

        return (
          <div
            key={pos.id}
            style={{
              background: 'white',
              border: '1px solid #f0f0f0',
              borderRadius: 12,
              overflow: 'hidden',
              borderLeft: `3px solid ${sc.text}`,
            }}
          >
            <div style={{ padding: '20px 24px' }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#111' }}>{pos.title}</div>
                  <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{pos.department}</div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      marginTop: 10,
                      flexWrap: 'wrap',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: '3px 10px',
                        borderRadius: 20,
                        background: '#f5f5f5',
                        color: '#666',
                      }}
                    >
                      Gerekli kidem: {pos.seniorityReq}
                    </span>
                    {pos.strengths.map((s) => (
                      <span
                        key={s}
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          padding: '3px 10px',
                          borderRadius: 20,
                          background: '#EEF0FD',
                          color: '#5E5CE6',
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                    }}
                  >
                    <span style={{ fontSize: 22, fontWeight: 700, color: sc.text }}>
                      %{pos.fitScore}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '1px 8px',
                        borderRadius: 10,
                        background: sc.bg,
                        color: sc.text,
                      }}
                    >
                      Uyum skoru
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => setExpanded(isExpanded ? null : pos.id)}
                  style={{
                    fontSize: 12,
                    color: '#888',
                    background: 'none',
                    border: '1px solid #e5e5e5',
                    borderRadius: 8,
                    padding: '6px 14px',
                    cursor: 'pointer',
                  }}
                >
                  {isExpanded ? 'Kapat' : 'Detay'}
                </button>
                {isApplied ? (
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#059669',
                      padding: '6px 14px',
                      background: '#D1FAE5',
                      borderRadius: 8,
                    }}
                  >
                    Basvuruldu
                  </span>
                ) : (
                  <button
                    onClick={() => handleApply(pos.id)}
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: 'white',
                      background: '#111',
                      border: 'none',
                      borderRadius: 8,
                      padding: '6px 14px',
                      cursor: 'pointer',
                    }}
                  >
                    Basvur →
                  </button>
                )}
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div
                  style={{
                    marginTop: 16,
                    paddingTop: 16,
                    borderTop: '1px solid #f0f0f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  {/* Description */}
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#888',
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        marginBottom: 6,
                      }}
                    >
                      Pozisyon Tanimi
                    </div>
                    <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6 }}>
                      {pos.description}
                    </p>
                  </div>

                  {/* JD-R Profile */}
                  <div
                    style={{
                      background: '#FAFAFF',
                      border: '1px solid #E0E0FF',
                      borderRadius: 10,
                      padding: 14,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#5E5CE6',
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        marginBottom: 10,
                      }}
                    >
                      JD-R Profili
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <div className="flex items-center justify-between">
                          <span style={{ fontSize: 11, color: '#888' }}>Is Talepleri</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#111' }}>
                            {pos.jdrProfile.demands}%
                          </span>
                        </div>
                        <div
                          style={{
                            height: 6,
                            background: '#f0f0f0',
                            borderRadius: 3,
                            marginTop: 4,
                          }}
                        >
                          <div
                            style={{
                              height: 6,
                              borderRadius: 3,
                              width: `${pos.jdrProfile.demands}%`,
                              background:
                                pos.jdrProfile.demands > 70 ? '#DC2626' : '#D97706',
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between">
                          <span style={{ fontSize: 11, color: '#888' }}>Is Kaynaklari</span>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#111' }}>
                            {pos.jdrProfile.resources}%
                          </span>
                        </div>
                        <div
                          style={{
                            height: 6,
                            background: '#f0f0f0',
                            borderRadius: 3,
                            marginTop: 4,
                          }}
                        >
                          <div
                            style={{
                              height: 6,
                              borderRadius: 3,
                              width: `${pos.jdrProfile.resources}%`,
                              background: '#5E5CE6',
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fit Score Breakdown — Algoritmik Uyum Analizi */}
                  {pos.fitBreakdown && (
                    <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: 14 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                        Uyum Analizi (Algoritmik)
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {[
                          { label: 'Profil Eslesmesi', value: pos.fitBreakdown.profileMatch, color: '#5E5CE6' },
                          { label: 'JD-R Dengesi', value: pos.fitBreakdown.jdrBalance, color: '#0EA5E9' },
                          { label: 'Yetkinlik Kapsama', value: pos.fitBreakdown.skillCoverage, color: '#D97706' },
                          { label: 'Hazirlik Indeksi', value: pos.fitBreakdown.readinessIndex, color: '#059669' },
                        ].map((item) => (
                          <div key={item.label}>
                            <div className="flex items-center justify-between">
                              <span style={{ fontSize: 11, color: '#555' }}>{item.label}</span>
                              <span style={{ fontSize: 11, fontWeight: 600, color: item.color }}>%{item.value}</span>
                            </div>
                            <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, marginTop: 4 }}>
                              <div style={{ height: 6, borderRadius: 3, width: `${item.value}%`, background: item.color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      {pos.fitInterpretation && (
                        <div style={{ marginTop: 10, fontSize: 12, color: '#059669', fontWeight: 500 }}>
                          {pos.fitInterpretation}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Required skills */}
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#888',
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        marginBottom: 8,
                      }}
                    >
                      Gerekli Yetkinlikler
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {pos.requiredSkills.map((skill) => (
                        <span
                          key={skill}
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            padding: '4px 10px',
                            borderRadius: 6,
                            background: '#f5f5f5',
                            color: '#555',
                          }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Benefits */}
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#888',
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        marginBottom: 8,
                      }}
                    >
                      Avantajlar
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {pos.benefits.map((b) => (
                        <div key={b} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: '#059669',
                              flexShrink: 0,
                            }}
                          />
                          <span style={{ fontSize: 13, color: '#555' }}>{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* HR only: Add new position button */}
      <button
        onClick={() => setShowNewForm(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '12px 20px',
          background: 'white',
          border: '1px dashed #d4d4d4',
          borderRadius: 12,
          fontSize: 13,
          fontWeight: 600,
          color: '#888',
          cursor: 'pointer',
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        Yeni Ic Pozisyon Ekle (HR)
      </button>

      {/* Confirm Modal */}
      {confirmModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => setConfirmModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: 16,
              padding: 32,
              maxWidth: 420,
              width: '90%',
              boxShadow: '0 24px 48px rgba(0,0,0,0.12)',
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 8 }}>
              Basvuruyu Onayla
            </div>
            <p style={{ fontSize: 14, color: '#555', lineHeight: 1.6, marginBottom: 8 }}>
              <strong>{positions.find((p) => p.id === confirmModal)?.title}</strong> pozisyonuna
              basvurunuzu gonderiyorsunuz.
            </p>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 14px',
                background: '#FAFAFF',
                border: '1px solid #E0E0FF',
                borderRadius: 8,
                marginBottom: 20,
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#5E5CE6"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span style={{ fontSize: 12, color: '#5E5CE6' }}>
                Basvurunuz teklif asamasina kadar gizli tutulacaktir.
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmModal(null)}
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#888',
                  background: 'none',
                  border: '1px solid #e5e5e5',
                  borderRadius: 8,
                  padding: '8px 16px',
                  cursor: 'pointer',
                }}
              >
                Vazgec
              </button>
              <button
                onClick={confirmApplication}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'white',
                  background: '#111',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 20px',
                  cursor: 'pointer',
                }}
              >
                Basvuruyu Gonder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Position Modal */}
      {showNewForm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
          onClick={() => setShowNewForm(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: 16,
              padding: 32,
              maxWidth: 480,
              width: '90%',
              boxShadow: '0 24px 48px rgba(0,0,0,0.12)',
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 20 }}>
              Yeni Ic Pozisyon Ekle
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Pozisyon Adi', key: 'title' as const, placeholder: 'orn. Satis Ekip Lideri' },
                { label: 'Departman', key: 'department' as const, placeholder: 'orn. Satis Departmani' },
                { label: 'Gerekli Kidem', key: 'seniorityReq' as const, placeholder: 'orn. 3+ yil' },
                { label: 'Guclu Yonler (virgul ile)', key: 'strengths' as const, placeholder: 'orn. Liderlik, Iletisim' },
              ].map((field) => (
                <div key={field.key}>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: '#888',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      marginBottom: 4,
                      display: 'block',
                    }}
                  >
                    {field.label}
                  </label>
                  <input
                    type="text"
                    placeholder={field.placeholder}
                    value={newForm[field.key]}
                    onChange={(e) =>
                      setNewForm((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      fontSize: 13,
                      border: '1px solid #e5e5e5',
                      borderRadius: 8,
                      outline: 'none',
                    }}
                  />
                </div>
              ))}
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#888',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    marginBottom: 4,
                    display: 'block',
                  }}
                >
                  Aciklama
                </label>
                <textarea
                  placeholder="Pozisyon tanimi..."
                  value={newForm.description}
                  onChange={(e) =>
                    setNewForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: 13,
                    border: '1px solid #e5e5e5',
                    borderRadius: 8,
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button
                onClick={() => setShowNewForm(false)}
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#888',
                  background: 'none',
                  border: '1px solid #e5e5e5',
                  borderRadius: 8,
                  padding: '8px 16px',
                  cursor: 'pointer',
                }}
              >
                Vazgec
              </button>
              <button
                onClick={() => setShowNewForm(false)}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'white',
                  background: '#5E5CE6',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 20px',
                  cursor: 'pointer',
                }}
              >
                Pozisyonu Yayinla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success toast */}
      {successToast && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#111',
            color: 'white',
            padding: '14px 24px',
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
            zIndex: 60,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#059669"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {successToast} pozisyonuna basarili bir sekilde basvurdunuz.
        </div>
      )}
    </div>
  );
};
