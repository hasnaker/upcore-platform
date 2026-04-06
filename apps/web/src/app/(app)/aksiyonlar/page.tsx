'use client';

import { useState } from 'react';

interface ActionEmployeeProfile {
  name: string;
  department: string;
  batScore: number;
  batLevel: 'green' | 'amber' | 'red';
  tenure: string;
}

interface ActionRiskTimeline {
  label: string;
  date: string;
}

interface ActionCostAnalysis {
  resignationCost: string;
  interventionName: string;
  interventionDuration: string;
  interventionCost: string;
  estimatedSavings: string;
  roi: string;
}

interface ActionSimilarCase {
  profile: string;
  outcome: string;
  outcomeType: 'positive' | 'negative';
}

interface ActionDetail {
  employee: ActionEmployeeProfile;
  riskTimeline: ActionRiskTimeline[];
  costAnalysis: ActionCostAnalysis;
  similarCases: ActionSimilarCase[];
}

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

/* ─── Enhanced Action Details ─── */
const ACTION_DETAILS: Record<string, ActionDetail> = {
  '1': {
    employee: { name: 'Mehmet Kaya', department: 'Kurumsal Satis', batScore: 3.42, batLevel: 'red', tenure: '3.5 yil' },
    riskTimeline: [
      { label: 'Ilk tespit', date: '15 Mart' },
      { label: 'Uyari', date: '22 Mart' },
      { label: 'Kritik', date: '29 Mart' },
      { label: 'Bugun', date: '4 Nisan' },
    ],
    costAnalysis: { resignationCost: '₺168K', interventionName: 'Haftalik 1:1 Kocluk', interventionDuration: '4 hafta', interventionCost: '₺2.400', estimatedSavings: '₺168K', roi: '70x' },
    similarCases: [
      { profile: 'Satis, 3+ yil kidem, BAT > 3.0', outcome: 'Istifa (2 ay icinde)', outcomeType: 'negative' },
      { profile: 'Satis, 4 yil kidem, BAT 3.1', outcome: 'Istifa (6 hafta icinde)', outcomeType: 'negative' },
      { profile: 'Satis, 3 yil kidem, BAT 3.3', outcome: 'Mudahale basarili — BAT 2.1\'e dustu', outcomeType: 'positive' },
    ],
  },
  '2': {
    employee: { name: 'Ayse Yilmaz', department: 'Musteri Hizmetleri', batScore: 3.80, batLevel: 'red', tenure: '2.1 yil' },
    riskTimeline: [
      { label: 'Ilk tespit', date: '18 Mart' },
      { label: 'Uyari', date: '25 Mart' },
      { label: 'Kritik', date: '1 Nisan' },
      { label: 'Bugun', date: '4 Nisan' },
    ],
    costAnalysis: { resignationCost: '₺96K', interventionName: 'CBT Tabanli Stres Yonetimi', interventionDuration: '6 hafta', interventionCost: '₺4.800', estimatedSavings: '₺96K', roi: '20x' },
    similarCases: [
      { profile: 'MH, 2 yil kidem, duygusal 3.5+', outcome: 'Istifa (1 ay icinde)', outcomeType: 'negative' },
      { profile: 'MH, 2.5 yil kidem, duygusal 3.8', outcome: 'CBT mudahalesi basarili', outcomeType: 'positive' },
    ],
  },
  '3': {
    employee: { name: 'Satis Ekibi (toplu)', department: 'Satis', batScore: 2.89, batLevel: 'amber', tenure: 'Ort. 3.2 yil' },
    riskTimeline: [
      { label: 'Trend baslangici', date: '11 Mart' },
      { label: 'Devam', date: '18 Mart' },
      { label: 'Kotu lesme', date: '25 Mart' },
      { label: 'Bugun', date: '4 Nisan' },
    ],
    costAnalysis: { resignationCost: '₺672K', interventionName: 'Departman Kaynak Artirma Programi', interventionDuration: '8 hafta', interventionCost: '₺12.000', estimatedSavings: '₺672K', roi: '56x' },
    similarCases: [
      { profile: 'Departman bazli bozulma, 3+ hafta', outcome: '%40 turnover (6 ay icinde)', outcomeType: 'negative' },
      { profile: 'Benzer departman, kaynak artirma', outcome: 'JD-R dengesi duzeltildi', outcomeType: 'positive' },
    ],
  },
};

/* ─── Action Metrics ─── */
const ACTION_METRICS = {
  generated: 15,
  approved: 10,
  rejected: 3,
  deferred: 2,
  approvalRate: 67,
  avgDecisionTime: '4.2 saat',
  mostCommonType: 'Burnout koclugu (%45)',
  successRate: 72,
};

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
          {/* ── Action Metrics Dashboard ── */}
          <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>Bu Ayin Aksiyon Metrikleri</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#111' }}>{ACTION_METRICS.generated}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Uretilen</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#059669' }}>{ACTION_METRICS.approved}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Onaylanan</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#DC2626' }}>{ACTION_METRICS.rejected}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Reddedilen</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#D97706' }}>{ACTION_METRICS.deferred}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Ertelenen</div>
              </div>
            </div>

            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#FAFAFF', borderRadius: 8, border: '1px solid #E0E0FF' }}>
                <div style={{ fontSize: 11, color: '#888' }}>Onay orani</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#5E5CE6', marginLeft: 'auto' }}>%{ACTION_METRICS.approvalRate}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#FAFAFF', borderRadius: 8, border: '1px solid #E0E0FF' }}>
                <div style={{ fontSize: 11, color: '#888' }}>Ort. karar suresi</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#5E5CE6', marginLeft: 'auto' }}>{ACTION_METRICS.avgDecisionTime}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#F0FDF4', borderRadius: 8, border: '1px solid #BBF7D0' }}>
                <div style={{ fontSize: 11, color: '#888' }}>En sik aksiyon</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#059669', marginLeft: 'auto' }}>{ACTION_METRICS.mostCommonType}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#F0FDF4', borderRadius: 8, border: '1px solid #BBF7D0' }}>
                <div style={{ fontSize: 11, color: '#888' }}>Basari orani</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#059669', marginLeft: 'auto' }}>%{ACTION_METRICS.successRate}</div>
              </div>
            </div>
          </div>

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

                        {/* ── Enhanced Detail Panel ── */}
                        {(() => {
                          const detail = ACTION_DETAILS[a.id];
                          if (!detail) return null;
                          const LEVEL_COLORS: Record<string, { bg: string; text: string }> = {
                            green: { bg: '#D1FAE5', text: '#059669' },
                            amber: { bg: '#FEF3C7', text: '#D97706' },
                            red: { bg: '#FEE2E2', text: '#DC2626' },
                          };
                          const levelStyle = LEVEL_COLORS[detail.employee.batLevel] ?? { bg: '#F5F5F5', text: '#888' };
                          return (
                            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

                              {/* Employee Profile Mini Card */}
                              <div style={{ background: '#FAFAFF', border: '1px solid #E0E0FF', borderRadius: 10, padding: 14 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Etkilenen Çalışan Profili</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#5E5CE6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>
                                    {detail.employee.name.split(' ').map(n => n[0]).join('')}
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{detail.employee.name}</div>
                                    <div style={{ fontSize: 12, color: '#888' }}>{detail.employee.department} · {detail.employee.tenure}</div>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                    <span style={{ fontSize: 18, fontWeight: 700, color: levelStyle.text }}>{detail.employee.batScore.toFixed(2)}</span>
                                    <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 8px', borderRadius: 10, background: levelStyle.bg, color: levelStyle.text }}>BAT-12</span>
                                  </div>
                                </div>
                              </div>

                              {/* Risk Timeline */}
                              <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 10, padding: 14 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Risk Zaman Çizelgesi</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                                  {detail.riskTimeline.map((step, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                        <div style={{
                                          width: 12, height: 12, borderRadius: '50%',
                                          background: idx === detail.riskTimeline.length - 1 ? '#DC2626' : idx >= detail.riskTimeline.length - 2 ? '#D97706' : '#5E5CE6',
                                        }} />
                                        <span style={{ fontSize: 10, fontWeight: 600, color: '#111' }}>{step.label}</span>
                                        <span style={{ fontSize: 10, color: '#aaa' }}>{step.date}</span>
                                      </div>
                                      {idx < detail.riskTimeline.length - 1 && (
                                        <div style={{ flex: 1, height: 2, background: '#EDEDED', margin: '0 4px', marginBottom: 28 }} />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Cost Analysis + ROI */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: 14 }}>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>İstifa Maliyeti</div>
                                  <div style={{ fontSize: 22, fontWeight: 700, color: '#DC2626' }}>{detail.costAnalysis.resignationCost}</div>
                                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Yıllık maaş × 1.5</div>
                                </div>
                                <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: 14 }}>
                                  <div style={{ fontSize: 10, fontWeight: 700, color: '#059669', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Önerilen Müdahale</div>
                                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{detail.costAnalysis.interventionName}</div>
                                  <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                                    Süre: {detail.costAnalysis.interventionDuration} · Maliyet: {detail.costAnalysis.interventionCost}
                                  </div>
                                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                                    Tahmini tasarruf: {detail.costAnalysis.estimatedSavings} · <span style={{ fontWeight: 700, color: '#059669' }}>ROI: {detail.costAnalysis.roi}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Similar Cases */}
                              <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 10, padding: 14 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                                  Benzer Vakalar (Son 12 Ay)
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {detail.similarCases.map((sc, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: sc.outcomeType === 'positive' ? '#F0FDF4' : '#FEF2F2' }}>
                                      <span style={{ fontSize: 14 }}>{sc.outcomeType === 'positive' ? '✓' : '✗'}</span>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 12, color: '#525252' }}>{sc.profile}</div>
                                        <div style={{ fontSize: 11, fontWeight: 600, color: sc.outcomeType === 'positive' ? '#059669' : '#DC2626' }}>{sc.outcome}</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                            </div>
                          );
                        })()}

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
