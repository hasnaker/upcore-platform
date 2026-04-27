'use client';

import { useState } from 'react';
import { Briefcase, Coins, UsersRound, User, CheckCircle2 } from 'lucide-react';

const ROLES = [
  {
    key: 'chro',
    label: 'CHRO / İK Direktörü',
    icon: Briefcase,
    tagline: 'Stratejik İK kararlarını veriyle savun',
    metrics: [
      { value: '%22', label: 'turnover azaltma' },
      { value: '%89', label: 'ML tahmin doğruluğu' },
      { value: '15 saat', label: 'haftalık raporlama tasarrufu' },
    ],
    bullets: [
      'Executive dashboard — CEO\'ya sunum yerine canlı link paylaşın',
      'Departman risk heatmap + 6 aylık turnover forecast',
      'OKR + performans kalibrasyonu · nine-box otomasyonu',
      'Bütçe planlaması · headcount vs. üretkenlik senaryoları',
      'KVKK + ISO 27001 uyum durumu tek ekranda',
    ],
  },
  {
    key: 'cfo',
    label: 'CFO / Finans',
    icon: Coins,
    tagline: 'İş gücü maliyetini gerçek zamanlı izleyin',
    metrics: [
      { value: '%8', label: 'toplam işgücü maliyeti azalma' },
      { value: '<48 saat', label: 'bordro kapatma süresi' },
      { value: '4 saat', label: 'aylık finansal mutabakat (100K\'dan)' },
    ],
    bullets: [
      'Maliyet merkezi bazlı bordro raporu · departman bütçe consumption',
      'Muhtasar + SGK + banka transfer tek click',
      'Sözleşme bazlı vergilendirme (657/4857/4B)',
      'Multi-entity konsolide P&L · şirketler arası transfer',
      'Finansal audit hazırlık · 7 yıl immutable kayıt',
    ],
  },
  {
    key: 'manager',
    label: 'Yönetici / Takım Lideri',
    icon: UsersRound,
    tagline: 'Ekibinizin dinamiklerini ölçün, sahiplenerek büyütün',
    metrics: [
      { value: '1 saat', label: 'haftalık idari iş' },
      { value: '%34', label: 'çalışan bağlılık artışı' },
      { value: '3 dk', label: 'izin onayı' },
    ],
    bullets: [
      'Ekip bağlılık skoru · anonim BAT-TR pulse (min 5 kişi)',
      'Güçlü yönler (VIA) + kariyer hedefleri — 1:1 görüşme şablonu',
      'İzin + mesai + performans — hepsi telefondan',
      'Koruma müdahale katalogu · ML önerisine göre eylem planı',
      'Succession planning · kritik roller kim kazanımda?',
    ],
  },
  {
    key: 'employee',
    label: 'Çalışan',
    icon: User,
    tagline: 'Kariyeriniz üzerinde söz sahibi olun',
    metrics: [
      { value: '30 sn', label: 'izin talebi' },
      { value: '100%', label: 'bordro şeffaflık' },
      { value: 'Anonim', label: 'BAT-TR pulse' },
    ],
    bullets: [
      'İzin bakiyesi + mesai + bordro · cebinizden görün',
      'Kariyer yolu haritası · iç ilanlar · rotation başvurusu',
      'Güçlü yönler raporunuz (VIA) + gelişim kaynakları',
      'Haftalık pulse · kendinizi bilimsel olarak tanıyın',
      'Eğitim kataloğu · sertifikalar · LinkedIn senkronizasyon',
      'Veri sahibi portalı · kendi verilerinizi istediğiniz an görün',
    ],
  },
];

export function UseCaseTabs() {
  const [active, setActive] = useState<string>(ROLES[0]!.key);
  const role = ROLES.find((r) => r.key === active) ?? ROLES[0]!;

  return (
    <div className="overflow-hidden rounded-[24px] border border-[#EBEBEB] bg-white">
      <div className="flex flex-wrap gap-1 border-b border-[#F0F0F0] bg-[#FAFAFA] p-2">
        {ROLES.map((r) => (
          <button
            key={r.key}
            onClick={() => setActive(r.key)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-[13px] font-semibold transition-all ${
              active === r.key
                ? 'bg-[#0F1419] text-white shadow-sm'
                : 'text-[#525252] hover:bg-white hover:text-[#0F1419]'
            }`}
          >
            <r.icon className="h-4 w-4" />
            {r.label}
          </button>
        ))}
      </div>
      <div className="grid gap-10 p-8 md:p-12 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FF5400]">
            {role.label}
          </p>
          <h3 className="mt-3 font-display text-[32px] font-semibold leading-[1.1] tracking-tight text-[#0F1419]">
            {role.tagline}
          </h3>
          <div className="mt-8 grid grid-cols-3 gap-4">
            {role.metrics.map((m) => (
              <div key={m.label} className="rounded-xl border border-[#F0F0F0] bg-[#FAFAFA] p-4">
                <div className="font-display text-[24px] font-semibold leading-none tracking-tight text-[#0F1419]">
                  {m.value}
                </div>
                <div className="mt-2 text-[10px] leading-tight text-[#8A8A8A]">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">
            Bu rol için ne sunar
          </p>
          <ul className="mt-4 space-y-3">
            {role.bullets.map((b) => (
              <li key={b} className="flex items-start gap-3 text-[14px] leading-relaxed text-[#333]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#FF5400]" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
