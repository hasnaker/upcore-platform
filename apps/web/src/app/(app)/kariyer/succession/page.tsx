'use client';

import { useState, useEffect } from 'react';

/* ─── Types ─── */
interface CandidateProfile {
  name: string;
  title: string;
  department: string;
  readinessScore: number;
  strengths: string[];
  developmentAreas: string[];
  tenure: string;
  batScore: number;
}

interface SuccessionCell {
  candidate: CandidateProfile | null;
}

interface CriticalPosition {
  id: string;
  title: string;
  currentHolder: string;
  department: string;
  readyNow: SuccessionCell;
  readyOneYear: SuccessionCell;
  readyThreeYear: SuccessionCell;
  riskLevel: 'high' | 'medium' | 'low';
}

/* ─── Data ─── */
const POSITIONS: CriticalPosition[] = [
  {
    id: '1',
    title: 'Satis Muduru',
    currentHolder: 'Ayse Yilmaz',
    department: 'Satis',
    readyNow: { candidate: null },
    readyOneYear: {
      candidate: {
        name: 'Mehmet Kaya',
        title: 'Kidemli Satis Uzmani',
        department: 'Satis',
        readinessScore: 72,
        strengths: ['Musteri iliskileri', 'Hedef tutturma', 'Ekip motivasyonu'],
        developmentAreas: ['Butce yonetimi', 'Stratejik planlama'],
        tenure: '3.5 yil',
        batScore: 2.1,
      },
    },
    readyThreeYear: {
      candidate: {
        name: 'Selin Ozturk',
        title: 'Satis Uzmani',
        department: 'Satis',
        readinessScore: 48,
        strengths: ['Analitik dusunme', 'Iletisim'],
        developmentAreas: ['Liderlik', 'Ekip yonetimi', 'Butce yonetimi'],
        tenure: '1.5 yil',
        batScore: 1.8,
      },
    },
    riskLevel: 'high',
  },
  {
    id: '2',
    title: 'Muhendislik Muduru',
    currentHolder: 'Burak Aydin',
    department: 'Muhendislik',
    readyNow: { candidate: null },
    readyOneYear: {
      candidate: {
        name: 'Onur Demir',
        title: 'Lead Backend Developer',
        department: 'Muhendislik',
        readinessScore: 65,
        strengths: ['Teknik liderlik', 'Sistem tasarimi', 'Mentorluk'],
        developmentAreas: ['Proje yonetimi', 'Bütce planlama'],
        tenure: '4 yil',
        batScore: 2.4,
      },
    },
    readyThreeYear: { candidate: null },
    riskLevel: 'high',
  },
  {
    id: '3',
    title: 'IK Direktoru',
    currentHolder: 'Hasan Aker',
    department: 'Insan Kaynaklari',
    readyNow: {
      candidate: {
        name: 'Fatma Ozkan',
        title: 'IK Muduru',
        department: 'Insan Kaynaklari',
        readinessScore: 88,
        strengths: ['Organizasyonel gelisim', 'Yetenek yonetimi', 'Mevzuat bilgisi'],
        developmentAreas: ['Ust yonetim sunumlari'],
        tenure: '6 yil',
        batScore: 1.6,
      },
    },
    readyOneYear: { candidate: null },
    readyThreeYear: { candidate: null },
    riskLevel: 'low',
  },
  {
    id: '4',
    title: 'Urun Muduru',
    currentHolder: 'Zeynep Arslan',
    department: 'Urun',
    readyNow: { candidate: null },
    readyOneYear: {
      candidate: {
        name: 'Can Yildiz',
        title: 'Kidemli Urun Analisti',
        department: 'Urun',
        readinessScore: 58,
        strengths: ['Veri analizi', 'Kullanici arastirmasi', 'Prototipleme'],
        developmentAreas: ['Stakeholder yonetimi', 'Stratejik vizyon'],
        tenure: '2.5 yil',
        batScore: 2.0,
      },
    },
    readyThreeYear: {
      candidate: {
        name: 'Elif Sahin',
        title: 'Urun Analisti',
        department: 'Urun',
        readinessScore: 35,
        strengths: ['Yaratici dusunme', 'Kullanici empatisi'],
        developmentAreas: ['Liderlik', 'Teknik bilgi', 'Proje yonetimi'],
        tenure: '1 yil',
        batScore: 1.5,
      },
    },
    riskLevel: 'medium',
  },
];

/* ─── Risk Config ─── */
const RISK_COLORS = {
  high: { bg: '#FEE2E2', text: '#DC2626', label: 'Yuksek Risk', border: '#FECACA' },
  medium: { bg: '#FEF3C7', text: '#D97706', label: 'Orta Risk', border: '#FDE68A' },
  low: { bg: '#D1FAE5', text: '#059669', label: 'Dusuk Risk', border: '#BBF7D0' },
};

const readinessColor = (score: number) => {
  if (score >= 80) return '#059669';
  if (score >= 60) return '#D97706';
  return '#DC2626';
};

export default function SuccessionPage() {
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateProfile | null>(null);
  const [showAddModal, setShowAddModal] = useState<string | null>(null);
  const [positions, setPositions] = useState<CriticalPosition[]>(POSITIONS);

  useEffect(() => {
    fetch('/api/career')
      .then((r) => r.json())
      .then((data) => {
        if (data.succession && data.succession.length > 0) {
          // Group by position
          const byPosition = new Map<string, typeof data.succession>();
          for (const s of data.succession) {
            const list = byPosition.get(s.position) || [];
            list.push(s);
            byPosition.set(s.position, list);
          }

          const mapped: CriticalPosition[] = Array.from(byPosition.entries()).map(([posTitle, candidates], idx) => {
            const readyNow = candidates.find((c: { readiness: string }) => c.readiness === 'ready_now');
            const ready1y = candidates.find((c: { readiness: string }) => c.readiness === '1_year');
            const ready3y = candidates.find((c: { readiness: string }) => c.readiness === '2_year' || c.readiness === '3_year');

            const toCandidateProfile = (c: { candidate: string; department: string; developmentAreas: string[]; readiness: string } | undefined): SuccessionCell => {
              if (!c) return { candidate: null };
              const readinessMap: Record<string, number> = { ready_now: 90, '1_year': 65, '2_year': 45, '3_year': 35 };
              return {
                candidate: {
                  name: c.candidate,
                  title: '',
                  department: c.department || '',
                  readinessScore: readinessMap[c.readiness] || 50,
                  strengths: [],
                  developmentAreas: c.developmentAreas || [],
                  tenure: '',
                  batScore: 2.0,
                },
              };
            };

            return {
              id: `db-${idx}`,
              title: posTitle,
              currentHolder: '—',
              department: candidates[0]?.department || '',
              readyNow: toCandidateProfile(readyNow),
              readyOneYear: toCandidateProfile(ready1y),
              readyThreeYear: toCandidateProfile(ready3y),
              riskLevel: readyNow ? 'low' as const : ready1y ? 'medium' as const : 'high' as const,
            };
          });

          if (mapped.length > 0) setPositions(mapped);
        }
      })
      .catch(() => {});
  }, []);

  const highRiskCount = positions.filter((p) => p.riskLevel === 'high').length;
  const noSuccessorPositions = positions.filter(
    (p) => !p.readyNow.candidate && !p.readyOneYear.candidate && !p.readyThreeYear.candidate
  ).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111' }}>
            Yedekleme Planlama
          </h1>
          <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>
            Kritik pozisyonlar icin yedekleme matrisi ve aday hazirligi (Yalnizca IK).
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            background: '#EEF0FD',
            borderRadius: 8,
            fontSize: 12,
            fontWeight: 600,
            color: '#5E5CE6',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5E5CE6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Yalnizca IK Erisimi
        </div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <div
          style={{
            background: 'white',
            border: '1px solid #f0f0f0',
            borderRadius: 12,
            padding: 16,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 700, color: '#111' }}>{positions.length}</div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Kritik Pozisyon</div>
        </div>
        <div
          style={{
            background: 'white',
            border: '1px solid #f0f0f0',
            borderRadius: 12,
            padding: 16,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 700, color: '#DC2626' }}>{highRiskCount}</div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Yuksek Risk</div>
        </div>
        <div
          style={{
            background: 'white',
            border: '1px solid #f0f0f0',
            borderRadius: 12,
            padding: 16,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 700, color: '#D97706' }}>
            {noSuccessorPositions}
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Yedek Yok</div>
        </div>
        <div
          style={{
            background: 'white',
            border: '1px solid #f0f0f0',
            borderRadius: 12,
            padding: 16,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 28, fontWeight: 700, color: '#059669' }}>
            {positions.filter((p) => p.readyNow.candidate).length}
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Hazir Yedek Var</div>
        </div>
      </div>

      {/* Succession matrix */}
      <div
        style={{
          background: 'white',
          border: '1px solid #f0f0f0',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid #f0f0f0',
            fontSize: 15,
            fontWeight: 600,
            color: '#111',
          }}
        >
          Kritik Pozisyon Yedekleme Matrisi
        </div>

        {/* Table header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '220px 160px 160px 160px 160px 60px',
            padding: '10px 24px',
            borderBottom: '1px solid #f0f0f0',
            background: '#fafafa',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Kritik Pozisyon
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Su An Kim
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Hazir Simdi
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            1 Yilda
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            3 Yilda
          </div>
          <div />
        </div>

        {/* Table rows */}
        {positions.map((pos) => {
          const risk = RISK_COLORS[pos.riskLevel];
          return (
            <div
              key={pos.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '220px 160px 160px 160px 160px 60px',
                padding: '14px 24px',
                borderBottom: '1px solid #f0f0f0',
                alignItems: 'center',
                borderLeft: `3px solid ${risk.text}`,
              }}
            >
              {/* Position */}
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{pos.title}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: '#888' }}>{pos.department}</span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: 10,
                      background: risk.bg,
                      color: risk.text,
                    }}
                  >
                    {risk.label}
                  </span>
                </div>
              </div>

              {/* Current holder */}
              <div style={{ fontSize: 13, color: '#555' }}>{pos.currentHolder}</div>

              {/* Ready Now */}
              <CandidateCell
                cell={pos.readyNow}
                onClick={() => pos.readyNow.candidate && setSelectedCandidate(pos.readyNow.candidate)}
              />

              {/* Ready 1 Year */}
              <CandidateCell
                cell={pos.readyOneYear}
                onClick={() => pos.readyOneYear.candidate && setSelectedCandidate(pos.readyOneYear.candidate)}
              />

              {/* Ready 3 Year */}
              <CandidateCell
                cell={pos.readyThreeYear}
                onClick={() => pos.readyThreeYear.candidate && setSelectedCandidate(pos.readyThreeYear.candidate)}
              />

              {/* Add candidate */}
              <button
                onClick={() => setShowAddModal(pos.id)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: '1px dashed #d4d4d4',
                  background: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#aaa',
                  fontSize: 14,
                }}
                title="Aday Ekle"
              >
                +
              </button>
            </div>
          );
        })}
      </div>

      {/* Candidate detail modal */}
      {selectedCandidate && (
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
          onClick={() => setSelectedCandidate(null)}
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
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: '#5E5CE6',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                {selectedCandidate.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>
                  {selectedCandidate.name}
                </div>
                <div style={{ fontSize: 13, color: '#888' }}>
                  {selectedCandidate.title} — {selectedCandidate.department}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: readinessColor(selectedCandidate.readinessScore),
                  }}
                >
                  %{selectedCandidate.readinessScore}
                </div>
                <div style={{ fontSize: 10, color: '#888' }}>Hazirlik</div>
              </div>
            </div>

            {/* Info grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div style={{ padding: '10px 14px', background: '#fafafa', borderRadius: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Kidem
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111', marginTop: 2 }}>
                  {selectedCandidate.tenure}
                </div>
              </div>
              <div style={{ padding: '10px 14px', background: '#fafafa', borderRadius: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  BAT-12 Skoru
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: selectedCandidate.batScore < 2.0 ? '#059669' : selectedCandidate.batScore < 3.0 ? '#D97706' : '#DC2626',
                    marginTop: 2,
                  }}
                >
                  {selectedCandidate.batScore.toFixed(1)}
                </div>
              </div>
            </div>

            {/* Strengths */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Guclu Yonler
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {selectedCandidate.strengths.map((s) => (
                  <span
                    key={s}
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      padding: '4px 10px',
                      borderRadius: 6,
                      background: '#D1FAE5',
                      color: '#059669',
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Development Areas */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Gelisim Alanlari
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {selectedCandidate.developmentAreas.map((d) => (
                  <span
                    key={d}
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      padding: '4px 10px',
                      borderRadius: 6,
                      background: '#FEF3C7',
                      color: '#D97706',
                    }}
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div>

            {/* Readiness bar */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, color: '#888' }}>Hazirlik Skoru</span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: readinessColor(selectedCandidate.readinessScore),
                  }}
                >
                  %{selectedCandidate.readinessScore}
                </span>
              </div>
              <div style={{ height: 8, background: '#f0f0f0', borderRadius: 4 }}>
                <div
                  style={{
                    height: 8,
                    borderRadius: 4,
                    width: `${selectedCandidate.readinessScore}%`,
                    background: readinessColor(selectedCandidate.readinessScore),
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>

            <button
              onClick={() => setSelectedCandidate(null)}
              style={{
                width: '100%',
                fontSize: 13,
                fontWeight: 600,
                color: '#888',
                background: '#fafafa',
                border: '1px solid #e5e5e5',
                borderRadius: 8,
                padding: '10px 20px',
                cursor: 'pointer',
              }}
            >
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* Add candidate modal */}
      {showAddModal && (
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
          onClick={() => setShowAddModal(null)}
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
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111', marginBottom: 6 }}>
              Aday Ekle
            </div>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
              {positions.find((p) => p.id === showAddModal)?.title} pozisyonu icin yedek aday
              ekleyin.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Calisan Adi', placeholder: 'orn. Mehmet Kaya' },
                { label: 'Hazirlik Suresi', placeholder: 'orn. 1 Yil' },
              ].map((field) => (
                <div key={field.label}>
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
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <button
                onClick={() => setShowAddModal(null)}
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
                onClick={() => setShowAddModal(null)}
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
                Aday Ekle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Helper Components ─── */
interface CandidateCellProps {
  cell: SuccessionCell;
  onClick: () => void;
}

const CandidateCell = ({ cell, onClick }: CandidateCellProps) => {
  if (!cell.candidate) {
    return (
      <span
        style={{
          fontSize: 12,
          color: '#ccc',
          fontStyle: 'italic',
        }}
      >
        —
      </span>
    );
  }

  const rc = readinessColor(cell.candidate.readinessScore);

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'none',
        border: '1px solid transparent',
        borderRadius: 8,
        padding: '4px 8px',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e5e5';
        (e.currentTarget as HTMLButtonElement).style.background = '#fafafa';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent';
        (e.currentTarget as HTMLButtonElement).style.background = 'none';
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: '#EEF0FD',
          color: '#5E5CE6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 9,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        {cell.candidate.name
          .split(' ')
          .map((n) => n[0])
          .join('')}
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: '#111' }}>
          {cell.candidate.name.split(' ')[0]}{' '}
          {cell.candidate.name.split(' ')[1]?.[0]}.
        </div>
        <div style={{ fontSize: 10, color: rc, fontWeight: 600 }}>
          %{cell.candidate.readinessScore}
        </div>
      </div>
    </button>
  );
};
