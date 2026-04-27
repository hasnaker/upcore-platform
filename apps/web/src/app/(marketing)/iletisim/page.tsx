import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Mail,
  MessageSquare,
  Phone,
  MapPin,
  Building2,
  Shield,
  Briefcase,
  FlaskConical,
  Newspaper,
  HelpCircle,
  Clock,
  Globe2,
  Zap,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'İletişim · UpCore',
  description:
    'Satış, destek, KVKK, araştırma, basın, kariyer — UpCore ile iletişim kanalları. Demo talebi, 45 dakika içinde yanıt SLA.',
};

const CHANNELS = [
  {
    icon: Briefcase,
    department: 'Satış',
    email: 'satis@upcore.io',
    phone: '',
    desc: 'Demo talebi, fiyat teklifi, sözleşme görüşmesi, özel entegrasyon ihtiyaçları.',
    sla: 'Mesai saatleri · 4 saat içinde yanıt · demo sonrası doğrudan telefon paylaşılır',
    color: '#FF5400',
  },
  {
    icon: HelpCircle,
    department: 'Destek',
    email: 'destek@upcore.io',
    phone: '',
    desc: 'Aktif müşteriler için teknik destek, konfigürasyon, eğitim talebi. WhatsApp destek hattı KOBİ planı dahil.',
    sla: '7/24 (Enterprise) · mesai saatleri (Starter/Pro) · WhatsApp (Micro)',
    color: '#10B981',
  },
  {
    icon: Shield,
    department: 'KVKK & Uyum',
    email: 'kvkk@upcore.io',
    phone: '',
    desc: 'Veri sahibi başvuruları (erişim, düzeltme, silme), VERBIS kaydı, DPIA işbirliği.',
    sla: 'KVKK Madde 13: 30 gün SLA · kritik olaylar 72 saat',
    color: '#5E5CE6',
  },
  {
    icon: FlaskConical,
    department: 'Araştırma',
    email: 'arastirma@upcore.io',
    phone: '',
    desc: 'Akademik işbirliği, ölçek validasyonu, veri paylaşımı, yüksek lisans/doktora teşvikleri.',
    sla: 'Mesai saatleri · 2 iş günü içinde yanıt',
    color: '#F59E0B',
  },
  {
    icon: Newspaper,
    department: 'Basın',
    email: 'basin@upcore.io',
    phone: '',
    desc: 'Röportaj, basın kiti, medya sorguları, etkinlik konuşmacı talepleri.',
    sla: 'Mesai saatleri · aynı gün yanıt',
    color: '#0EA5E9',
  },
  {
    icon: Zap,
    department: 'Kariyer',
    email: 'kariyer@upcore.io',
    phone: '',
    desc: 'Açık pozisyonlara başvuru, genel ilgi başvurusu, staj programı.',
    sla: 'Mesai saatleri · 5 iş günü içinde yanıt',
    color: '#EC4899',
  },
];

const OFFICE = {
  name: 'UpCore Teknoloji A.Ş.',
  address: 'Maslak Mahallesi, Büyükdere Caddesi, No: 255, Nurol Plaza, Kat: 14, 34485 Sarıyer / İstanbul',
  vkn: 'VKN: 8950000000',
  mersis: 'Mersis: 0895000000000',
  verbis: 'VERBIS Kayıt: 2026-01',
};

const FAQS = [
  {
    q: 'Demo ne kadar sürer?',
    a: '45 dakikalık canlı görüşme. İlk 15 dakika ihtiyaç analizi (ekip büyüklüğü, mevcut sistemler, kritik sorunlar). Kalan 30 dakika platform üzerinde sizin senaryolarınızla demo. Katılımcı: kurucu + teknik lead.',
  },
  {
    q: 'Teklif almam ne kadar sürer?',
    a: 'Demo toplantısından sonra 24 saat içinde yazılı teklif. Kurumsal (Enterprise) için özel konfigürasyon gerekiyorsa maksimum 3 iş günü. Pilot programı sözleşmesi dahil.',
  },
  {
    q: 'KVKK veri sahibi başvurumu nereden yaparım?',
    a: 'kvkk@upcore.io adresine başvuru yapabilir veya platform içi &quot;Veri Sahibi Portalı&quot; bölümünden otomatik talep oluşturabilirsiniz. KVKK Madde 13 gereği 30 gün içinde yanıt veriyoruz; kritik olaylar (veri ihlali) 72 saat içinde bildiriliyor.',
  },
  {
    q: 'Araştırmacı olarak ham veri alabilir miyim?',
    a: 'Akademik kurumlardan sözleşmeli anonim ham veri talepleri kabul ediyoruz. arastirma@upcore.io adresine: araştırma protokolü + etik kurul onayı + beklenen örneklem + veri kullanım amacı. İnceleme 2 iş günü.',
  },
  {
    q: '7/24 destek alabilir miyim?',
    a: 'Enterprise tier&apos;da evet. Starter ve Professional tier&apos;larda mesai saatleri (09:00-18:00, P1-P5). Hafta sonu ve gece saatlerinde P1 (sistem çökmesi) için 2 saat içinde yanıt taahhüdümüz var.',
  },
  {
    q: 'Satış ekibi geri aramak için ne kadar bekler?',
    a: 'Web formu veya e-postadan gelen talepleri 4 saat içinde yanıtlıyoruz (mesai saatleri). Gece/hafta sonu geldiyse ertesi iş günü ilk işimiz. Demo görüşmesi sırasında size doğrudan telefon numaramızı paylaşırız — bu sayfada fake numara bırakmıyoruz, çünkü o güven vermez.',
  },
];

export default function IletisimPage() {
  return (
    <div className="bg-white text-[#0F1419]">
      {/* Hero */}
      <section className="border-b border-[#F0F0F0] bg-gradient-to-b from-white to-[#FAFAFA]">
        <div className="mx-auto max-w-[1100px] px-6 pt-20 pb-16 md:pt-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E8E8E8] bg-white px-3 py-1 text-[11px] font-medium text-[#525252]">
              <Clock className="h-3 w-3 text-[#FF5400]" />
              Ortalama yanıt süresi: 3 saat
            </div>
            <h1 className="mt-6 font-display text-[48px] font-semibold leading-[1.05] tracking-[-0.03em] md:text-[72px]">
              Doğru kanal,<br />
              <span className="bg-gradient-to-r from-[#0F1419] via-[#FF5400] to-[#0F1419] bg-clip-text text-transparent">
                doğru yanıt hızı
              </span>
            </h1>
            <p className="mt-7 text-[18px] leading-[1.65] text-[#525252]">
              UpCore&apos;da her departmanın kendi e-postası, SLA&apos;i ve sorumlu kişisi var.
              Satış talebiniz satış ekibine, KVKK başvurunuz hukuka, araştırma talebiniz akademik ekibe — aracı yok, gecikme yok.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/demo"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[#0F1419] px-7 text-[14px] font-semibold text-white transition-colors hover:bg-[#FF5400]"
              >
                Demo talep et (önerilen) <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="mailto:merhaba@upcore.io"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-[#E8E8E8] bg-white px-7 text-[14px] font-semibold text-[#0F1419] transition-colors hover:border-[#FF5400] hover:text-[#FF5400]"
              >
                <Mail className="h-4 w-4" /> merhaba@upcore.io
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Channels grid */}
      <section className="border-b border-[#F0F0F0]">
        <div className="mx-auto max-w-[1100px] px-6 py-20 md:py-28">
          <div className="mb-14 max-w-3xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-[#FF5400]">Departmanlar</p>
            <h2 className="mt-3 font-display text-[36px] font-semibold leading-[1.1] tracking-[-0.025em] md:text-[48px]">
              6 kanal · net SLA
            </h2>
            <p className="mt-5 text-[16px] leading-[1.65] text-[#525252]">
              Her kanalın yanında yanıt süresi taahhüdü var. Yanlış kanala yazmayın — doğru kişiye ulaşmak saatlerinizi kurtarır.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {CHANNELS.map((c) => (
              <div
                key={c.department}
                className="group flex flex-col rounded-2xl border border-[#EBEBEB] bg-white p-7 transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-20px_rgba(0,0,0,0.1)]"
                style={{ borderTop: `3px solid ${c.color}` }}
              >
                <div
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${c.color}15` }}
                >
                  <c.icon className="h-5 w-5" style={{ color: c.color }} />
                </div>
                <h3 className="mt-5 font-display text-[20px] font-semibold tracking-tight">{c.department}</h3>
                <p className="mt-2 flex-1 text-[13.5px] leading-relaxed text-[#525252]">{c.desc}</p>

                <div className="mt-5 space-y-2.5 border-t border-[#F0F0F0] pt-5">
                  <a
                    href={`mailto:${c.email}`}
                    className="flex items-center gap-2 text-[13px] font-medium text-[#0F1419] hover:text-[#FF5400]"
                  >
                    <Mail className="h-3.5 w-3.5 text-[#8A8A8A]" />
                    {c.email}
                  </a>
                  {c.phone && (
                    <a
                      href={`tel:${c.phone.replace(/[^0-9+]/g, '')}`}
                      className="flex items-center gap-2 text-[13px] font-medium text-[#0F1419] hover:text-[#FF5400]"
                    >
                      <Phone className="h-3.5 w-3.5 text-[#8A8A8A]" />
                      {c.phone}
                    </a>
                  )}
                  <div className="flex items-start gap-2 pt-2">
                    <Clock className="mt-0.5 h-3 w-3 shrink-0 text-[#8A8A8A]" />
                    <p className="text-[11px] leading-snug text-[#8A8A8A]">{c.sla}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Office + quick chips */}
      <section className="border-b border-[#F0F0F0] bg-[#FAFAFA]">
        <div className="mx-auto max-w-[1100px] px-6 py-20 md:py-28">
          <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-[#FF5400]">Ofis</p>
              <h2 className="mt-3 font-display text-[32px] font-semibold leading-[1.1] tracking-[-0.025em] md:text-[40px]">
                İstanbul · Maslak
              </h2>
              <div className="mt-8 rounded-2xl border border-[#EBEBEB] bg-white p-7">
                <div className="flex items-start gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF8F2]">
                    <Building2 className="h-5 w-5 text-[#FF5400]" />
                  </div>
                  <div>
                    <h3 className="font-display text-[19px] font-semibold tracking-tight">{OFFICE.name}</h3>
                    <p className="mt-2 text-[13.5px] leading-relaxed text-[#525252]">
                      <MapPin className="mr-1 inline h-3.5 w-3.5 text-[#8A8A8A]" />
                      {OFFICE.address}
                    </p>
                    <div className="mt-4 grid gap-2 text-[12px] text-[#525252] sm:grid-cols-3">
                      <span className="font-mono">{OFFICE.vkn}</span>
                      <span className="font-mono">{OFFICE.mersis}</span>
                      <span className="font-mono">{OFFICE.verbis}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-[#F0F0F0] pt-5">
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-[#525252]">
                    <Globe2 className="h-3.5 w-3.5 text-[#8A8A8A]" />
                    Çalışma saatleri: Pzt-Cum 09:00-18:00 TRT
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[12px] text-[#525252]">
                    <Clock className="h-3.5 w-3.5 text-[#8A8A8A]" />
                    Ofis ziyareti randevulu
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-[#FF5400]">Hızlı kanallar</p>
              <QuickChip
                icon={MessageSquare}
                title="Demo talep formu"
                desc="En hızlı yol — 45 dk canlı görüşme"
                href="/demo"
              />
              <QuickChip
                icon={Shield}
                title="Güven Merkezi"
                desc="Güvenlik, uyum, status page"
                href="/guven"
              />
              <QuickChip
                icon={FlaskConical}
                title="Bilimsel Temel"
                desc="Kullandığımız ölçekler + validasyon"
                href="/bilimsel-temel"
              />
              <QuickChip
                icon={Zap}
                title="Açık pozisyonlar"
                desc="UpCore&apos;a katılın · 5 aktif ilan"
                href="/hakkimizda#kariyer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-[#F0F0F0]">
        <div className="mx-auto max-w-[900px] px-6 py-20 md:py-28">
          <div className="mb-12 text-center">
            <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-[#FF5400]">SSS</p>
            <h2 className="mt-3 font-display text-[36px] font-semibold leading-[1.1] tracking-[-0.025em] md:text-[44px]">
              İletişim hakkında sık sorulanlar
            </h2>
          </div>
          <div className="divide-y divide-[#EBEBEB] rounded-2xl border border-[#EBEBEB] bg-white">
            {FAQS.map((f) => (
              <details key={f.q} className="group px-6 py-5">
                <summary className="flex cursor-pointer items-start justify-between gap-4 text-[16px] font-semibold text-[#0F1419] marker:hidden [&::-webkit-details-marker]:hidden">
                  <span>{f.q}</span>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#E8E8E8] text-[16px] text-[#8A8A8A] transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[14px] leading-[1.7] text-[#525252]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section>
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <div className="rounded-[24px] border border-[#EBEBEB] bg-gradient-to-br from-white to-[#FFF8F2] p-10 md:p-14">
            <div className="flex flex-col items-center text-center">
              <h2 className="font-display text-[30px] font-semibold leading-tight tracking-[-0.025em] text-[#0F1419] md:text-[40px]">
                Hâlâ doğru kanalı bulamadıysanız
              </h2>
              <p className="mt-4 max-w-xl text-[15px] text-[#525252]">
                Genel iletişim kutumuza yazın, doğru ekibe yönlendirelim. Mesai saatlerinde 3 saat içinde yanıt.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <a
                  href="mailto:merhaba@upcore.io"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-[#0F1419] px-6 text-[13px] font-semibold text-white transition-colors hover:bg-[#FF5400]"
                >
                  merhaba@upcore.io <ArrowUpRight className="h-4 w-4" />
                </a>
                <Link
                  href="/demo"
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-[#E8E8E8] bg-white px-6 text-[13px] font-semibold text-[#0F1419] transition-colors hover:border-[#FF5400] hover:text-[#FF5400]"
                >
                  Demo talep et <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function QuickChip({
  icon: Icon,
  title,
  desc,
  href,
}: {
  icon: React.ElementType;
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-[#EBEBEB] bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-[#FF5400]/30"
    >
      <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF8F2]">
        <Icon className="h-5 w-5 text-[#FF5400]" />
      </div>
      <div className="flex-1">
        <p className="font-display text-[15px] font-semibold tracking-tight text-[#0F1419]">{title}</p>
        <p className="mt-0.5 text-[12px] text-[#525252]">{desc}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-[#8A8A8A] transition-transform group-hover:translate-x-1 group-hover:text-[#FF5400]" />
    </Link>
  );
}
