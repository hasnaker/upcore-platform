'use client';

import { useState } from 'react';
import type { EmployeeView } from '@/lib/employee-mapper';

interface EmployeeTabsProps {
  employee: EmployeeView;
}

type TabKey = 'genel' | 'tukenmislik' | 'izinler' | 'belgeler' | 'gecmis';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'genel', label: 'Genel Bilgiler' },
  { key: 'tukenmislik', label: 'Tükenmişlik' },
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

/* ─── Tükenmişlik Tab (DERİN) ─── */

function TukenmislikTab({ employee }: { employee: EmployeeView }) {
  // Simulated BAT-12-TR scores (will come from API when connected)
  const bat = { exhaustion: 3.2, mentalDistance: 2.8, cognitive: 2.1, emotional: 2.5, total: 2.65 };
  const jdr = { demands: 78, resources: 56 };
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

  const weeklyTrend = [2.1, 2.3, 2.5, 2.65];

  return (
    <div className="flex flex-col gap-6">
      {/* Overall Score */}
      <div style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0', padding: 24 }}>
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
              <div key={s.label} className="flex items-center gap-3">
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

      {/* JD-R Balance */}
      <div style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0', padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 16 }}>JD-R Dengesi</h3>
        <p style={{ fontSize: 12, color: '#888', marginBottom: 16 }}>Bakker & Demerouti (2007) — İş Talepleri vs Kaynaklar</p>
        <div className="flex flex-col gap-4">
          <div>
            <div className="flex justify-between" style={{ fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: '#555' }}>Talepler (iş yükü, baskı, belirsizlik)</span>
              <span style={{ fontWeight: 600, color: '#DC2626' }}>{jdr.demands}%</span>
            </div>
            <div style={{ height: 10, background: '#f0f0f0', borderRadius: 5 }}>
              <div style={{ width: `${jdr.demands}%`, height: '100%', background: '#DC2626', borderRadius: 5 }} />
            </div>
          </div>
          <div>
            <div className="flex justify-between" style={{ fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: '#555' }}>Kaynaklar (özerklik, destek, gelişim)</span>
              <span style={{ fontWeight: 600, color: '#059669' }}>{jdr.resources}%</span>
            </div>
            <div style={{ height: 10, background: '#f0f0f0', borderRadius: 5 }}>
              <div style={{ width: `${jdr.resources}%`, height: '100%', background: '#059669', borderRadius: 5 }} />
            </div>
          </div>
          <div style={{ background: '#FEF3C7', borderRadius: 8, padding: 12, fontSize: 13, color: '#92400E', marginTop: 4 }}>
            ⚠️ Denge bozuk — talepler kaynakların %{jdr.demands - jdr.resources} üzerinde. Müdahale önerilir.
          </div>
        </div>
      </div>

      {/* 4-Week Trend */}
      <div style={{ background: '#fafafa', borderRadius: 12, border: '1px solid #f0f0f0', padding: 24 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111', marginBottom: 16 }}>4 Haftalık Trend</h3>
        <div className="flex items-end gap-3" style={{ height: 80 }}>
          {weeklyTrend.map((score, i) => {
            const h = (score / 5) * 100;
            const color = score >= 3.02 ? '#DC2626' : score >= 2.59 ? '#D97706' : '#059669';
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <span style={{ fontSize: 11, fontWeight: 600, color: '#111' }}>{score.toFixed(1)}</span>
                <div style={{ width: '100%', maxWidth: 40, height: `${h}%`, background: color, borderRadius: 4, minHeight: 8 }} />
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

function BelgeTab({ employee }: { employee: EmployeeView }) {
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
