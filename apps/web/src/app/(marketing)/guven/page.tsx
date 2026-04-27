import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ShieldCheck,
  FileText,
  Lock,
  Mail,
  CheckCircle2,
  Eye,
  Database,
  Server,
  ArrowUpRight,
  AlertCircle,
  Users,
  Key,
  Layers,
  ArrowRight,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Güven Merkezi · UpCore',
  description:
    "UpCore Güven Merkezi: ISO 27001 + SOC 2 Type II + KVKK uyumu, alt işleyenler, SLA, şifreleme, RLS izolasyonu, disaster recovery. Enterprise satın alma değerlendirmenizin tek kaynağı.",
};

const CERTIFICATIONS = [
  {
    name: 'KVKK Uyumu',
    status: 'Aktif',
    statusColor: '#10B981',
    desc: 'VERBIS kaydı · yıllık DPIA · 72 saatlik ihlal bildirimi SLA · veri sahibi hakları portal · Aydınlatma metinleri (çalışan/aday/ziyaretçi ayrı).',
    evidence: 'VERBIS No · DPIA rapor · ihlal yönetmeliği',
  },
  {
    name: 'ISO 27001:2022',
    status: 'Stage 1 · Q4 2026',
    statusColor: '#F59E0B',
    desc: 'Bilgi güvenliği yönetim sistemi · Stage 1 denetimi 2026 Q4 · sertifika Q1 2027. 93 Annex A kontrolü şu an uygulamada.',
    evidence: 'SoA · policies package (NDA sonrası)',
  },
  {
    name: 'SOC 2 Type II',
    status: 'Observation · 2026-07',
    statusColor: '#F59E0B',
    desc: '12 aylık gözlem penceresi 2026-07-01 başlıyor · Security + Availability + Confidentiality trust services · Q3 2027 sertifika.',
    evidence: 'Type I readiness · bridge letter talep üzerine',
  },
  {
    name: 'GDPR',
    status: 'Applicable · AB müşteri',
    statusColor: '#10B981',
    desc: 'AB müşterileri için GDPR Art. 28 Data Processing Agreement · SCC Module 2 · Chapter V transfer mekanizması.',
    evidence: 'DPA + SCC şablonu',
  },
  {
    name: 'PCI-DSS',
    status: 'Kapsam dışı',
    statusColor: '#8A8A8A',
    desc: 'Kart verisi asla UpCore sunucularında depolanmaz · ödemeler Stripe/İyzico tokenize ediyor · merchant-of-record seçeneği Paddle.',
    evidence: 'PCI scope statement',
  },
  {
    name: 'HIPAA',
    status: 'Not applicable',
    statusColor: '#8A8A8A',
    desc: 'UpCore sağlık bilgisi işlemez · PHI kapsamında değil · sağlık sigortası verisi dışarıda tutulur.',
    evidence: 'Scope statement',
  },
];

const SECURITY_PILLARS = [
  {
    icon: Lock,
    title: 'Şifreleme',
    points: [
      'AES-256 at-rest · Azure Managed Keys veya customer-managed HSM',
      'TLS 1.3 in-transit · HSTS preload · minimum TLS 1.2',
      'pgcrypto field-level · TCKN + kritik PII · per-tenant anahtar',
      'Anahtar rotasyonu · 90 gün otomatik · audit log',
    ],
  },
  {
    icon: Layers,
    title: 'Tenant İzolasyonu',
    points: [
      'PostgreSQL Row-Level Security · her tablo tenant_id kısıtlı',
      'RBAC · 40+ izin · custom roller tanımlanabilir',
      'SAML 2.0 + OIDC SSO · SCIM provisioning (Okta, Entra)',
      'MFA zorunlu · Admin rolleri için FIDO2/WebAuthn',
    ],
  },
  {
    icon: Eye,
    title: 'Audit & Observability',
    points: [
      'Immutable audit log · WORM storage · 7 yıl',
      'Tüm erişim sorguları kayıtlı · kullanıcı + IP + user agent',
      'Bireysel psikometrik veri erişimleri alarm verir',
      'Forensic ready · SIEM entegrasyonu (Splunk, Sentinel)',
    ],
  },
  {
    icon: Server,
    title: 'Altyapı & DR',
    points: [
      'Azure North Europe primary · İrlanda warm-standby',
      'PITR 35 gün · otomatik günlük snapshot',
      'Quarterly disaster recovery drill · RTO 4 saat · RPO 15 dk',
      'Multi-AZ Postgres · 99.9% uptime SLA · Linkerd service mesh',
    ],
  },
  {
    icon: Database,
    title: 'Veri Yönetimi',
    points: [
      'Data residency: varsayılan EU North · 2026 Q3 Türkiye merkez',
      'Data classification: public/internal/confidential/restricted',
      'Veri sahibi portal · KVKK Madde 11 talepleri 30 gün SLA',
      'Retention policy: çalışan 5 yıl · aday 6 ay · otomatik silme',
    ],
  },
  {
    icon: Key,
    title: 'Access Control',
    points: [
      'Zero trust · JWT + refresh token rotation',
      'Admin eylemleri için step-up auth (re-authentication)',
      'Session timeout 8 saat · idle timeout 30 dk',
      'IP allowlist · tenant-level geografik kısıtlama',
    ],
  },
];

const SUBPROCESSORS = [
  { name: 'Microsoft Azure', purpose: 'Hosting · DB · Storage · AI', location: 'EU North + TR Central', dpa: true, critical: true },
  { name: 'Clerk', purpose: 'Kimlik yönetimi (authn/authz)', location: 'ABD · SCC Module 2', dpa: true, critical: true },
  { name: 'Stripe', purpose: 'Abonelik ödemeleri (global)', location: 'İrlanda / ABD', dpa: true, critical: false },
  { name: 'İyzico', purpose: 'Türkiye ödeme gateway', location: 'Türkiye', dpa: true, critical: false },
  { name: 'DocuSign', purpose: 'E-imza · sözleşme', location: 'ABD · SCC Module 2', dpa: true, critical: false },
  { name: 'Daily.co', purpose: 'Video mülakat · embedded', location: 'ABD · SCC Module 2', dpa: true, critical: false },
  { name: 'SendGrid', purpose: 'Transaksiyonel e-posta', location: 'ABD · SCC Module 2', dpa: true, critical: false },
  { name: 'Twilio', purpose: 'SMS OTP · bildirimler', location: 'ABD · SCC Module 2', dpa: true, critical: false },
  { name: 'Azure OpenAI', purpose: 'AI yardımcı · prompt residency EU', location: 'EU North · residency', dpa: true, critical: false },
  { name: 'Anthropic Claude', purpose: 'Uzun döküman özet · CV parse', location: 'ABD · SCC Module 2 · zero retention', dpa: true, critical: false },
  { name: 'Datadog', purpose: 'Application monitoring', location: 'EU · data residency', dpa: true, critical: false },
];

const SLA_METRICS = [
  { value: '99.9%', label: 'Aylık uptime SLA', sub: 'Enterprise: 99.95%' },
  { value: '4 saat', label: 'RTO · disaster recovery', sub: 'PITR 35 gün' },
  { value: '15 dk', label: 'RPO · veri kaybı penceresi', sub: 'Cross-region replica' },
  { value: '72 saat', label: 'İhlal bildirim SLA', sub: 'KVKK + GDPR uyumlu' },
  { value: '30 gün', label: 'Veri sahibi talep yanıtı', sub: 'KVKK Madde 13' },
  { value: '15 dk', label: 'P1 incident response', sub: 'Enterprise tier · 7/24' },
];

const PROCESSES = [
  { title: 'Çalışan güvenlik eğitimi', desc: 'Aylık phishing simülasyonu · yıllık ISO 27001 farkındalık + KVKK eğitimi · test geçme zorunlu.' },
  { title: 'Secure SDLC', desc: 'Her PR\'da SAST (Semgrep) · dependency scan (Dependabot) · container scan (Trivy) · kritik CVE block.' },
  { title: 'Vulnerability management', desc: 'Yıllık bağımsız penetrasyon testi · bulgular 30 gün içinde kapanır · kritik < 7 gün.' },
  { title: 'Incident response', desc: 'Playbook + on-call rotation · P1-P5 sınıflama · post-mortem zorunlu · müşteri bildirimi şablonu.' },
  { title: 'Vendor risk assessment', desc: 'Tüm alt işleyenler yıllık güvenlik anketi + SOC 2/ISO dökümanı · 10 iş günü itiraz süresi değişikliklerde.' },
  { title: 'Bug bounty program', desc: 'Public VDP · safe harbor · ödül matrix public · disclosure policy · HackerOne benzeri.' },
];

export default function GuvenPage() {
  return (
    <div className="bg-white text-[#0F1419]">
      {/* Hero */}
      <section className="border-b border-[#F0F0F0] bg-gradient-to-b from-white to-[#FAFAFA]">
        <div className="mx-auto max-w-[1200px] px-6 pt-20 pb-16 md:pt-28">
          <nav className="mb-6 text-[12px] text-[#8A8A8A]">
            <Link href="/" className="hover:text-[#FF5400]">Ana Sayfa</Link>
            <span className="mx-2">/</span>
            <span className="text-[#525252]">Güven Merkezi</span>
          </nav>
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E8E8E8] bg-white px-3 py-1 text-[11px] font-medium text-[#525252]">
              <ShieldCheck className="h-3 w-3 text-[#FF5400]" />
              Enterprise satın alma değerlendirmeniz için hazır
            </div>
            <h1 className="mt-6 font-display text-[48px] font-semibold leading-[1.05] tracking-[-0.03em] md:text-[72px]">
              UpCore Güven Merkezi
            </h1>
            <p className="mt-7 text-[18px] leading-[1.65] text-[#525252]">
              Çalışan verileri en hassas verilerdir. UpCore güvenlik, uyum, gizlilik ve operasyonel şeffaflık bilgilerini tek sayfada toplar. NDA gerektiren dökümanlar için satış ekibimizle iletişime geçin; standart politikalar ve sertifika tarihçesi burada kamuya açıktır.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="https://status.upcore.io"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 items-center gap-2 rounded-full border border-[#E8E8E8] bg-white px-5 text-[13px] font-medium text-[#525252] hover:border-[#FF5400] hover:text-[#FF5400]"
              >
                <span className="flex h-2 w-2 rounded-full bg-[#10B981]" />
                status.upcore.io
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
              <a
                href="mailto:security@upcore.io"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-[#0F1419] px-5 text-[13px] font-semibold text-white hover:bg-[#FF5400]"
              >
                <Mail className="h-4 w-4" />
                Güvenlik sorusu
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Certifications */}
      <section className="border-b border-[#F0F0F0]">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-28">
          <div className="mb-14 max-w-3xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-[#FF5400]">Sertifikalar</p>
            <h2 className="mt-3 font-display text-[36px] font-semibold leading-[1.1] tracking-[-0.025em] md:text-[48px]">
              Uyum çerçeveleri
            </h2>
            <p className="mt-5 text-[16px] leading-[1.65] text-[#525252]">
              Pazarlama vaadi değil, gerçek durum. Aktif olanları canlı şekilde işletiyoruz; hedef tarihli olanlar için yol haritasını paylaşıyoruz. Eksiklerini de şeffaf listeliyoruz — çünkü sertifika yalan söylenmez.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {CERTIFICATIONS.map((c) => (
              <div key={c.name} className="rounded-2xl border border-[#EBEBEB] bg-white p-7">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-[19px] font-semibold tracking-tight">{c.name}</h3>
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ backgroundColor: `${c.statusColor}15`, color: c.statusColor }}
                  >
                    <span className="h-1 w-1 rounded-full" style={{ backgroundColor: c.statusColor }} />
                    {c.status}
                  </span>
                </div>
                <p className="mt-3 text-[13.5px] leading-relaxed text-[#525252]">{c.desc}</p>
                <p className="mt-4 border-t border-[#F0F0F0] pt-3 text-[11px] text-[#8A8A8A]">
                  Evidence: <span className="font-mono text-[#333]">{c.evidence}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security pillars */}
      <section className="border-b border-[#F0F0F0] bg-[#FAFAFA]">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-28">
          <div className="mb-14 max-w-3xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-[#FF5400]">Teknik güvenlik</p>
            <h2 className="mt-3 font-display text-[36px] font-semibold leading-[1.1] tracking-[-0.025em] md:text-[48px]">
              6 temel sütun
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {SECURITY_PILLARS.map((p) => (
              <div key={p.title} className="rounded-2xl border border-[#EBEBEB] bg-white p-7">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF8F2]">
                  <p.icon className="h-5 w-5 text-[#FF5400]" />
                </div>
                <h3 className="mt-5 font-display text-[19px] font-semibold tracking-tight">{p.title}</h3>
                <ul className="mt-4 space-y-2.5">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-[#333]">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FF5400]" />
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SLA */}
      <section className="border-b border-[#F0F0F0]">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-28">
          <div className="mb-14 max-w-3xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-[#FF5400]">SLA & Operasyon</p>
            <h2 className="mt-3 font-display text-[36px] font-semibold leading-[1.1] tracking-[-0.025em] md:text-[48px]">
              Taahhütler · rakamlar
            </h2>
            <p className="mt-5 text-[16px] leading-[1.65] text-[#525252]">
              Müşteri sözleşmemizde yer alan rakamlar · kaçırma durumunda service credit otomatik uygulanır. Status page gerçek zamanlı raporlar (status.upcore.io).
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            {SLA_METRICS.map((m) => (
              <div key={m.label} className="rounded-2xl border border-[#EBEBEB] bg-white p-5">
                <div className="font-display text-[24px] font-semibold leading-none tracking-tight text-[#0F1419]">
                  {m.value}
                </div>
                <p className="mt-2 text-[11px] leading-tight font-medium text-[#0F1419]">{m.label}</p>
                <p className="mt-1 text-[10px] leading-tight text-[#8A8A8A]">{m.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subprocessors */}
      <section className="border-b border-[#F0F0F0] bg-[#FAFAFA]">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-28">
          <div className="mb-12 max-w-3xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-[#FF5400]">Alt işleyenler</p>
            <h2 className="mt-3 font-display text-[36px] font-semibold leading-[1.1] tracking-[-0.025em] md:text-[48px]">
              Kullandığımız 3. parti servisler
            </h2>
            <p className="mt-5 text-[16px] leading-[1.65] text-[#525252]">
              Bu liste değişirse tenant yöneticilere e-posta ile bildirim yapılır · 10 iş günü itiraz süresi sunulur · tüm kritik servisler için DPA imzalı.
            </p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-[#EBEBEB]">
            <table className="w-full min-w-[680px] text-left">
              <thead>
                <tr className="border-b border-[#EBEBEB] bg-white">
                  <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">Vendor</th>
                  <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">Amaç</th>
                  <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">Lokasyon</th>
                  <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">Kritiklik</th>
                  <th className="p-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">DPA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F0F0] bg-white">
                {SUBPROCESSORS.map((s) => (
                  <tr key={s.name}>
                    <td className="p-4 font-medium text-[#0F1419]">{s.name}</td>
                    <td className="p-4 text-[12.5px] text-[#525252]">{s.purpose}</td>
                    <td className="p-4 text-[12.5px] text-[#525252]">{s.location}</td>
                    <td className="p-4">
                      {s.critical ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#FEF2F2] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#EF4444]">
                          <AlertCircle className="h-3 w-3" />
                          Kritik
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#525252]">
                          Standart
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1 text-[12px] text-[#10B981]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        İmzalı
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Processes */}
      <section className="border-b border-[#F0F0F0]">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-28">
          <div className="mb-14 max-w-3xl">
            <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-[#FF5400]">Süreçler</p>
            <h2 className="mt-3 font-display text-[36px] font-semibold leading-[1.1] tracking-[-0.025em] md:text-[48px]">
              Operasyonel güvenlik pratikleri
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {PROCESSES.map((p) => (
              <div key={p.title} className="rounded-2xl border border-[#EBEBEB] bg-white p-6">
                <h3 className="font-display text-[17px] font-semibold tracking-tight">{p.title}</h3>
                <p className="mt-3 text-[13px] leading-relaxed text-[#525252]">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Documents & Contact */}
      <section className="border-b border-[#F0F0F0] bg-[#FAFAFA]">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-28">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-[#FF5400]">Belgeler</p>
              <h2 className="mt-3 font-display text-[32px] font-semibold leading-tight tracking-tight md:text-[40px]">
                İndirilebilir politikalar
              </h2>
              <p className="mt-4 text-[14px] text-[#525252]">
                Kamuya açık olanlar direkt linklerle · NDA sonrası paylaşılanlar için güvenlik ekibiyle iletişim.
              </p>
              <div className="mt-8 grid gap-3">
                <DocLink title="Güvenlik Açığı Bildirimi (VDP)" href="/guvenlik" desc="Safe harbor + ödül matrisi + disclosure timeline" />
                <DocLink title="KVKK Aydınlatma Metni" href="/kvkk" desc="Çalışan · aday · ziyaretçi için ayrı" />
                <DocLink title="Kullanım Şartları" href="/kullanim-sartlari" desc="SaaS sözleşmesi · SLA · sorumluluk" />
                <DocLink title="security.txt" href="/.well-known/security.txt" desc="RFC 9116 güvenlik iletişim dosyası" external />
                <DocLink title="Status Page" href="https://status.upcore.io" desc="7 gün uptime · incident tarihçe" external />
                <DocLink title="DPA şablonu (talep üzerine)" href="mailto:kvkk@upcore.io?subject=DPA%20talebi" desc="KVKK + GDPR uyumlu işleyici sözleşmesi" external />
                <DocLink title="ISO 27001 SoA (NDA sonrası)" href="mailto:security@upcore.io?subject=ISO%2027001%20SoA" desc="Statement of Applicability · NDA şart" external />
                <DocLink title="Penetrasyon test özet (NDA sonrası)" href="mailto:security@upcore.io?subject=Pentest%20özet" desc="Son yıllık bağımsız pentest · özet rapor" external />
              </div>
            </div>

            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.25em] text-[#FF5400]">İletişim</p>
              <h2 className="mt-3 font-display text-[32px] font-semibold leading-tight tracking-tight md:text-[40px]">
                Doğru kanal · doğru yanıt
              </h2>
              <div className="mt-8 flex flex-col gap-3">
                <ContactCard
                  icon={ShieldCheck}
                  title="Güvenlik araştırmacısı"
                  email="security@upcore.io"
                  desc="Açık bildirimi · VDP · bounty başvurusu"
                />
                <ContactCard
                  icon={Users}
                  title="KVKK / DPO"
                  email="kvkk@upcore.io"
                  desc="Veri sahibi talepleri · DPIA · ihlal"
                />
                <ContactCard
                  icon={FileText}
                  title="Enterprise satış"
                  email="satis@upcore.io"
                  desc="DPA · güvenlik anketi · SOC 2 rapor talebi"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section>
        <div className="mx-auto max-w-[1200px] px-6 py-24">
          <div className="rounded-[24px] border border-[#EBEBEB] bg-gradient-to-br from-white to-[#FFF8F2] p-10 md:p-14">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-[30px] font-semibold leading-tight tracking-[-0.025em] md:text-[40px]">
                Güvenlik anketimiz var — nereden başlasak?
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-[#525252]">
                Vendor security questionnaire (VSAQ, CAIQ, SIG Lite, custom), RFP güvenlik ekleri, DPIA, TIA — hepsine 5 iş günü içinde yanıt veriyoruz. NDA ile başlayıp detaylı dökümanlara geçebiliriz.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <a
                  href="mailto:security@upcore.io?subject=Güvenlik%20anketi"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-[#0F1419] px-6 text-[13px] font-semibold text-white transition-colors hover:bg-[#FF5400]"
                >
                  security@upcore.io <ArrowUpRight className="h-4 w-4" />
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

      <footer className="bg-white">
        <div className="mx-auto max-w-[1200px] px-6 py-6 text-[11px] text-[#8A8A8A]">
          Son güncelleme: 2026-04-22 · Bu sayfanın içeriği UpCore güvenlik ve uyum taahhütlerini yansıtır · pazarlama vaadi değildir.
        </div>
      </footer>
    </div>
  );
}

function DocLink({
  title,
  href,
  desc,
  external,
}: {
  title: string;
  href: string;
  desc: string;
  external?: boolean;
}) {
  if (external) {
    return (
      <a
        href={href}
        target={href.startsWith('mailto:') ? undefined : '_blank'}
        rel={href.startsWith('mailto:') ? undefined : 'noreferrer'}
        className="group flex items-center justify-between rounded-xl border border-[#EBEBEB] bg-white p-4 transition-colors hover:border-[#FF5400]/30"
      >
        <div className="flex items-start gap-3">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#FF5400]" />
          <div>
            <p className="text-[13px] font-semibold text-[#0F1419]">{title}</p>
            <p className="mt-0.5 text-[11px] text-[#525252]">{desc}</p>
          </div>
        </div>
        <ArrowUpRight className="h-4 w-4 text-[#8A8A8A] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#FF5400]" />
      </a>
    );
  }
  return (
    <Link
      href={href}
      className="group flex items-center justify-between rounded-xl border border-[#EBEBEB] bg-white p-4 transition-colors hover:border-[#FF5400]/30"
    >
      <div className="flex items-start gap-3">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-[#FF5400]" />
        <div>
          <p className="text-[13px] font-semibold text-[#0F1419]">{title}</p>
          <p className="mt-0.5 text-[11px] text-[#525252]">{desc}</p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-[#8A8A8A] transition-transform group-hover:translate-x-0.5 group-hover:text-[#FF5400]" />
    </Link>
  );
}

function ContactCard({
  icon: Icon,
  title,
  email,
  desc,
}: {
  icon: React.ElementType;
  title: string;
  email: string;
  desc: string;
}) {
  return (
    <a
      href={`mailto:${email}`}
      className="group flex items-start gap-4 rounded-2xl border border-[#EBEBEB] bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-[#FF5400]/30"
    >
      <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF8F2]">
        <Icon className="h-5 w-5 text-[#FF5400]" />
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">{title}</p>
        <p className="mt-1 text-[14px] font-semibold text-[#0F1419] group-hover:text-[#FF5400]">{email}</p>
        <p className="mt-1 text-[12px] text-[#525252]">{desc}</p>
      </div>
    </a>
  );
}
