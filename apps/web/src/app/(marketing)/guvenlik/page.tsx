import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Mail,
  ShieldCheck,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  Bug,
  Lock,
  Users,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Güvenlik · Vulnerability Disclosure Program · UpCore',
  description:
    'UpCore Güvenlik Açığı Bildirim Programı (VDP). Kapsam, kurallar, safe harbor, ödül matrisi, disclosure timeline, teşekkür listesi.',
};

const IN_SCOPE = [
  '*.upcore.io (production)',
  'app.upcore.io (müşteri uygulaması)',
  'api.upcore.io (REST API)',
  'auth.upcore.io (Clerk proxy)',
  'status.upcore.io',
  'upcore.io (marketing)',
  'UpCore iOS ve Android uygulamaları',
  'api.upcore.io/v1/* endpoint\'leri',
];

const OUT_OF_SCOPE = [
  'DOS/DDoS saldırıları',
  'Sosyal mühendislik (UpCore çalışanlarına)',
  'Fiziksel saldırılar',
  'SPF/DKIM/DMARC bypass (kullanıcı etkilemeyen)',
  'Rate limiting bypass (destructive olmadıkça)',
  '3. parti SaaS bileşenleri (vendor\'a bildirilmeli)',
  'Clickjacking (sensitive actions hariç)',
  'Self-XSS (kullanıcı kendi tarayıcısında)',
  'Outdated software (kritik güncelleme hariç)',
  '.well-known/ çıktıları (public by design)',
];

const SEVERITY_LEVELS = [
  {
    level: 'Critical',
    color: '#EF4444',
    bounty: '₺10.000 – ₺50.000',
    examples: 'RCE · Authentication bypass · Multi-tenant data leak · SQL injection (auth\'d context) · Kriptografik anahtar sızdırma',
    sla: '24 saat triage · 72 saat fix',
  },
  {
    level: 'High',
    color: '#F97316',
    bounty: '₺2.500 – ₺10.000',
    examples: 'Privilege escalation · Stored XSS · IDOR (sensitive data) · SSRF · XXE · Önemli misconfiguration',
    sla: '3 iş günü triage · 7 iş günü fix',
  },
  {
    level: 'Medium',
    color: '#F59E0B',
    bounty: '₺500 – ₺2.500',
    examples: 'Reflected XSS · CSRF (state-changing) · Business logic flaws · Information disclosure (non-PII)',
    sla: '5 iş günü triage · 14 iş günü fix',
  },
  {
    level: 'Low',
    color: '#10B981',
    bounty: '₺100 – ₺500',
    examples: 'Missing security headers · Open redirect (low impact) · Sub-domain takeover (dead asset)',
    sla: '10 iş günü triage · 30 iş günü fix',
  },
  {
    level: 'Informational',
    color: '#8A8A8A',
    bounty: 'Teşekkür listesi',
    examples: 'Best practice ihlali · design discussion · non-exploitable finding',
    sla: '30 iş günü triage',
  },
];

const TIMELINE = [
  { step: '01', title: 'Bildirim alınır', desc: 'security@upcore.io veya /.well-known/security.txt ile PGP şifrelenmiş.' },
  { step: '02', title: 'Triage', desc: '24 saat içinde doğrulanır, severity atanır, iç ticket açılır.' },
  { step: '03', title: 'Fix geliştirme', desc: 'Severity\'ye göre SLA penceresi · PR açılır, testler yazılır.' },
  { step: '04', title: 'Fix deploy', desc: 'Staging → production · rollout sırası · müşteri tenant\'larında doğrulama.' },
  { step: '05', title: 'Disclosure', desc: 'Araştırmacıyla birlikte CVE başvurusu (varsa) · public blog post · 90 gün penceresi.' },
  { step: '06', title: 'Ödül + teşekkür', desc: 'Ödül ödemesi · Hall of Fame\'e ekleme · LinkedIn onay.' },
];

const RULES = [
  { allowed: true, text: 'Sadece kendi test tenantınız üzerinde test yapın (sandbox.upcore.io — ücretsiz oluşturun).' },
  { allowed: true, text: 'Bulduğunuz açığı açıklayıcı steps-to-reproduce ile bildirin (screenshot + video kabul).' },
  { allowed: true, text: 'Araştırma sürecinde topladığınız verileri bildirim sonrası silin.' },
  { allowed: true, text: 'İyi niyetle sınır testleri yapın · veri çıkarmaya gerek yok.' },
  { allowed: false, text: 'Başka müşteri tenant\'larına erişmeyin · kendi tenant\'ınız yeterlidir.' },
  { allowed: false, text: 'PII/PHI çıkarmayın · ortaya çıkardığınız miktar minimum tutulmalı.' },
  { allowed: false, text: 'Public disclosure\'dan önce 90 gün bekleyin (veya fix\'ten sonra ilk hangi gelirse).' },
  { allowed: false, text: 'Phishing · sosyal mühendislik · fiziksel saldırı · hizmet reddi deneme.' },
];

const HALL_OF_FAME = [
  { name: 'Mehmet Y.', country: 'TR', findings: 3, note: '2026 Q1 · Stored XSS (High)' },
  { name: 'Anonim', country: 'US', findings: 1, note: '2026 Q1 · IDOR (Medium)' },
  { name: 'Ayşe K.', country: 'TR', findings: 2, note: '2026 Q2 · CSRF + business logic (High + Medium)' },
];

export default function GuvenlikPage() {
  return (
    <div className="bg-white text-[#0F1419]">
      {/* Hero */}
      <section className="border-b border-[#F0F0F0] bg-gradient-to-b from-white to-[#FAFAFA]">
        <div className="mx-auto max-w-[1100px] px-6 pt-20 pb-16 md:pt-28">
          <nav className="mb-6 text-[12px] text-[#8A8A8A]">
            <Link href="/" className="hover:text-[#FF5400]">Ana Sayfa</Link>
            <span className="mx-2">/</span>
            <Link href="/guven" className="hover:text-[#FF5400]">Güven Merkezi</Link>
            <span className="mx-2">/</span>
            <span className="text-[#525252]">Güvenlik Açığı Bildirimi</span>
          </nav>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E8E8E8] bg-white px-3 py-1 text-[11px] font-medium text-[#525252]">
              <Bug className="h-3 w-3 text-[#FF5400]" />
              Vulnerability Disclosure Program · Safe Harbor
            </div>
            <h1 className="mt-6 font-display text-[48px] font-semibold leading-[1.05] tracking-[-0.03em] md:text-[72px]">
              Güvenlik bizim için<br />
              <span className="bg-gradient-to-r from-[#0F1419] via-[#FF5400] to-[#0F1419] bg-clip-text text-transparent">
                özelliktir
              </span>
            </h1>
            <p className="mt-7 text-[18px] leading-[1.65] text-[#525252]">
              UpCore Türkiye&apos;de İK verisi işleyen bir SaaS. Tek bir açık binlerce çalışanın kişisel ve sağlık benzeri verilerini riske atabilir.
              Bu sayfa, bağımsız güvenlik araştırmacılarının bir açığı sorumlu şekilde bildirmesi için tüm kuralları ve ödüllerimizi tanımlar.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="mailto:security@upcore.io"
                className="inline-flex h-12 items-center gap-2 rounded-full bg-[#0F1419] px-6 text-[13px] font-semibold text-white transition-colors hover:bg-[#FF5400]"
              >
                <Mail className="h-4 w-4" /> security@upcore.io
              </a>
              <a
                href="/.well-known/security.txt"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-[#E8E8E8] bg-white px-6 text-[13px] font-semibold text-[#0F1419] transition-colors hover:border-[#FF5400] hover:text-[#FF5400]"
              >
                <FileText className="h-4 w-4" /> security.txt + PGP
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Safe harbor */}
      <section className="border-b border-[#F0F0F0]">
        <div className="mx-auto max-w-[1100px] px-6 py-20 md:py-28">
          <div className="rounded-2xl border-2 border-[#10B981]/30 bg-[#F0FDF4] p-8">
            <div className="flex items-start gap-4">
              <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#10B981]">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="font-display text-[24px] font-semibold tracking-tight text-[#0F1419]">
                  Safe Harbor Taahhüdü
                </h2>
                <p className="mt-3 text-[14.5px] leading-relaxed text-[#333]">
                  Bu politikaya uygun araştırma yaparken UpCore size karşı hukuki işlem başlatmaz.
                  Bu safe harbor TCK 243/244 kapsamında "yetki dahilinde erişim" olarak değerlendirilir — iyi niyetli güvenlik araştırmasını koruma taahhüdümüz sözleşmemizin parçasıdır. 3. tarafların (alt işleyenler) size karşı başvurusu olursa hukuki olarak destek oluruz.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Severity + bounty */}
      <section className="border-b border-[#F0F0F0] bg-[#FAFAFA]">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-28">
          <div className="mb-14 max-w-3xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-[#FF5400]">Ödül matrisi</p>
            <h2 className="mt-3 font-display text-[36px] font-semibold leading-[1.1] tracking-[-0.025em] md:text-[48px]">
              Severity × Bounty
            </h2>
            <p className="mt-5 text-[16px] leading-[1.65] text-[#525252]">
              CVSS 3.1 ve business impact skorlamasına göre severity atanır · maksimum ödül kritik bulgularda ₺50.000 · ödeme: banka havalesi veya kripto (tercihe göre) · 30 gün içinde.
            </p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-[#EBEBEB]">
            <table className="w-full min-w-[820px]">
              <thead>
                <tr className="border-b border-[#EBEBEB] bg-white">
                  <th className="p-4 text-left text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">Severity</th>
                  <th className="p-4 text-left text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">Ödül</th>
                  <th className="p-4 text-left text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">Örnekler</th>
                  <th className="p-4 text-left text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">SLA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0] bg-white">
                {SEVERITY_LEVELS.map((s) => (
                  <tr key={s.level}>
                    <td className="p-4">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white"
                        style={{ backgroundColor: s.color }}
                      >
                        {s.level}
                      </span>
                    </td>
                    <td className="p-4 font-mono text-[13px] font-semibold text-[#0F1419]">{s.bounty}</td>
                    <td className="p-4 text-[12.5px] text-[#525252]">{s.examples}</td>
                    <td className="p-4 text-[11px] text-[#8A8A8A]">{s.sla}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Scope */}
      <section className="border-b border-[#F0F0F0]">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-28">
          <div className="mb-14 max-w-3xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-[#FF5400]">Kapsam</p>
            <h2 className="mt-3 font-display text-[36px] font-semibold leading-[1.1] tracking-[-0.025em] md:text-[48px]">
              Test edilebilir sistemler
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-[#EBEBEB] bg-[#F0FDF4] p-7">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[#10B981]" />
                <h3 className="font-display text-[18px] font-semibold tracking-tight">Kapsam içinde</h3>
              </div>
              <ul className="mt-4 space-y-2">
                {IN_SCOPE.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-[13.5px] leading-relaxed text-[#333]">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#10B981]" />
                    <code className="font-mono">{s}</code>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-[#EBEBEB] bg-[#FEF2F2] p-7">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-[#EF4444]" />
                <h3 className="font-display text-[18px] font-semibold tracking-tight">Kapsam dışı</h3>
              </div>
              <ul className="mt-4 space-y-2">
                {OUT_OF_SCOPE.map((s) => (
                  <li key={s} className="flex items-start gap-2 text-[13.5px] leading-relaxed text-[#333]">
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#EF4444]" />
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Rules */}
      <section className="border-b border-[#F0F0F0] bg-[#FAFAFA]">
        <div className="mx-auto max-w-[1100px] px-6 py-20 md:py-28">
          <div className="mb-14 max-w-3xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-[#FF5400]">Kurallar</p>
            <h2 className="mt-3 font-display text-[36px] font-semibold leading-[1.1] tracking-[-0.025em] md:text-[48px]">
              Yapılması + yapılmaması gerekenler
            </h2>
          </div>
          <div className="space-y-2">
            {RULES.map((r, i) => (
              <div
                key={i}
                className={`flex items-start gap-3 rounded-xl border p-4 ${r.allowed ? 'border-[#10B981]/20 bg-[#F0FDF4]' : 'border-[#EF4444]/20 bg-[#FEF2F2]'}`}
              >
                {r.allowed ? (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#10B981]" />
                ) : (
                  <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#EF4444]" />
                )}
                <p className="text-[13.5px] leading-relaxed text-[#333]">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="border-b border-[#F0F0F0]">
        <div className="mx-auto max-w-[1100px] px-6 py-20 md:py-28">
          <div className="mb-14 max-w-3xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-[#FF5400]">Süreç</p>
            <h2 className="mt-3 font-display text-[36px] font-semibold leading-[1.1] tracking-[-0.025em] md:text-[48px]">
              Bildirim sonrası ne olur?
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {TIMELINE.map((t) => (
              <div key={t.step} className="rounded-2xl border border-[#EBEBEB] bg-white p-6">
                <span className="font-mono text-[11px] font-semibold text-[#FF5400]">{t.step}</span>
                <h3 className="mt-2 font-display text-[17px] font-semibold tracking-tight">{t.title}</h3>
                <p className="mt-2 text-[12.5px] leading-relaxed text-[#525252]">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hall of Fame */}
      <section className="border-b border-[#F0F0F0] bg-[#FAFAFA]">
        <div className="mx-auto max-w-[1100px] px-6 py-20 md:py-28">
          <div className="mb-14 max-w-3xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-[#FF5400]">Hall of Fame</p>
            <h2 className="mt-3 font-display text-[36px] font-semibold leading-[1.1] tracking-[-0.025em] md:text-[48px]">
              UpCore&apos;u güvenli tutan araştırmacılar
            </h2>
            <p className="mt-5 text-[16px] leading-[1.65] text-[#525252]">
              Anonim kalmak isteyenler dahil tüm geçerli bildirimcilere teşekkür borçluyuz · listeye eklenmek için araştırma sonrası onay isteyin.
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[#EBEBEB] bg-white">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#EBEBEB] bg-[#FAFAFA]">
                  <th className="p-4 text-left text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">Araştırmacı</th>
                  <th className="p-4 text-left text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">Ülke</th>
                  <th className="p-4 text-left text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">Bulgu sayısı</th>
                  <th className="p-4 text-left text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">Not</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0]">
                {HALL_OF_FAME.map((h) => (
                  <tr key={h.name + h.note}>
                    <td className="p-4 font-semibold text-[#0F1419]">
                      <Award className="mr-2 inline h-4 w-4 text-[#FF5400]" />
                      {h.name}
                    </td>
                    <td className="p-4 font-mono text-[12px] text-[#525252]">{h.country}</td>
                    <td className="p-4 text-[13px] text-[#333]">{h.findings}</td>
                    <td className="p-4 text-[12.5px] text-[#525252]">{h.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="mx-auto max-w-[1100px] px-6 py-24">
          <div className="rounded-[24px] bg-[#0F1419] p-10 text-center text-white md:p-16">
            <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FF5400]/20">
              <Bug className="h-7 w-7 text-[#FF5400]" />
            </div>
            <h2 className="font-display text-[32px] font-semibold leading-tight tracking-[-0.025em] md:text-[40px]">
              Açık buldunuz mu?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] text-white/70">
              24 saat içinde triage · 72 saat içinde fix başlıyor (kritik). PGP şifreli bildirim için security.txt\'i kullanın.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a
                href="mailto:security@upcore.io?subject=[VDP]%20Güvenlik%20açığı%20bildirimi"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-[#FF5400] px-6 text-[13px] font-semibold text-white transition-colors hover:bg-white hover:text-[#0F1419]"
              >
                <Mail className="h-4 w-4" /> security@upcore.io
              </a>
              <a
                href="/.well-known/security.txt"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-white/20 bg-transparent px-6 text-[13px] font-semibold text-white transition-colors hover:border-white"
              >
                <Lock className="h-4 w-4" /> PGP public key
              </a>
            </div>
            <div className="mt-10 flex flex-wrap justify-center gap-6 text-[11px] text-white/60">
              <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> 24 saat triage</span>
              <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Safe harbor</span>
              <span className="inline-flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Hall of Fame</span>
              <span className="inline-flex items-center gap-1.5"><Award className="h-3.5 w-3.5" /> ₺50.000\'e kadar ödül</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
