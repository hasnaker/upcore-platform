'use client';

import { useState } from 'react';

/* ─── Types ─── */
interface CraftingSuggestion {
  id: string;
  category: 'task' | 'relational' | 'cognitive';
  title: string;
  description: string;
  rationale: string;
  status: 'pending' | 'accepted' | 'rejected';
}

/* ─── Category Config ─── */
const CATEGORY_CONFIG = {
  task: {
    label: 'Gorev Crafting',
    color: '#5E5CE6',
    bg: '#EEF0FD',
    border: '#E0E0FF',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5E5CE6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="9" y1="9" x2="15" y2="15" />
        <line x1="15" y1="9" x2="9" y2="15" />
      </svg>
    ),
  },
  relational: {
    label: 'Iliski Crafting',
    color: '#0d9488',
    bg: '#CCFBF1',
    border: '#99F6E4',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  cognitive: {
    label: 'Bilissel Crafting',
    color: '#D97706',
    bg: '#FEF3C7',
    border: '#FDE68A',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z" />
        <line x1="9" y1="21" x2="15" y2="21" />
      </svg>
    ),
  },
};

/* ─── Data ─── */
const INITIAL_SUGGESTIONS: CraftingSuggestion[] = [
  {
    id: '1',
    category: 'task',
    title: 'Musteri egitimi sorumlulugu eklenmesi oneriliyor',
    description:
      'Guclu yonunuz Iletisim — mevcut musteri tabanina yonelik urun egitim seanslarini yonetebilirsiniz. Bu, satis sonrasi memnuniyeti arttirir ve upsell firsatlari yaratir.',
    rationale: 'Iletisim puaniniz 8.2/10 — en guclu yonunuz. Bu gorevi ustlenmek JD-R kaynak dengenizi arttirir.',
    status: 'pending',
  },
  {
    id: '2',
    category: 'task',
    title: 'Haftalik satis raporu hazirlama gorevi devredilmeli',
    description:
      'Rutinlesik raporlama gorevi guclu yonlerinizle uyusmuyor. Bu gorevi otomasyon veya junior bir ekip uyesine devretmek JD-R talep yukunuzu azaltir.',
    rationale: 'Analitik puaniniz 5.8/10 — orta seviye. Bu gorev enerji tuketirken deger katmiyor.',
    status: 'pending',
  },
  {
    id: '3',
    category: 'relational',
    title: 'Muhendislik ekibiyle haftalik sync toplantisi',
    description:
      'Cross-functional isbirligi arttirir. Urun geribildirimi dogrudan muhendislik ekibine ulastirarak satis-muhendislik arasindaki kopuklugu giderir.',
    rationale: 'Isbirligi kaynaklari JD-R modelinde dusuk (4.1/10). Bu toplanti kaynak artisina katkida bulunur.',
    status: 'pending',
  },
  {
    id: '4',
    category: 'relational',
    title: 'Yeni baslayanlar icin buddy sistemi',
    description:
      'Departmana yeni katilan calisanlara mentorluk yapmak. Liderlik yetkinliginizi gelistirirken sosyal kaynaklarinizi arttirir.',
    rationale: 'Liderlik puaniniz 6.5/10 — gelisim alaninda. Buddy sistemi dusuk riskli liderlik deneyimi saglar.',
    status: 'pending',
  },
  {
    id: '5',
    category: 'cognitive',
    title: 'Satis rolunuzu "musteri basarisi danismani" olarak yeniden cerceveleyebilirsiniz',
    description:
      'Satis hedeflerini "musteri sorunlarina cozum uretme" perspektifinden gormek, islev odakli motivasyonu arttirir ve tukenmislik riskini azaltir. Wrzesniewski & Dutton (2001) arastirmasina gore bilissel crafting, is tatminini %23 arttirir.',
    rationale: 'JD-R modelinde anlam kaynaklari dusuk (5.2/10). Bilissel yeniden cerceveleme bu kaynagi arttirir.',
    status: 'pending',
  },
];

/* ─── Status Config ─── */
const STATUS_CONFIG = {
  accepted: { bg: '#D1FAE5', text: '#059669', label: 'Kabul Edildi' },
  rejected: { bg: '#FEE2E2', text: '#DC2626', label: 'Reddedildi' },
  pending: { bg: '#f5f5f5', text: '#888', label: 'Beklemede' },
};

export const JobCrafting = () => {
  const [suggestions, setSuggestions] = useState<CraftingSuggestion[]>(INITIAL_SUGGESTIONS);

  const handleDecision = (id: string, decision: 'accepted' | 'rejected') => {
    setSuggestions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: decision } : s))
    );
  };

  const grouped = {
    task: suggestions.filter((s) => s.category === 'task'),
    relational: suggestions.filter((s) => s.category === 'relational'),
    cognitive: suggestions.filter((s) => s.category === 'cognitive'),
  };

  const stats = {
    total: suggestions.length,
    accepted: suggestions.filter((s) => s.status === 'accepted').length,
    rejected: suggestions.filter((s) => s.status === 'rejected').length,
    pending: suggestions.filter((s) => s.status === 'pending').length,
  };

  return (
    <div className="flex flex-col gap-6">
      {/* AI info banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          padding: '14px 18px',
          background: '#FAFAFF',
          border: '1px solid #E0E0FF',
          borderRadius: 10,
        }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#5E5CE6"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ flexShrink: 0, marginTop: 1 }}
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#5E5CE6' }}>
            AI Destekli Job Crafting Onerileri
          </div>
          <div style={{ fontSize: 12, color: '#666', marginTop: 2, lineHeight: 1.5 }}>
            Bu oneriler guclu yon profiliniz + JD-R dengenize gore uretilmistir. Job crafting,
            calisanlarin kendi rollerini guclu yonleri dogrultusunda sekillendirmesini saglayan
            bilimsel bir yaklasimdir (Wrzesniewski & Dutton, 2001).
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          padding: '12px 20px',
          background: 'white',
          border: '1px solid #f0f0f0',
          borderRadius: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#111' }}>{stats.total}</span>
          <span style={{ fontSize: 11, color: '#888' }}>Toplam</span>
        </div>
        <div style={{ width: 1, background: '#f0f0f0' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#059669' }}>{stats.accepted}</span>
          <span style={{ fontSize: 11, color: '#888' }}>Kabul</span>
        </div>
        <div style={{ width: 1, background: '#f0f0f0' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#DC2626' }}>{stats.rejected}</span>
          <span style={{ fontSize: 11, color: '#888' }}>Red</span>
        </div>
        <div style={{ width: 1, background: '#f0f0f0' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#D97706' }}>{stats.pending}</span>
          <span style={{ fontSize: 11, color: '#888' }}>Beklemede</span>
        </div>
      </div>

      {/* Crafting categories */}
      {(Object.keys(grouped) as Array<keyof typeof grouped>).map((category) => {
        const config = CATEGORY_CONFIG[category];
        const items = grouped[category];
        if (items.length === 0) return null;

        return (
          <div key={category}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
              }}
            >
              {config.icon}
              <span style={{ fontSize: 14, fontWeight: 600, color: config.color }}>
                {config.label}
              </span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 8px',
                  borderRadius: 10,
                  background: config.bg,
                  color: config.color,
                }}
              >
                {items.length}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {items.map((suggestion) => {
                const statusConf = STATUS_CONFIG[suggestion.status];
                return (
                  <div
                    key={suggestion.id}
                    style={{
                      background: 'white',
                      border: '1px solid #f0f0f0',
                      borderRadius: 12,
                      borderLeft: `3px solid ${config.color}`,
                      overflow: 'hidden',
                      opacity: suggestion.status !== 'pending' ? 0.7 : 1,
                    }}
                  >
                    <div style={{ padding: '18px 22px' }}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>
                            {suggestion.title}
                          </div>
                          <p
                            style={{
                              fontSize: 13,
                              color: '#555',
                              lineHeight: 1.6,
                              marginTop: 6,
                            }}
                          >
                            {suggestion.description}
                          </p>
                          <div
                            style={{
                              marginTop: 10,
                              padding: '8px 12px',
                              background: '#FAFAFF',
                              border: '1px solid #f0f0f0',
                              borderRadius: 8,
                              fontSize: 12,
                              color: '#666',
                              lineHeight: 1.5,
                            }}
                          >
                            <span style={{ fontWeight: 600, color: '#5E5CE6' }}>Gerekce: </span>
                            {suggestion.rationale}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        {suggestion.status === 'pending' ? (
                          <>
                            {suggestion.category === 'cognitive' ? (
                              <button
                                onClick={() => handleDecision(suggestion.id, 'accepted')}
                                style={{
                                  fontSize: 12,
                                  fontWeight: 600,
                                  color: 'white',
                                  background: config.color,
                                  border: 'none',
                                  borderRadius: 8,
                                  padding: '7px 16px',
                                  cursor: 'pointer',
                                }}
                              >
                                Incele →
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleDecision(suggestion.id, 'accepted')}
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: 'white',
                                    background: '#059669',
                                    border: 'none',
                                    borderRadius: 8,
                                    padding: '7px 16px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Kabul Et
                                </button>
                                <button
                                  onClick={() => handleDecision(suggestion.id, 'rejected')}
                                  style={{
                                    fontSize: 12,
                                    fontWeight: 600,
                                    color: '#DC2626',
                                    background: '#FEE2E2',
                                    border: 'none',
                                    borderRadius: 8,
                                    padding: '7px 16px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  Reddet
                                </button>
                              </>
                            )}
                          </>
                        ) : (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '4px 12px',
                              borderRadius: 20,
                              background: statusConf.bg,
                              color: statusConf.text,
                            }}
                          >
                            {statusConf.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
