import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  ArrowUpRight,
  Flag,
  Target,
  Microscope,
  LineChart,
  Users,
  Award,
  Heart,
  Globe2,
  Building2,
  Calendar,
  Briefcase,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Hakkımızda · UpCore',
  description:
    "UpCore — Türkiye'nin ilk bilim-temelli İK SaaS platformu. Kuruluş hikâyesi, kurucu ekip, değerler, milestone\'lar, iş fırsatları.",
};

const TIMELINE = [
  { date: '2025 Q2', title: 'Kuruluş', desc: 'UpCore Teknoloji A.Ş. İstanbul merkezli kuruldu. Kurucu ekip: iş psikolojisi doktorası + 10 yıl SaaS ürün deneyimi.' },
  { date: '2025 Q3', title: 'BAT-TR lisans + ilk pilot', desc: 'Schaufeli grubundan BAT ölçek kullanım lisansı alındı. İlk pilot kurum (Anadolu Grup sigortacılık kolu) onboard edildi.' },
  { date: '2025 Q4', title: 'Azure North Europe canlı', desc: 'Altyapı: multi-tenant RLS + AES-256 + event-driven mimari. İlk 3 modül (Kazanım, Sürdürme, Bordro) üretime alındı.' },
  { date: '2026 Q1', title: 'Seed turu', desc: '₺18M seed turu kapatıldı. Güçlü iş psikologisi akademisyenleri advisory board\'a katıldı.' },
  { date: '2026 Q2', title: 'KVKK uyum + Samsun pilot', desc: 'KVKK uyum programı 100% tamamlandı. Samsun Büyükşehir Belediyesi (12.000 çalışan) pilota başladı.' },
  { date: '2026 Q3', title: 'Public launch · 17 modül', desc: 'Tam platform üretime alındı: 17 entegre modül · 40+ entegrasyon · ISO 27001 süreç başlangıcı.' },
  { date: '2026 Q4', title: 'Hedefler', desc: '50.000 takip edilen çalışan · 3 belediye + 2 holding anchor müşteri · UpCap-TR validasyonu yayını.' },
];

const VALUES = [
  { icon: Microscope, title: 'Bilim önce', desc: 'Pazarlama kararı bilimi değiştirmez. Her metriğin peer-reviewed kaynağı olmak zorunda; aksi halde platformda yer bulamaz.' },
  { icon: Heart, title: 'Çalışan tarafında', desc: 'Kuruluş sözleşmemiz: psikometrik veriyi asla performans kararında kullanma. İK yazılımı İK için; çalışana karşı değil, çalışanla birlikte.' },
  { icon: LineChart, title: 'Ölçülmeyen yönetilemez', desc: 'Duygusal karar yerine veriyle yönetim. Ama veri tek başına yeterli değil — yorumlayacak bilimsel çerçeve olmadan veri de yanıltır.' },
  { icon: Flag, title: 'Türkiye odaklı', desc: '657, 4857, 4B, SGK, KVKK — global yazılımlara sonradan &quot;patch&quot; değil, ilk günden tasarım. Türk iş hukuku birinci sınıf vatandaş.' },
  { icon: Globe2, title: 'Şeffaflık', desc: 'Kaynak gizlememek + limitasyon saklamamak + yıllık transparency raporu. &quot;Bilmiyoruz&quot; demek cesarettir.' },
  { icon: Users, title: 'Azınlık partnerliği', desc: 'Büyük müşteri değil, doğru müşteri. Kimseye yarım söz verip sonra şirketi batırmak yerine, beraber bilimsel olarak doğru olanı inşa ediyoruz.' },
];

const LEADERSHIP = [
  {
    name: 'Hasan Aker',
    role: 'Kurucu & CEO',
    bio: 'MSc Yazılım Mühendisliği · 10+ yıl SaaS ürün geliştirme. Clinisyn Health (sağlık SaaS) kurucu ortağı. İş psikolojisi ve ölçümleme konusunda 3 yıllık derinleşme.',
    focus: 'Ürün · Teknoloji · Müşteri başarısı',
  },
  {
    name: 'Advisory Board',
    role: 'Akademik danışmanlar',
    bio: 'İş psikolojisi ve psikometri alanında 3 profesör (Boğaziçi + ODTÜ + İstanbul Üniversitesi). Ölçek seçimi, validasyon protokolü ve etik denetim için aylık görüşme.',
    focus: 'Bilimsel denetim · Validasyon · Etik',
  },
  {
    name: 'Müşteri Advisory',
    role: 'Ürün rehberliği',
    bio: '5 pilot müşteriden CHRO seviyesi temsilci. Çeyreklik roadmap inceleme, feature prioritization ve gerçek kullanım geri bildirimi.',
    focus: 'Roadmap · Kullanıcı ihtiyacı · Pazar fit',
  },
];

const OPEN_ROLES = [
  { title: 'Senior Full-stack Engineer', team: 'Mühendislik', location: 'İstanbul · Remote', type: 'Full-time' },
  { title: 'Senior Go Backend Engineer', team: 'Platform', location: 'İstanbul · Remote', type: 'Full-time' },
  { title: 'İş Psikolojisi Araştırmacı', team: 'Bilim', location: 'İstanbul · Hibrit', type: 'Full-time / Part-time' },
  { title: 'Customer Success Manager', team: 'Müşteri başarısı', location: 'İstanbul', type: 'Full-time' },
  { title: 'Enterprise Satış (CHRO seviyesi)', team: 'GTM', location: 'İstanbul / Ankara', type: 'Full-time' },
];

const PRESS = [
  { source: 'Webrazzi', title: '"Türkiye\'nin ilk bilim-temelli İK SaaS\'ı UpCore ₺18M seed aldı"', date: '2026-03' },
  { source: 'HR Dergi', title: '"BAT-TR ile tükenmişlik: UpCore\'un yaklaşımı"', date: '2026-02' },
  { source: 'Kariyer.net Blog', title: '"Türkiye\'de İK teknolojisinin geleceği — Aker röportajı"', date: '2026-01' },
];

export default function HakkimizdaPage() {
  return (
    <div className="bg-white text-[#0F1419]">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[#F0F0F0]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,84,0,0.06),transparent_60%)]" />
        </div>
        <div className="relative mx-auto max-w-[1100px] px-6 pt-24 pb-20 md:pt-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E8E8E8] bg-white px-3 py-1 text-[11px] font-medium text-[#525252]">
              <Flag className="h-3 w-3 text-[#FF5400]" /> Türkiye odaklı · bilim-temelli · 2025&apos;te kuruldu
            </div>
            <h1 className="mt-6 font-display text-[48px] font-semibold leading-[1.05] tracking-[-0.03em] md:text-[72px]">
              İK kararları neden hâlâ<br />
              <span className="bg-gradient-to-r from-[#0F1419] via-[#FF5400] to-[#0F1419] bg-clip-text text-transparent">
                hislerle veriliyor?
              </span>
            </h1>
            <p className="mt-7 text-[18px] leading-[1.65] text-[#525252]">
              UpCore, bu soruya bilimsel bir yanıt vermek için 2025&apos;te kuruldu. Türkiye&apos;de 2 milyondan fazla çalışanın hizmet verdiği KOBİ&apos;ler ve kurumsal şirketler, global standartlardaki psikometrik araçlara erişemiyordu. Biz bu boşluğu kapatıyoruz — peer-reviewed bilimi modern bir SaaS deneyimiyle buluşturarak.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/bilimsel-temel"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[#0F1419] px-7 text-[14px] font-semibold text-white transition-colors hover:bg-[#FF5400]"
              >
                Bilimsel Temel <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/iletisim"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-[#E8E8E8] bg-white px-7 text-[14px] font-semibold text-[#0F1419] transition-colors hover:border-[#FF5400] hover:text-[#FF5400]"
              >
                İletişim <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mt-16 grid gap-4 md:grid-cols-4">
            <StatTile icon={Users} value="50.000+" label="Takip edilen çalışan (2026 hedef)" />
            <StatTile icon={Building2} value="12" label="Aktif müşteri tenant" />
            <StatTile icon={Award} value="%100" label="KVKK uyum + ISO 27001 hazırlık" />
            <StatTile icon={Briefcase} value="17" label="Entegre modül · Tek platform" />
          </div>
        </div>
      </section>

      {/* Mission + Vision */}
      <section className="border-b border-[#F0F0F0] bg-[#FAFAFA]">
        <div className="mx-auto max-w-[1100px] px-6 py-20 md:py-28">
          <div className="grid gap-10 lg:grid-cols-2">
            <div className="rounded-[24px] border border-[#EBEBEB] bg-white p-10">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFF8F2]">
                <Target className="h-6 w-6 text-[#FF5400]" />
              </div>
              <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#FF5400]">Misyon</p>
              <h2 className="mt-2 font-display text-[30px] font-semibold leading-tight tracking-tight">
                Türkiye&apos;deki her İK profesyoneline, kurumsal şirketlerin kullandığı bilimsel ölçüm kalitesini ulaşılabilir kılmak.
              </h2>
              <p className="mt-5 text-[14.5px] leading-[1.65] text-[#525252]">
                Başlangıç fiyatı ₺1.900/yıl (1-10 çalışan KOBİ paketi) — bilimsel İK sadece Fortune 500&apos;ün değil, 10 kişilik kafenin de hakkı.
              </p>
            </div>

            <div className="rounded-[24px] border border-[#EBEBEB] bg-white p-10">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#FFF8F2]">
                <Microscope className="h-6 w-6 text-[#FF5400]" />
              </div>
              <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#FF5400]">Vizyon</p>
              <h2 className="mt-2 font-display text-[30px] font-semibold leading-tight tracking-tight">
                2030&apos;da Türkiye&apos;de çalışan bağlılığı, KOBİ&apos;den holding&apos;e şirketlerin %60&apos;ında ölçülüyor olacak — ve bu ölçümlerin arkasında peer-reviewed bilim olacak.
              </h2>
              <p className="mt-5 text-[14.5px] leading-[1.65] text-[#525252]">
                &quot;Çalışan deneyimi&quot; moda terim olmaktan çıkıp; finansal performans kadar takip edilen bir liderlik göstergesi haline gelecek. UpCore bu değişimin altyapısı.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="border-b border-[#F0F0F0]">
        <div className="mx-auto max-w-[1100px] px-6 py-20 md:py-28">
          <div className="mb-14 max-w-3xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-[#FF5400]">Değerler</p>
            <h2 className="mt-3 font-display text-[36px] font-semibold leading-[1.1] tracking-[-0.025em] md:text-[48px]">
              Bize rehberlik eden 6 ilke
            </h2>
            <p className="mt-5 text-[16px] leading-[1.65] text-[#525252]">
              Poster için değil, karar vermek için. Her roadmap kararı, her müşteri sözleşmesi, her işe alım — bu ilkelerden geçer.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {VALUES.map((v) => (
              <div
                key={v.title}
                className="rounded-2xl border border-[#EBEBEB] bg-white p-7 transition-colors hover:border-[#FF5400]/30"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#FFF8F2]">
                  <v.icon className="h-5 w-5 text-[#FF5400]" />
                </div>
                <h3 className="mt-5 font-display text-[19px] font-semibold tracking-tight">{v.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-[#525252]">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="border-b border-[#F0F0F0] bg-[#FAFAFA]">
        <div className="mx-auto max-w-[1100px] px-6 py-20 md:py-28">
          <div className="mb-14 max-w-3xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-[#FF5400]">Zaman çizelgesi</p>
            <h2 className="mt-3 font-display text-[36px] font-semibold leading-[1.1] tracking-[-0.025em] md:text-[48px]">
              12 ayda 0&apos;dan üretime
            </h2>
            <p className="mt-5 text-[16px] leading-[1.65] text-[#525252]">
              Her çeyreğin somut çıktısı + gelecek kuartalın açık hedefleri. Over-promise yok, ship-first kültürü.
            </p>
          </div>

          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-[#E8E8E8] md:left-1/2" />
            <div className="space-y-8">
              {TIMELINE.map((t, i) => (
                <div
                  key={t.date}
                  className={`relative flex flex-col gap-4 md:flex-row ${
                    i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                  }`}
                >
                  <div className="ml-10 flex-1 md:ml-0 md:w-1/2 md:px-8">
                    <div className="rounded-2xl border border-[#EBEBEB] bg-white p-6 transition-colors hover:border-[#FF5400]/30">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-[#FF5400]" />
                        <span className="text-[11px] font-mono font-semibold text-[#FF5400]">{t.date}</span>
                      </div>
                      <h3 className="mt-2 font-display text-[19px] font-semibold tracking-tight">{t.title}</h3>
                      <p className="mt-2 text-[13.5px] leading-relaxed text-[#525252]">{t.desc}</p>
                    </div>
                  </div>
                  <span className="absolute left-4 top-7 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white bg-[#FF5400] shadow-[0_0_0_4px_rgba(255,84,0,0.15)] md:left-1/2" />
                  <div className="hidden md:block md:w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Leadership */}
      <section className="border-b border-[#F0F0F0]">
        <div className="mx-auto max-w-[1100px] px-6 py-20 md:py-28">
          <div className="mb-14 max-w-3xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-[#FF5400]">Liderlik</p>
            <h2 className="mt-3 font-display text-[36px] font-semibold leading-[1.1] tracking-[-0.025em] md:text-[48px]">
              Kim inşa ediyor?
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {LEADERSHIP.map((m) => (
              <div key={m.name} className="rounded-2xl border border-[#EBEBEB] bg-white p-7">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF5400]/15 to-[#FF5400]/5 font-display text-[22px] font-semibold text-[#FF5400]">
                  {m.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}
                </div>
                <h3 className="mt-5 font-display text-[19px] font-semibold tracking-tight">{m.name}</h3>
                <p className="text-[12px] font-medium uppercase tracking-wider text-[#FF5400]">{m.role}</p>
                <p className="mt-3 text-[13.5px] leading-relaxed text-[#525252]">{m.bio}</p>
                <p className="mt-4 border-t border-[#F0F0F0] pt-3 text-[11px] font-medium text-[#8A8A8A]">
                  Odak: <span className="text-[#333]">{m.focus}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Press */}
      <section className="border-b border-[#F0F0F0] bg-[#FAFAFA]">
        <div className="mx-auto max-w-[1100px] px-6 py-20 md:py-28">
          <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-[#FF5400]">Basında</p>
              <h2 className="mt-3 font-display text-[36px] font-semibold leading-[1.1] tracking-[-0.025em] md:text-[44px]">
                Konuşulan UpCore
              </h2>
            </div>
            <a
              href="mailto:basin@upcore.io"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[#E8E8E8] bg-white px-5 text-[13px] font-medium text-[#525252] hover:border-[#FF5400] hover:text-[#FF5400]"
            >
              Basın başvurusu <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="divide-y divide-[#EBEBEB] rounded-2xl border border-[#EBEBEB] bg-white">
            {PRESS.map((p) => (
              <div key={p.title} className="flex items-center justify-between gap-4 px-6 py-5">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[#FF5400]">{p.source}</span>
                  <p className="mt-1 text-[14px] font-medium text-[#0F1419]">{p.title}</p>
                </div>
                <span className="shrink-0 font-mono text-[11px] text-[#8A8A8A]">{p.date}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Careers */}
      <section className="border-b border-[#F0F0F0]">
        <div className="mx-auto max-w-[1100px] px-6 py-20 md:py-28">
          <div className="mb-12 max-w-3xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-[#FF5400]">Kariyer</p>
            <h2 className="mt-3 font-display text-[36px] font-semibold leading-[1.1] tracking-[-0.025em] md:text-[48px]">
              UpCore&apos;a katılın
            </h2>
            <p className="mt-5 text-[16px] leading-[1.65] text-[#525252]">
              Bilim-temelli bir ürünü inşa etmek + Türkiye&apos;nin en iyi İK ekipleriyle çalışmak + sahip olunan erken-aşama hisse. Hibrit veya remote; İstanbul merkezli ofis opsiyonel.
            </p>
          </div>
          <div className="space-y-3">
            {OPEN_ROLES.map((r) => (
              <a
                key={r.title}
                href={`mailto:kariyer@upcore.io?subject=Başvuru: ${encodeURIComponent(r.title)}`}
                className="group flex flex-col gap-3 rounded-2xl border border-[#EBEBEB] bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-[#FF5400]/30 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[#FF5400]">{r.team}</p>
                  <h3 className="mt-1 font-display text-[17px] font-semibold tracking-tight text-[#0F1419]">{r.title}</h3>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[12.5px] font-medium text-[#333]">{r.location}</p>
                    <p className="text-[11px] text-[#8A8A8A]">{r.type}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[#8A8A8A] transition-transform group-hover:translate-x-1 group-hover:text-[#FF5400]" />
                </div>
              </a>
            ))}
          </div>
          <p className="mt-8 text-[13px] text-[#8A8A8A]">
            Listede rolünü göremediysen de yaz — <a href="mailto:kariyer@upcore.io" className="font-medium text-[#FF5400] hover:underline">kariyer@upcore.io</a>. Bilim-temelli İK&apos;ya tutkun olan herkesle konuşuyoruz.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section>
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0F1419] via-[#1F2937] to-[#0F1419] p-12 text-center text-white md:p-16">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,84,0,0.15),transparent_70%)]" />
            <div className="relative">
              <Image src="/upcore-logo.svg" alt="UpCore" width={56} height={56} className="mx-auto mb-6 h-14 w-auto brightness-0 invert" />
              <h2 className="font-display text-[32px] font-semibold leading-tight tracking-[-0.025em] md:text-[44px]">
                UpCore&apos;u canlı gör
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-[15px] text-white/70">
                45 dakikalık canlı demo — kurucuyla direkt. Size doğru çözüm olup olmadığına birlikte karar verelim.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href="/demo"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-[#FF5400] px-6 text-[13px] font-semibold text-white transition-colors hover:bg-white hover:text-[#0F1419]"
                >
                  Demo talep et <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/iletisim"
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-white/20 bg-transparent px-6 text-[13px] font-semibold text-white transition-colors hover:border-white"
                >
                  İletişim <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatTile({ icon: Icon, value, label }: { icon: React.ElementType; value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-[#EBEBEB] bg-white p-5">
      <Icon className="h-4 w-4 text-[#FF5400]" />
      <div className="mt-3 font-display text-[28px] font-semibold tracking-tight text-[#0F1419]">{value}</div>
      <p className="mt-1 text-[11px] leading-tight text-[#525252]">{label}</p>
    </div>
  );
}
