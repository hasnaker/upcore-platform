'use client';

import { useState } from 'react';

/* ─── Types ─── */
interface CareerNode {
  id: string;
  title: string;
  fitScore: number;
  prepTime: string;
  isCurrent?: boolean;
  skillGaps: SkillGap[];
}

interface SkillGap {
  name: string;
  type: 'improve' | 'new';
  detail: string;
}

/* ─── Data ─── */
const CURRENT_ROLE: CareerNode = {
  id: 'current',
  title: 'Satis Uzmani',
  fitScore: 100,
  prepTime: 'Mevcut',
  isCurrent: true,
  skillGaps: [],
};

const NEXT_ROLES: CareerNode[] = [
  {
    id: 'lead',
    title: 'Satis Ekip Lideri',
    fitScore: 82,
    prepTime: '1 yil',
    skillGaps: [
      { name: 'Liderlik', type: 'improve', detail: '+2 puan gerekli' },
      { name: 'Delegasyon', type: 'new', detail: 'Yeni yetkinlik' },
      { name: 'Performans Yonetimi', type: 'new', detail: 'Yeni yetkinlik' },
    ],
  },
  {
    id: 'senior',
    title: 'Kidemli Satis Uzmani',
    fitScore: 91,
    prepTime: '6 ay',
    skillGaps: [
      { name: 'Stratejik Satis', type: 'improve', detail: '+1 puan gerekli' },
    ],
  },
];

const ADVANCED_ROLES: CareerNode[] = [
  {
    id: 'manager',
    title: 'Satis Muduru',
    fitScore: 65,
    prepTime: '3 yil',
    skillGaps: [
      { name: 'Butce Yonetimi', type: 'new', detail: 'Yeni yetkinlik' },
      { name: 'Stratejik Planlama', type: 'new', detail: 'Yeni yetkinlik' },
      { name: 'Ust Yonetim Iletisimi', type: 'improve', detail: '+3 puan gerekli' },
      { name: 'Liderlik', type: 'improve', detail: '+4 puan gerekli' },
    ],
  },
];

const fitColor = (score: number) => {
  if (score >= 85) return { bg: '#D1FAE5', text: '#059669', border: '#BBF7D0' };
  if (score >= 70) return { bg: '#FEF3C7', text: '#D97706', border: '#FDE68A' };
  return { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA' };
};

export const CareerPath = () => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [targetSet, setTargetSet] = useState<string | null>(null);

  const allNodes = [...NEXT_ROLES, ...ADVANCED_ROLES];
  const selectedRole = allNodes.find((n) => n.id === selectedNode);

  return (
    <div className="flex flex-col gap-6">
      {/* Visual career tree */}
      <div
        style={{
          background: 'white',
          border: '1px solid #f0f0f0',
          borderRadius: 12,
          padding: 32,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#888',
            textTransform: 'uppercase',
            letterSpacing: 1,
            marginBottom: 24,
          }}
        >
          Kariyer Yolu Haritasi
        </div>

        {/* Tree layout */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
          {/* Current role */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '16px 28px',
              background: '#5E5CE6',
              borderRadius: 12,
              color: 'white',
              position: 'relative',
              zIndex: 2,
            }}
          >
            <div style={{ fontSize: 10, fontWeight: 600, opacity: 0.8 }}>Mevcut Pozisyon</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{CURRENT_ROLE.title}</div>
          </div>

          {/* Connector line down */}
          <div
            style={{
              width: 2,
              height: 32,
              background: '#d4d4d4',
            }}
          />

          {/* Branch split */}
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', width: '100%' }}>
            {/* Horizontal connector */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 300,
                height: 2,
                background: '#d4d4d4',
              }}
            />
          </div>

          {/* Next roles row */}
          <div
            style={{
              display: 'flex',
              gap: 48,
              justifyContent: 'center',
              width: '100%',
              position: 'relative',
            }}
          >
            {NEXT_ROLES.map((role) => {
              const fc = fitColor(role.fitScore);
              const isSelected = selectedNode === role.id;
              const isTarget = targetSet === role.id;
              return (
                <div
                  key={role.id}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}
                >
                  {/* Vertical connector */}
                  <div style={{ width: 2, height: 20, background: '#d4d4d4' }} />

                  <button
                    onClick={() => setSelectedNode(isSelected ? null : role.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      padding: '14px 24px',
                      background: isSelected ? '#FAFAFF' : 'white',
                      border: isSelected ? '2px solid #5E5CE6' : '1px solid #e5e5e5',
                      borderRadius: 12,
                      cursor: 'pointer',
                      position: 'relative',
                      minWidth: 180,
                    }}
                  >
                    {isTarget && (
                      <div
                        style={{
                          position: 'absolute',
                          top: -8,
                          right: -8,
                          background: '#5E5CE6',
                          color: 'white',
                          fontSize: 9,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 10,
                        }}
                      >
                        HEDEF
                      </div>
                    )}
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{role.title}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: fc.text,
                        }}
                      >
                        %{role.fitScore}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: 10,
                          background: fc.bg,
                          color: fc.text,
                        }}
                      >
                        Uyum
                      </span>
                    </div>
                    <span style={{ fontSize: 11, color: '#888' }}>
                      Hazirlik: {role.prepTime}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Connector from lead to manager */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              width: '100%',
              marginTop: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                marginRight: 114,
              }}
            >
              <div style={{ width: 2, height: 24, background: '#d4d4d4' }} />
            </div>
          </div>

          {/* Advanced role */}
          <div style={{ display: 'flex', justifyContent: 'center', width: '100%', marginRight: 114 }}>
            {ADVANCED_ROLES.map((role) => {
              const fc = fitColor(role.fitScore);
              const isSelected = selectedNode === role.id;
              const isTarget = targetSet === role.id;
              return (
                <button
                  key={role.id}
                  onClick={() => setSelectedNode(isSelected ? null : role.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    padding: '14px 24px',
                    background: isSelected ? '#FAFAFF' : 'white',
                    border: isSelected ? '2px solid #5E5CE6' : '1px solid #e5e5e5',
                    borderRadius: 12,
                    cursor: 'pointer',
                    position: 'relative',
                    minWidth: 180,
                  }}
                >
                  {isTarget && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        background: '#5E5CE6',
                        color: 'white',
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 10,
                      }}
                    >
                      HEDEF
                    </div>
                  )}
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{role.title}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: fc.text }}>
                      %{role.fitScore}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 10,
                        background: fc.bg,
                        color: fc.text,
                      }}
                    >
                      Uyum
                    </span>
                  </div>
                  <span style={{ fontSize: 11, color: '#888' }}>Hazirlik: {role.prepTime}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Skill gap analysis panel */}
      {selectedRole && (
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
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>
                {selectedRole.title} icin Yetkinlik Analizi
              </div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                Mevcut profilinize gore eksik yetkinlikler ve gelisim alanlari
              </div>
            </div>
            {targetSet === selectedRole.id ? (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#5E5CE6',
                  padding: '6px 14px',
                  background: '#EEF0FD',
                  borderRadius: 8,
                }}
              >
                Hedef Belirlendi
              </span>
            ) : (
              <button
                onClick={() => setTargetSet(selectedRole.id)}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'white',
                  background: '#5E5CE6',
                  border: 'none',
                  borderRadius: 8,
                  padding: '8px 16px',
                  cursor: 'pointer',
                }}
              >
                Hedef Belirle
              </button>
            )}
          </div>

          <div style={{ padding: 24 }}>
            {selectedRole.skillGaps.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {selectedRole.skillGaps.map((gap) => (
                  <div
                    key={gap.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      background: gap.type === 'new' ? '#FEF2F2' : '#FFFBEB',
                      borderRadius: 10,
                      border: `1px solid ${gap.type === 'new' ? '#FECACA' : '#FDE68A'}`,
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: gap.type === 'new' ? '#FEE2E2' : '#FEF3C7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: gap.type === 'new' ? '#DC2626' : '#D97706' }}>
                        {gap.type === 'new' ? '+' : '↑'}
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111' }}>{gap.name}</div>
                      <div style={{ fontSize: 12, color: '#888', marginTop: 1 }}>{gap.detail}</div>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: 10,
                        background: gap.type === 'new' ? '#FEE2E2' : '#FEF3C7',
                        color: gap.type === 'new' ? '#DC2626' : '#D97706',
                      }}
                    >
                      {gap.type === 'new' ? 'Yeni' : 'Gelistir'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 24, color: '#aaa', fontSize: 13 }}>
                Bu rol icin yetkinlik acigi bulunamadi.
              </div>
            )}

            {/* IDP info */}
            {targetSet === selectedRole.id && (
              <div
                style={{
                  marginTop: 16,
                  padding: '14px 18px',
                  background: '#F0FDF4',
                  border: '1px solid #BBF7D0',
                  borderRadius: 10,
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
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span style={{ fontSize: 13, color: '#059669', fontWeight: 500 }}>
                  Bireysel Gelisim Plani (IDP) olusturuldu. Yoneticiniz bilgilendirilecek ve gelisim
                  adimlari takibe alinacak.
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Guidance text */}
      <div
        style={{
          fontSize: 12,
          color: '#aaa',
          textAlign: 'center',
          padding: '8px 16px',
        }}
      >
        Kariyer yolu haritaniz mevcut yetkinlikleriniz, JD-R profiliniz ve kurum ici firsat
        analizine gore olusturulmustur.
      </div>
    </div>
  );
};
