'use client';

import { useState } from 'react';

interface Action {
  id: string;
  urgency: 'critical' | 'warning' | 'info';
  type: 'burnout' | 'hiring' | 'leave' | 'development';
  title: string;
  description: string;
  impact: string;
  reasoning: string[];
  date: string;
  status: 'pending' | 'approved' | 'rejected' | 'deferred';
}

const ACTIONS: Action[] = [
  { id: '1', urgency: 'critical', type: 'burnout', title: 'Mehmet Kaya — tükenmişlik riski yükseliyor', description: 'Son 3 haftada BAT-12 skoru %28→%42. JD-R dengesi bozuldu.', impact: 'İstifa olasılığı %67 → %28', reasoning: ['JD-R dengesi bozuk: talep %78, kaynak %56 (Bakker & Demerouti, 2007)', 'Benzer profilde 8 çalışanın 6\'sı istifa etti (kurum içi veri)', 'Müdahale penceresi: turuncu bölgeden çıkış ilk 4 hafta kritik (Schaufeli, 2017)'], date: '2 saat önce', status: 'pending' },
  { id: '2', urgency: 'critical', type: 'burnout', title: 'Ayşe Yılmaz — duygusal tükenmişlik', description: 'Emotional subscale 3.8/5 — kırmızı bölge. Müşteri hizmetleri ekibinde.', impact: 'Performans düşüşü %35 → %15', reasoning: ['BAT-12-TR duygusal bozulma subscale\'i 3.8 — kırmızı bölge', 'Müşteri hizmetleri: yüksek duygusal talep sektörü', 'CBT tabanlı stres yönetimi müdahalesi etkinlik %72 (meta-analiz)'], date: '5 saat önce', status: 'pending' },
  { id: '3', urgency: 'warning', type: 'burnout', title: 'Satış ekibi 3 haftadır kötüleşiyor', description: 'Departman tükenmişlik ortalaması %34. 4 kişi kırmızı bölgede.', impact: 'Departman turnover %18 → %8', reasoning: ['Mann-Kendall trend testi: 3 hafta monotonic artış (p<0.05)', 'Ana etken: iş yükü (8.1/10) + düşük özerklik (4.2/10)', 'Kaynak artırma müdahalesi önerisi: mentoring + esneklik'], date: '1 gün önce', status: 'pending' },
  { id: '4', urgency: 'info', type: 'hiring', title: '2 aday mülakata hazır — %95+ uyum', description: 'Selin Öztürk (Satış, %96) ve Kerem Aslan (Ürün, %95) assessment\'ı tamamladı.', impact: 'Pozisyon doldurma süresi 45 → 30 gün', reasoning: ['JD-R fit analizi: rol talepleri ile aday profili %96 uyum', 'Big Five uygunluk: Extraversion ve Conscientiousness yüksek', 'Erken ayrılma riski: %12 (düşük) — XGBoost modeli'], date: '1 gün önce', status: 'pending' },
  { id: '5', urgency: 'warning', type: 'leave', title: 'Elif Şahin — uzun süreli izin dönüşü', description: '3 haftalık izinden döndü. Re-onboarding ve 1:1 görüşme öneriliyor.', impact: 'Adaptasyon süresi 2 hafta → 1 hafta', reasoning: ['Uzun süreli izin sonrası re-entry şoku riski (Feldman, 1981)', 'Önerilen: ilk hafta hafif iş yükü + günlük check-in', 'Yönetici 1:1\'i adaptasyonu %40 hızlandırıyor (araştırma verisi)'], date: '2 gün önce', status: 'pending' },
];

const HISTORY: { title: string; date: string; decision: string; outcome: string }[] = [
  { title: 'Burak Aydın — koçluk ataması', date: '28 Mart', decision: 'Onaylandı', outcome: 'BAT-12 skoru 3.2 → 2.4 (4 haftada)' },
  { title: 'Mühendislik ekibi — kaynak artırma', date: '21 Mart', decision: 'Onaylandı', outcome: 'JD-R denge endeksi +0.8 iyileşme' },
  { title: 'Fatma Özkan — iç rotasyon', date: '15 Mart', decision: 'Ertelendi', outcome: 'Beklemede — Q2 değerlendirmesi' },
  { title: 'Satış 2 pozisyon — acil işe alım', date: '10 Mart', decision: 'Onaylandı', outcome: '2 pozisyon 18 günde dolduruldu' },
  { title: 'Ali Demir — performans koçluğu', date: '5 Mart', decision: 'Reddedildi', outcome: 'Çalışan kendi çözüm buldu' },
];

const URGENCY = { critical: { bg: '#FEE2E2', text: '#DC2626', label: 'Acil', stripe: '#DC2626' }, warning: { bg: '#FEF3C7', text: '#D97706', label: 'Uyarı', stripe: '#D97706' }, info: { bg: '#EEF0FD', text: '#5E5CE6', label: 'Bilgi', stripe: '#5E5CE6' } };
const TYPE_LABELS: Record<string, string> = { burnout: 'Tükenmişlik', hiring: 'İşe Alım', leave: 'İzin', development: 'Gelişim' };
const DECISION_COLORS: Record<string, { bg: string; text: string }> = { 'Onaylandı': { bg: '#D1FAE5', text: '#059669' }, 'Reddedildi': { bg: '#FEE2E2', text: '#DC2626' }, 'Ertelendi': { bg: '#FEF3C7', text: '#D97706' } };

export default function AksiyonlarPage() {
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [actions, setActions] = useState(ACTIONS);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const filtered = filter === 'all' ? actions.filter(a => a.status === 'pending') : actions.filter(a => a.status === 'pending' && a.type === filter);

  const handleDecision = (id: string, decision: 'approved' | 'rejected' | 'deferred') => {
    setActions(prev => prev.map(a => a.id === id ? { ...a, status: decision } : a));
    setExpanded(null);
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#111' }}>Aksiyon Merkezi</h1>
        <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>Tüm aksiyonları yönetin. Onaylayın, reddedin, takip edin.</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #f0f0f0' }}>
        {[{ key: 'active' as const, label: 'Aktif', count: actions.filter(a => a.status === 'pending').length }, { key: 'history' as const, label: 'Geçmiş', count: HISTORY.length }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '10px 20px', fontSize: 14, fontWeight: tab === t.key ? 600 : 400, color: tab === t.key ? '#5E5CE6' : '#888', borderBottom: tab === t.key ? '2px solid #5E5CE6' : '2px solid transparent', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            {t.label}
            <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: tab === t.key ? '#EEF0FD' : '#f5f5f5', color: tab === t.key ? '#5E5CE6' : '#aaa' }}>{t.count}</span>
          </button>
        ))}
      </div>

      {tab === 'active' && (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ key: 'all', label: 'Tümü' }, { key: 'burnout', label: 'Tükenmişlik' }, { key: 'hiring', label: 'İşe Alım' }, { key: 'leave', label: 'İzin' }, { key: 'development', label: 'Gelişim' }].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} style={{ padding: '5px 12px', fontSize: 12, fontWeight: 600, borderRadius: 20, border: '1px solid', borderColor: filter === f.key ? '#5E5CE6' : '#e5e5e5', background: filter === f.key ? '#EEF0FD' : 'white', color: filter === f.key ? '#5E5CE6' : '#888', cursor: 'pointer' }}>{f.label}</button>
            ))}
          </div>

          {/* Action Cards */}
          <div className="flex flex-col gap-3">
            {filtered.map(a => {
              const u = URGENCY[a.urgency];
              const isExpanded = expanded === a.id;
              return (
                <div key={a.id} style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 12, borderLeft: `3px solid ${u.stripe}`, overflow: 'hidden' }}>
                  <div style={{ padding: '20px 24px' }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: u.bg, color: u.text }}>{u.label}</span>
                          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: '#f5f5f5', color: '#888' }}>{TYPE_LABELS[a.type]}</span>
                          <span style={{ fontSize: 11, color: '#aaa' }}>· {a.date}</span>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{a.title}</div>
                        <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>{a.description}</div>
                        <div style={{ fontSize: 12, color: '#5E5CE6', fontWeight: 600, marginTop: 6 }}>📊 Tahmini Etki: {a.impact}</div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button onClick={() => setExpanded(isExpanded ? null : a.id)} style={{ fontSize: 12, color: '#888', background: 'none', border: '1px solid #e5e5e5', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>{isExpanded ? 'Kapat' : 'Detay'}</button>
                        <button onClick={() => handleDecision(a.id, 'approved')} style={{ fontSize: 12, fontWeight: 600, color: 'white', background: '#111', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}>Onayla ✓</button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Neden Öneriyoruz</div>
                        {a.reasoning.map((r, i) => (
                          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                            <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#EEF0FD', color: '#5E5CE6', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                            <span style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>{r}</span>
                          </div>
                        ))}
                        <div className="flex gap-2" style={{ marginTop: 12 }}>
                          <button onClick={() => handleDecision(a.id, 'approved')} style={{ fontSize: 12, fontWeight: 600, color: 'white', background: '#059669', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}>✓ Onayla</button>
                          <button onClick={() => handleDecision(a.id, 'rejected')} style={{ fontSize: 12, fontWeight: 600, color: '#DC2626', background: '#FEE2E2', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}>✗ Reddet</button>
                          <button onClick={() => handleDecision(a.id, 'deferred')} style={{ fontSize: 12, fontWeight: 600, color: '#D97706', background: '#FEF3C7', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}>◷ Ertele</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: 48, color: '#aaa', fontSize: 14 }}>Bu kategoride bekleyen aksiyon yok.</div>
            )}
          </div>
        </>
      )}

      {tab === 'history' && (
        <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 12, overflow: 'hidden' }}>
          {HISTORY.map((h, i) => {
            const dc = DECISION_COLORS[h.decision] ?? { bg: '#f5f5f5', text: '#888' };
            return (
              <div key={i} style={{ padding: '16px 24px', borderBottom: i < HISTORY.length - 1 ? '1px solid #f0f0f0' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{h.title}</div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{h.date} · {h.outcome}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: dc.bg, color: dc.text }}>{h.decision}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
