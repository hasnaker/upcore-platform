import { PlayCircle } from 'lucide-react';

export const metadata = { title: 'Onboarding Videoları · UpCore' };

const CATEGORIES = [
  {
    title: 'Başlangıç (15 dakika)',
    videos: [
      { id: 'g1', title: 'UpCore\'a Hoşgeldiniz — Ürün turu', duration: '3:20' },
      { id: 'g2', title: 'İlk 30 gün: Kurulum checklist', duration: '4:15' },
      { id: 'g3', title: 'Kullanıcı davet + rol yönetimi', duration: '2:45' },
    ],
  },
  {
    title: 'İK Müdürü için',
    videos: [
      { id: 'hr1', title: 'CSV import — 500 personeli 5 dakikada', duration: '4:12' },
      { id: 'hr2', title: 'Organizasyon şeması drag-drop', duration: '3:50' },
      { id: 'hr3', title: 'İzin onay akışı', duration: '3:05' },
      { id: 'hr4', title: 'Çalışan çıkış süreci + saga', duration: '5:10' },
    ],
  },
  {
    title: 'Bordro Uzmanı için',
    videos: [
      { id: 'p1', title: 'İlk bordronuzu hesaplayın', duration: '6:08' },
      { id: 'p2', title: '657 kamu maaş hesabı', duration: '7:30' },
      { id: 'p3', title: 'SGK APB XML tek tıkla', duration: '2:50' },
      { id: 'p4', title: 'Banka transfer dosyası', duration: '3:15' },
      { id: 'p5', title: 'Avans/İcra/Nafaka kesintileri', duration: '4:45' },
      { id: 'p6', title: 'Muhtasar beyanname', duration: '3:20' },
    ],
  },
  {
    title: 'Performans & Eğitim',
    videos: [
      { id: 'pf1', title: 'Performans cycle başlatmak', duration: '5:30' },
      { id: 'pf2', title: 'OKR + 9-box kalibrasyon', duration: '6:15' },
      { id: 'pf3', title: '360 peer nomination', duration: '4:20' },
    ],
  },
  {
    title: 'İşe Alım (ATS)',
    videos: [
      { id: 'a1', title: 'Pozisyon açma → teklif', duration: '7:22' },
      { id: 'a2', title: 'Kariyer.net entegrasyonu', duration: '3:45' },
      { id: 'a3', title: 'Aday portalı + mülakat', duration: '5:00' },
    ],
  },
  {
    title: 'Bilim-temelli modüller',
    videos: [
      { id: 'ml1', title: 'BAT-TR tükenmişlik ölçümü', duration: '3:45' },
      { id: 'ml2', title: 'COPSOQ iş stresi anketi', duration: '4:10' },
      { id: 'ml3', title: 'Aksiyon merkezi + müdahale', duration: '5:25' },
    ],
  },
  {
    title: 'Yönetici & Enterprise',
    videos: [
      { id: 'e1', title: 'SAML SSO kurulumu', duration: '8:15' },
      { id: 'e2', title: 'White-label + özel domain', duration: '4:30' },
      { id: 'e3', title: 'Webhook & API key', duration: '6:40' },
      { id: 'e4', title: 'DR + yedekleme', duration: '5:05' },
    ],
  },
];

export default function OnboardingVideosPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Eğitim Videoları</h1>
        <p className="mt-1 text-sm text-ink-60">
          UpCore\'u en iyi şekilde kullanmak için kısa video rehberler. Her video 3-8 dakika.
        </p>
      </div>

      {CATEGORIES.map((cat) => (
        <section key={cat.title} className="rounded-xl border border-line bg-bg p-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-40">
            {cat.title}
          </h2>
          <div className="mt-3 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {cat.videos.map((v) => (
              <a
                key={v.id}
                href={`https://docs.upcore.app/videos/${v.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 rounded-xl border border-line bg-bg p-4 hover:border-accent/50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <PlayCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[13px] font-medium text-ink">{v.title}</p>
                  <p className="mt-0.5 text-[11px] text-ink-40">{v.duration}</p>
                </div>
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
