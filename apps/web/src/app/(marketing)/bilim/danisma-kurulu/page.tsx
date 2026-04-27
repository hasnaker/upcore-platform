import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BookOpen,
  GraduationCap,
  Mail,
  ScrollText,
  ShieldCheck,
  Users,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Bilim Danışma Kurulu · UpCore',
  description:
    'UpCore Bilim Danışma Kurulu — psikometri, örgütsel davranış, çalışan sağlığı ve KVKK uzmanlarından oluşan bağımsız kurul. UpCap-TR, BAT-12-TR, COPSOQ-III-TR doğrulama süreçlerinin akademik güvencesi.',
};

interface BoardMember {
  name: string;
  title: string;
  affiliation: string;
  expertise: string;
  focus: string;
  orcid?: string;
}

// Kurul şu an kuruluş aşamasında — gerçek üye taahhütleri alındıkça güncellenecek.
// Placeholder değil: pozisyonlar + rol + akademik odak netleştirilmiş.
const BOARD: BoardMember[] = [
  {
    name: 'Prof. Dr. (pozisyon ilan ediliyor)',
    title: 'Psikometri Uzmanı — Kurul Başkanı',
    affiliation: 'Hedef: Koç / Sabancı / Boğaziçi Üniversitesi',
    expertise: 'Ölçek geliştirme, CFA, measurement invariance, Türkçe psikometrik uyarlama',
    focus:
      'UpCap-TR v1.0 CFA + Cronbach α + test-retest güvenilirlik denetimi · peer-review rehberliği',
  },
  {
    name: 'Doç. Dr. (pozisyon ilan ediliyor)',
    title: 'Örgütsel Davranış Uzmanı',
    affiliation: 'İşletme / Psikoloji Fakültesi',
    expertise: 'JD-R modeli, iş bağlılığı, pozitif örgütsel davranış, PsyCap literatürü',
    focus: 'Kurumsal geçerlilik, convergent validity (UWES-9 / BAT-12-TR ile), teorik çerçeve',
  },
  {
    name: 'Dr. (pozisyon ilan ediliyor)',
    title: 'Çalışan Sağlığı & Tükenmişlik Uzmanı',
    affiliation: 'Halk Sağlığı / Klinik Psikoloji',
    expertise: 'BAT-TR, MBI, tükenmişlik tanılaması, iş yerinde ruh sağlığı müdahaleleri',
    focus: 'Risk bandı cutoff doğrulama · klinik-olmayan ölçek sınırları',
  },
  {
    name: 'Av. Dr. (pozisyon ilan ediliyor)',
    title: 'KVKK & Veri Etiği Uzmanı',
    affiliation: 'Hukuk Fakültesi / Bağımsız DPO',
    expertise: 'KVKK Madde 6 açık rıza, Madde 11 hak kullanımı, Madde 22 otomatik karar',
    focus:
      'Pilot çalışma aydınlatma metni, anonim veri toplama protokolü, veri asgariliği denetimi',
  },
  {
    name: 'Dr. (pozisyon ilan ediliyor)',
    title: 'İstatistik & ML Etiği Uzmanı',
    affiliation: 'İstatistik / Veri Bilimi',
    expertise: 'Fairlearn, bias audit, measurement invariance, SHAP',
    focus: 'Cinsiyet / yaş / sektör grupları arası DIF (Differential Item Functioning)',
  },
  {
    name: 'Endüstri temsilcisi',
    title: 'Kurucu — Veto yetkisi yok, paydaş sesi',
    affiliation: 'UpCore / Hasan Aker',
    expertise: 'Ürün entegrasyonu, saha veri toplama koordinasyonu',
    focus: 'Pilot tenant logistiği, zaman çizelgesi, yayın sonrası platform güncellemesi',
  },
];

const PRINCIPLES = [
  {
    icon: ShieldCheck,
    title: 'Bağımsızlık',
    body: 'UpCore kurucusu kurul başkanı olamaz · akademik üyelerin karar oyu çoğunluktadır.',
  },
  {
    icon: BookOpen,
    title: 'Açık bilim (CC-BY 4.0)',
    body: 'Tüm ölçek maddeleri, scoring formülü ve norm tablosu halka açık · replikasyon için veri seti pilot sonrası yayınlanır.',
  },
  {
    icon: Users,
    title: 'Şeffaflık',
    body: 'Her ölçek için validated / provisional bayrağı platformda aktiftir · peer-review öncesi "doğrulandı" iddiası yasaktır.',
  },
  {
    icon: ScrollText,
    title: 'Etik denetim',
    body: 'Pilot çalışma etik kurul onayı ile yürütülür · anonim veri K-anonymity (k≥5) korur.',
  },
];

export default function BilimDanismaKuruluPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-12 px-4 py-16">
      <header className="flex flex-col gap-4">
        <Link href="/bilimsel-temel" className="text-[12px] text-ink-40 hover:underline">
          ← Bilimsel Temel
        </Link>
        <h1 className="flex items-center gap-3 text-3xl font-semibold text-ink">
          <GraduationCap className="h-7 w-7" />
          Bilim Danışma Kurulu
        </h1>
        <p className="max-w-3xl text-base text-ink-60">
          UpCore&apos;un bilim-temelli iddiası, bağımsız akademik denetime dayanır. Bilim Danışma
          Kurulu; UpCap-TR, BAT-12-TR, COPSOQ-III-TR, UWES-9 gibi ölçeklerin Türkiye&apos;de
          doğrulanma süreçlerini izler, peer-review yayın koordinasyonu yapar ve platformun
          &quot;doğrulandı&quot; bayrağını yalnızca kriterler karşılandığında aktive eder.
        </p>
        <p className="max-w-3xl text-sm text-amber-700 dark:text-amber-300">
          Kurul şu an kuruluş aşamasındadır. Pozisyon çağrıları Nisan 2026&apos;da açıldı; üyeler
          taahhüt sırasına göre bu sayfada listelenecek, ORCID ve kurumsal profilleri eklenecektir.
        </p>
      </header>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-ink">Çalışma ilkeleri</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {PRINCIPLES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-line bg-bg p-5">
              <Icon className="h-5 w-5 text-accent" />
              <h3 className="mt-2 text-base font-semibold text-ink">{title}</h3>
              <p className="mt-1 text-[13px] text-ink-60">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-ink">Kurul yapısı (6 üye)</h2>
        <ul className="grid gap-4 md:grid-cols-2">
          {BOARD.map((m) => (
            <li key={m.title} className="rounded-xl border border-line bg-bg p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-ink">{m.name}</h3>
                  <p className="mt-0.5 text-[13px] font-medium text-accent">{m.title}</p>
                  <p className="mt-0.5 text-[12px] text-ink-60">{m.affiliation}</p>
                </div>
                {m.orcid ? (
                  <a
                    href={`https://orcid.org/${m.orcid}`}
                    className="shrink-0 rounded-md border border-line px-2 py-1 text-[10px] font-medium text-ink-60 hover:border-accent"
                    target="_blank"
                    rel="noopener"
                  >
                    ORCID
                  </a>
                ) : null}
              </div>
              <p className="mt-3 text-[12px] text-ink-80">
                <span className="font-medium text-ink">Uzmanlık:</span> {m.expertise}
              </p>
              <p className="mt-1 text-[12px] text-ink-80">
                <span className="font-medium text-ink">Odak:</span> {m.focus}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-accent/30 bg-accent-soft p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-accent">
          <Mail className="h-5 w-5" />
          Kurul üyesi olarak katkı sunmak ister misiniz?
        </h2>
        <p className="mt-2 text-[13px] text-ink-80">
          Akademik kadro (doktora sonrası ve üzeri) psikometri, örgütsel davranış, halk sağlığı,
          hukuk veya veri etiği alanında uzmansanız kurul pozisyonu için ilgileniyoruz. Aşağıdaki
          e-posta üzerinden CV ve ilgilendiğiniz doğrulama çalışması ile iletişime geçebilirsiniz.
        </p>
        <a
          href="mailto:bilim@upcore.io?subject=Bilim%20Danisma%20Kurulu%20basvuru"
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#0A0A0A] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#333]"
        >
          bilim@upcore.io
        </a>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-semibold text-ink">İlgili kaynaklar</h2>
        <ul className="flex flex-col gap-2 text-[13px]">
          <li>
            <Link href="/bilimsel-temel" className="text-accent hover:underline">
              Bilimsel Temel — tüm ölçek referansları ve validasyon durumu
            </Link>
          </li>
          <li>
            <Link href="/bilim/upcap-tr-v1" className="text-accent hover:underline">
              UpCap-TR v1.0 ölçek sayfası — item bank + scoring kodu + norm tablosu
            </Link>
          </li>
          <li>
            <Link href="/kvkk" className="text-accent hover:underline">
              KVKK uyum sayfası — veri sahibinin Madde 11 hakları
            </Link>
          </li>
        </ul>
      </section>
    </div>
  );
}
