import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Briefcase,
  Coins,
  MessageSquare,
  Key,
  Building2,
  Sparkles,
  Code2,
  Webhook,
  Zap,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Entegrasyonlar · UpCore',
  description:
    'UpCore 40+ entegrasyon: Kariyer.net, LinkedIn, SAP SuccessFactors, Oracle HCM, Logo, Paraşüt, Microsoft Teams, Slack, Google Workspace, Microsoft Entra, Stripe, DocuSign, Daily.co, Azure OpenAI.',
};

interface Integration {
  name: string;
  slug?: string;
  color?: string;
  status: 'live' | 'beta' | 'planned';
  category: IntegrationCategory;
  desc: string;
  setup?: string;
}

type IntegrationCategory =
  | 'Auth & SSO'
  | 'İşe Alım (ATS)'
  | 'Bordro & ERP'
  | 'Ödeme'
  | 'E-imza & Belge'
  | 'İletişim'
  | 'Video & Mülakat'
  | 'HRIS'
  | 'Analytics & BI'
  | 'Kamu'
  | 'AI & ML'
  | 'Otomasyon';

const INTEGRATIONS: Integration[] = [
  // Auth & SSO
  { name: 'Clerk', slug: 'clerk', color: '6C47FF', status: 'live', category: 'Auth & SSO', desc: 'Modern auth — OAuth + MFA + organizations + RBAC.', setup: '5 dk' },
  { name: 'Microsoft Entra (AAD)', slug: 'microsoft', color: '0078D4', status: 'live', category: 'Auth & SSO', desc: 'Enterprise SSO + SCIM provisioning · SAML 2.0 · OIDC.', setup: '30 dk' },
  { name: 'Okta', slug: 'okta', color: '007DC1', status: 'live', category: 'Auth & SSO', desc: 'Workforce Identity · SCIM + SAML + advanced policies.', setup: '30 dk' },
  { name: 'Google Workspace', slug: 'google', color: '4285F4', status: 'live', category: 'Auth & SSO', desc: 'OAuth SSO + Workspace kullanıcı senkronizasyonu.', setup: '10 dk' },

  // ATS
  { name: 'Kariyer.net', status: 'live', category: 'İşe Alım (ATS)', desc: 'XML feed ile günlük başvuru senkronizasyonu · aday havuzu import.', setup: '1 saat' },
  { name: 'LinkedIn Jobs', slug: 'linkedin', color: '0A66C2', status: 'live', category: 'İşe Alım (ATS)', desc: 'LinkedIn Partner API — ilan yayını + başvuru toplama + lead gen forms.', setup: '2 saat' },
  { name: 'Indeed', status: 'beta', category: 'İşe Alım (ATS)', desc: 'Indeed Apply + XML feed sync.', setup: '1 saat' },
  { name: 'Yenibiris.com', status: 'live', category: 'İşe Alım (ATS)', desc: 'Türkiye kariyer portalı · XML feed.', setup: '1 saat' },
  { name: 'Secretcv.com', status: 'planned', category: 'İşe Alım (ATS)', desc: '2026 Q3 · aday sourcing entegrasyonu.' },

  // Bordro & ERP
  { name: 'Logo Tiger 3', status: 'live', category: 'Bordro & ERP', desc: 'Bordro veri aktarımı · puantaj dışa veri çekme · 2 yönlü sync.', setup: '2 gün' },
  { name: 'Logo Netsis', status: 'live', category: 'Bordro & ERP', desc: 'ERP personel master senkronizasyonu · muhasebe entegrasyonu.', setup: '2 gün' },
  { name: 'Paraşüt', status: 'live', category: 'Bordro & ERP', desc: 'Çalışan CSV import/export · aylık SGK bildirge.', setup: '1 gün' },
  { name: 'Mikro Jet', status: 'beta', category: 'Bordro & ERP', desc: 'KOBİ bordro + ön muhasebe.', setup: '1 gün' },
  { name: 'Zirve Bordro', status: 'beta', category: 'Bordro & ERP', desc: 'Zirve yazılım ailesi · CSV + API.', setup: '1 gün' },
  { name: 'BordroCep', status: 'planned', category: 'Bordro & ERP', desc: '2026 Q3 · pilot müşteri arıyoruz.' },

  // HRIS
  { name: 'SAP SuccessFactors', status: 'live', category: 'HRIS', desc: 'Çift yönlü employee master sync + risk skor geri yazma + OData API.', setup: '1 hafta' },
  { name: 'SAP HR (On-Prem)', status: 'beta', category: 'HRIS', desc: 'RFC/BAPI tabanlı personel master senkronizasyonu.', setup: '2 hafta' },
  { name: 'Oracle HCM Cloud', status: 'beta', category: 'HRIS', desc: 'REST API + HCM Extracts · migration için hazır.', setup: '1 hafta' },
  { name: 'Workday', status: 'beta', category: 'HRIS', desc: 'Workday REST + RAAS reports · enterprise migration.', setup: '2 hafta' },
  { name: 'BambooHR', status: 'live', category: 'HRIS', desc: 'REST API · KOBİ-orta ölçek geçiş için hazır.', setup: '1 gün' },

  // Ödeme
  { name: 'Stripe', slug: 'stripe', color: '635BFF', status: 'live', category: 'Ödeme', desc: 'Abonelik yönetimi · otomatik fatura · Tax stack.', setup: '5 dk' },
  { name: 'İyzico', status: 'live', category: 'Ödeme', desc: 'Türkiye yerel ödeme · 3D secure · taksit.', setup: '30 dk' },
  { name: 'PayTR', status: 'beta', category: 'Ödeme', desc: 'Türkiye alternatif ödeme ağı.', setup: '30 dk' },
  { name: 'Paddle', status: 'beta', category: 'Ödeme', desc: 'Merchant-of-record · global KDV işleme.', setup: '1 saat' },

  // E-imza
  { name: 'DocuSign', slug: 'docusign', color: 'CC9933', status: 'live', category: 'E-imza & Belge', desc: 'Sözleşme e-imza · webhook ile statü güncellemesi.', setup: '30 dk' },
  { name: 'e-İmza (Kamu SM)', status: 'live', category: 'E-imza & Belge', desc: 'Türkiye nitelikli e-imza · Kamu SM uyumlu.', setup: '1 gün' },
  { name: 'PDF Generator', status: 'live', category: 'E-imza & Belge', desc: 'Özlük + sözleşme + bordro PDF şablonları.' },

  // İletişim
  { name: 'Slack', slug: 'slack', color: '4A154B', status: 'live', category: 'İletişim', desc: 'Action Center bildirimleri + haftalık recap + komutlar.', setup: '10 dk' },
  { name: 'Microsoft Teams', slug: 'microsoftteams', color: '6264A7', status: 'live', category: 'İletişim', desc: 'Pulse anket + müdahale bildirimleri + 1:1 koçluk rehberi.', setup: '10 dk' },
  { name: 'WhatsApp Business', status: 'beta', category: 'İletişim', desc: 'Aday iletişimi + pulse anket davetleri.', setup: '1 gün' },
  { name: 'Twilio', status: 'live', category: 'İletişim', desc: 'SMS OTP · transaksiyonel bildirimler.', setup: '30 dk' },
  { name: 'SendGrid', status: 'live', category: 'İletişim', desc: 'E-mail altyapısı · template + deliverability.', setup: '30 dk' },

  // Video
  { name: 'Zoom', slug: 'zoom', color: '2D8CFF', status: 'live', category: 'Video & Mülakat', desc: 'Mülakat odası · recording · transkript.', setup: '10 dk' },
  { name: 'Daily.co', status: 'live', category: 'Video & Mülakat', desc: 'Embedded video mülakat · AI transkript + özet.', setup: '10 dk' },
  { name: 'Google Meet', status: 'live', category: 'Video & Mülakat', desc: 'Workspace entegrasyonu · calendar otomasyonu.' },

  // Analytics
  { name: 'Tableau', status: 'beta', category: 'Analytics & BI', desc: 'Executive BI · özel dashboardlar için extract API.', setup: '1 gün' },
  { name: 'Power BI', status: 'beta', category: 'Analytics & BI', desc: 'Microsoft Fabric · DirectQuery + scheduled refresh.', setup: '1 gün' },
  { name: 'Metabase', status: 'live', category: 'Analytics & BI', desc: 'Open-source BI · tenant bazlı read-replica erişim.', setup: '30 dk' },
  { name: 'Looker', status: 'planned', category: 'Analytics & BI', desc: '2026 Q4 planlı.' },

  // Kamu
  { name: 'SGK e-Bildirge', status: 'live', category: 'Kamu', desc: 'Aylık prim bildirgesi otomatik XML · direkt yükleme veya muhasebeciye mail.', setup: '30 dk' },
  { name: 'GİB e-Beyanname', status: 'beta', category: 'Kamu', desc: 'Muhtasar + KDV · yıllık toplu beyan.', setup: '1 gün' },
  { name: 'MERNIS', status: 'live', category: 'Kamu', desc: 'TCKN doğrulama · aday + çalışan kayıt kontrol.', setup: '10 dk' },
  { name: 'e-Devlet', status: 'planned', category: 'Kamu', desc: '2026 Q2 belediye pilotu için planlı.' },
  { name: 'VERBIS', status: 'live', category: 'Kamu', desc: 'KVKK kayıt sistemi · otomatik veri envanteri.' },

  // AI
  { name: 'Azure OpenAI', status: 'live', category: 'AI & ML', desc: 'Müdahale öneri açıklamaları + mülakat soruları · GDPR uyumlu veri residency.', setup: '30 dk' },
  { name: 'Anthropic Claude', status: 'live', category: 'AI & ML', desc: 'Uzun döküman özeti · CV parsing + insight üretimi.', setup: '10 dk' },
  { name: 'OpenAI', status: 'live', category: 'AI & ML', desc: 'Standard ChatGPT API · aday iletişim taslakları.', setup: '10 dk' },

  // Otomasyon
  { name: 'Zapier', slug: 'zapier', color: 'FF4A00', status: 'live', category: 'Otomasyon', desc: '5.000+ uygulama · no-code workflow.', setup: '5 dk' },
  { name: 'Make (Integromat)', status: 'live', category: 'Otomasyon', desc: 'Görsel flow editörü · webhook routing.', setup: '5 dk' },
  { name: 'n8n', status: 'beta', category: 'Otomasyon', desc: 'Self-hosted otomasyon · enterprise tercih.', setup: '1 gün' },
];

const STATUS_LABEL = { live: 'Canlı', beta: 'Beta', planned: 'Planlandı' } as const;
const STATUS_COLOR = {
  live: { bg: '#DCFCE7', text: '#059669', dot: '#10B981' },
  beta: { bg: '#FEF3C7', text: '#D97706', dot: '#F59E0B' },
  planned: { bg: '#F3F4F6', text: '#525252', dot: '#8A8A8A' },
} as const;

const CATEGORY_ICONS: Record<IntegrationCategory, typeof Briefcase> = {
  'Auth & SSO': Key,
  'İşe Alım (ATS)': Briefcase,
  'Bordro & ERP': Coins,
  'Ödeme': Coins,
  'E-imza & Belge': ShieldCheck,
  'İletişim': MessageSquare,
  'Video & Mülakat': Zap,
  'HRIS': Building2,
  'Analytics & BI': Sparkles,
  'Kamu': Building2,
  'AI & ML': Sparkles,
  'Otomasyon': Zap,
};

export default function EntegrasyonlarPage() {
  const grouped = INTEGRATIONS.reduce<Record<IntegrationCategory, Integration[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {} as Record<IntegrationCategory, Integration[]>);

  const total = INTEGRATIONS.length;
  const live = INTEGRATIONS.filter((i) => i.status === 'live').length;
  const beta = INTEGRATIONS.filter((i) => i.status === 'beta').length;
  const planned = INTEGRATIONS.filter((i) => i.status === 'planned').length;

  return (
    <div className="bg-white text-[#0F1419]">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-[#E5E7EB] bg-white">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: 'linear-gradient(0deg, #000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative mx-auto max-w-[1200px] px-6 pt-20 pb-16 md:pt-24">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2.5 border border-[#E5E7EB] bg-white px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#4B5563]">
              <Webhook className="h-3 w-3 text-[#FF5400]" strokeWidth={1.5} />
              UpCore · Entegrasyon Kataloğu · {total} Sistem
            </div>
            <h1 className="font-display text-[40px] font-semibold leading-[1.08] tracking-[-0.02em] text-[#0F1419] md:text-[56px]">
              Kurumsal sistem entegrasyonları
            </h1>
            <p className="mt-6 max-w-[640px] text-[15.5px] leading-[1.65] text-[#4B5563]">
              UpCore Platformu; SAP SuccessFactors, Oracle HCM, Workday, Logo, Netsis, Paraşüt, Kariyer.net, LinkedIn, Microsoft Entra başta olmak üzere {total}&apos;den fazla kurumsal sistem ile yerleşik entegrasyon sunar. Özel sistemler için REST API, webhook ve OpenAPI 3.1 spesifikasyonu kullanılır.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-[#E5E7EB] md:grid-cols-4" style={{ backgroundColor: '#E5E7EB' }}>
            <StatCard code="S.01" value={String(total)} label="Toplam Entegrasyon" />
            <StatCard code="S.02" value={String(live)} label="Üretim Ortamında" accent="#059669" />
            <StatCard code="S.03" value={String(beta)} label="Beta / Pilot" accent="#D97706" />
            <StatCard code="S.04" value={String(planned)} label="Roadmap" accent="#6B7280" />
          </div>
        </div>
      </section>

      {/* Category grid */}
      <section className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
          <div className="mb-12 max-w-3xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="h-px w-10 bg-[#FF5400]" />
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#374151]">
                Kategori Dizini
              </p>
            </div>
            <h2 className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] md:text-[40px]">
              12 fonksiyonel kategori · tam liste
            </h2>
            <p className="mt-5 max-w-[680px] text-[14px] leading-[1.65] text-[#4B5563]">
              Kurulum süreleri; kurumsal SSO ve ERP senkronizasyonu gibi derin entegrasyonlarda gün veya hafta, modern SaaS servislerinde dakika mertebesindedir. Liste gerçek müşteri implementasyonlarından elde edilmiştir.
            </p>
          </div>

          <div className="space-y-14">
            {Object.entries(grouped).map(([category, items]) => {
              const Icon = CATEGORY_ICONS[category as IntegrationCategory];
              const catIdx = Object.keys(grouped).indexOf(category);
              return (
                <div key={category}>
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center border border-[#E5E7EB] bg-white">
                      <Icon className="h-3.5 w-3.5 text-[#374151]" strokeWidth={1.5} />
                    </div>
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                      CAT.{String(catIdx + 1).padStart(2, '0')}
                    </span>
                    <h3 className="font-display text-[17px] font-semibold tracking-tight text-[#0F1419]">{category}</h3>
                    <span className="font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-[#6B7280]">· {items.length} sistem</span>
                  </div>
                  <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-[#E5E7EB] md:grid-cols-2 lg:grid-cols-3" style={{ backgroundColor: '#E5E7EB' }}>
                    {items.map((i) => (
                      <article
                        key={i.name}
                        className="group flex flex-col gap-3 bg-white p-5 transition-colors hover:bg-[#F9FAFB]"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {i.slug && i.color ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={`https://api.iconify.design/simple-icons/${i.slug}.svg?color=%23${i.color}`}
                                alt={i.name}
                                width={20}
                                height={20}
                                loading="lazy"
                                className="h-5 w-5"
                              />
                            ) : (
                              <div className="flex h-5 w-5 items-center justify-center border border-[#E5E7EB] bg-[#F9FAFB] font-mono text-[9px] font-bold text-[#4B5563]">
                                {i.name.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            <h4 className="font-display text-[13.5px] font-semibold tracking-tight text-[#0F1419]">{i.name}</h4>
                          </div>
                          <span
                            className="inline-flex items-center gap-1 border px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em]"
                            style={{ borderColor: STATUS_COLOR[i.status].dot + '30', color: STATUS_COLOR[i.status].text, backgroundColor: STATUS_COLOR[i.status].dot + '10' }}
                          >
                            <span className="h-1 w-1 rounded-sm" style={{ backgroundColor: STATUS_COLOR[i.status].dot }} />
                            {STATUS_LABEL[i.status]}
                          </span>
                        </div>
                        <p className="text-[12px] leading-[1.6] text-[#4B5563]">{i.desc}</p>
                        {i.setup && (
                          <div className="mt-auto flex items-center gap-1.5 border-t border-[#F3F4F6] pt-3 font-mono text-[10px] text-[#6B7280]">
                            <Clock className="h-3 w-3" strokeWidth={1.5} />
                            <span className="uppercase tracking-[0.08em]">Kurulum:</span>
                            <span className="font-semibold text-[#374151]">{i.setup}</span>
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* API + webhook */}
      <section className="border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr]">
            <div>
              <div className="mb-4 flex items-center gap-3">
                <span className="h-px w-10 bg-[#FF5400]" />
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#374151]">
                  Geliştirici Arayüzü
                </p>
              </div>
              <h2 className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] md:text-[40px]">
                REST API + Webhook + OpenAPI 3.1
              </h2>
              <p className="mt-5 text-[14px] leading-[1.65] text-[#4B5563]">
                Listede bulunmayan sistemler için UpCore Geliştirici Platformu; OpenAPI 3.1 spesifikasyonu, Postman koleksiyonu, HMAC imzalı webhook ve rate-limit başlıkları ile standart kurumsal entegrasyon arayüzü sunar.
              </p>
              <div className="mt-6 overflow-hidden rounded-md border border-[#E5E7EB] divide-y divide-[#E5E7EB]">
                <ApiFeature code="API.01" icon={Code2} title="OpenAPI 3.1 Spesifikasyonu" desc="Swagger UI + ReDoc · tek sayfa API referansı" />
                <ApiFeature code="API.02" icon={Webhook} title="İmzalı Webhook" desc="HMAC-SHA256 · at-least-once delivery · retry policy" />
                <ApiFeature code="API.03" icon={ShieldCheck} title="OAuth 2.0 + API Anahtar" desc="Rol-bazlı scope · token rotasyonu · audit log" />
                <ApiFeature code="API.04" icon={Clock} title="Rate Limit" desc="Kiracı başına 1000 req/dk · X-RateLimit-* başlıkları" />
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                <a
                  href="https://api.upcore.io/docs"
                  target="_blank"
                  rel="noopener"
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-[#0F1419] px-5 text-[12.5px] font-semibold text-white transition-colors hover:bg-[#FF5400]"
                >
                  API Dokümantasyonu
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
                <a
                  href="mailto:developers@upcore.io"
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-[#D1D5DB] bg-white px-5 text-[12.5px] font-semibold text-[#0F1419] transition-colors hover:border-[#0F1419]"
                >
                  developers@upcore.io
                </a>
              </div>
            </div>

            <div className="overflow-hidden rounded-md border border-[#0F1419] bg-[#0F1419] p-6 font-mono text-[12px] leading-relaxed text-[#CBD5E1]">
              <div className="mb-4 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
                  <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
                  <span className="h-3 w-3 rounded-full bg-[#28C840]" />
                </div>
                <span className="ml-2 text-[11px] text-[#64748B]">POST /v1/webhooks · signed</span>
              </div>
              <pre className="overflow-x-auto">
                <span className="text-[#94A3B8]"># Webhook: employee.onboarded</span>
{`
POST `}<span className="text-[#10B981]">https://your-app.io/hooks/upcore</span>{`
X-UpCore-Event: `}<span className="text-[#FBBF24]">employee.onboarded</span>{`
X-UpCore-Signature: `}<span className="text-[#A78BFA]">t=1713...,v1=a4bf...</span>{`

{
  "`}<span className="text-[#60A5FA]">event</span>{`": "`}<span className="text-[#FBBF24]">employee.onboarded</span>{`",
  "`}<span className="text-[#60A5FA]">tenant</span>{`": "`}<span className="text-[#FBBF24]">acme-corp</span>{`",
  "`}<span className="text-[#60A5FA]">data</span>{`": {
    "`}<span className="text-[#60A5FA]">employee_id</span>{`": "`}<span className="text-[#FBBF24]">emp_01HQ...</span>{`",
    "`}<span className="text-[#60A5FA]">start_date</span>{`": "`}<span className="text-[#FBBF24]">2026-05-01</span>{`",
    "`}<span className="text-[#60A5FA]">department</span>{`": "`}<span className="text-[#FBBF24]">Mühendislik</span>{`",
    "`}<span className="text-[#60A5FA]">contract_type</span>{`": "`}<span className="text-[#FBBF24]">4857</span>{`"
  },
  "`}<span className="text-[#60A5FA]">timestamp</span>{`": `}<span className="text-[#FBBF24]">1714742400</span>{`
}`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Promise */}
      <section className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
        <div className="mx-auto max-w-[1200px] px-6 py-20 md:py-24">
          <div className="mb-12 max-w-3xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="h-px w-10 bg-[#FF5400]" />
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#374151]">
                Entegrasyon Taahhütleri
              </p>
            </div>
            <h2 className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] md:text-[40px]">Sözleşmesel güvenceler</h2>
          </div>
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-md border border-[#E5E7EB] md:grid-cols-3" style={{ backgroundColor: '#E5E7EB' }}>
            <PromiseCard code="P.01" icon={Clock} title="Yeni Entegrasyon SLA" desc="Talep edilen entegrasyonun beta ortamına alınma süresi 6 hafta · müşteri talepleri roadmap önceliklidir." />
            <PromiseCard code="P.02" icon={ShieldCheck} title="Veri Akış Şeffaflığı" desc="Her entegrasyonda; aktarılan alanlar, şifreleme yöntemi ve saklama süresi için ayrı veri akış diyagramı belgelenir." />
            <PromiseCard code="P.03" icon={CheckCircle2} title="Çıkış Kolaylığı" desc="Entegrasyon sonlandırıldığında kaynak sistem verileri 30 gün içinde silinir · veri sahipliği %100 müşteriye aittir." />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[#0F1419]">
        <div className="mx-auto max-w-[1200px] px-6 py-20">
          <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div>
              <div className="mb-5 flex items-center gap-3">
                <span className="h-px w-10 bg-[#FF5400]" />
                <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[#FF5400]">
                  Özel Entegrasyon Talebi
                </p>
              </div>
              <h2 className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] text-white md:text-[40px]">
                Listede olmayan sistemler için
              </h2>
              <p className="mt-5 max-w-[520px] text-[14px] leading-[1.65] text-white/65">
                Kurumsal özel sistem veya Türkiye&apos;ye özgü iş yazılımı için entegrasyon talep edebilirsiniz. 6 hafta içinde beta ortamına alınır, müşteri onayı sonrası üretime geçilir.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                <Link href="/demo" className="inline-flex h-10 items-center gap-2 rounded-md bg-[#FF5400] px-5 text-[12.5px] font-semibold text-white transition-colors hover:bg-white hover:text-[#0F1419]">
                  Demo Talep Et
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <a
                  href="mailto:developers@upcore.io?subject=Yeni%20entegrasyon%20talebi"
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-white/20 bg-transparent px-5 text-[12.5px] font-semibold text-white transition-colors hover:border-white"
                >
                  Entegrasyon Talebi
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
            <div className="border border-white/10 p-6">
              <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#FF5400]">
                Geliştirici Kaynakları
              </p>
              <dl className="mt-5 divide-y divide-white/10 text-[12px]">
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-white/50">API Standardı</dt>
                  <dd className="font-mono font-semibold text-white">OpenAPI 3.1</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-white/50">Auth</dt>
                  <dd className="font-mono font-semibold text-white">OAuth 2.0 + API Key</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-white/50">Webhook</dt>
                  <dd className="font-mono font-semibold text-white">HMAC-SHA256</dd>
                </div>
                <div className="flex items-center justify-between py-2.5">
                  <dt className="text-white/50">Rate Limit</dt>
                  <dd className="font-mono font-semibold text-white">1000 req/dk</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ code, value, label, accent }: { code: string; value: string; label: string; accent?: string }) {
  return (
    <div className="bg-white p-6">
      <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">{code}</span>
      <div
        className="mt-3 font-display text-[32px] font-semibold leading-none tracking-[-0.015em]"
        style={{ color: accent ?? '#0F1419' }}
      >
        {value}
      </div>
      <p className="mt-3 font-mono text-[10px] font-medium uppercase tracking-[0.08em] text-[#6B7280]">{label}</p>
    </div>
  );
}

function ApiFeature({ code, icon: Icon, title, desc }: { code: string; icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-4 bg-white p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-[#E5E7EB] bg-[#F9FAFB]">
        <Icon className="h-3.5 w-3.5 text-[#374151]" strokeWidth={1.5} />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-[13.5px] font-semibold tracking-tight text-[#0F1419]">{title}</h3>
          <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">{code}</span>
        </div>
        <p className="mt-1.5 text-[12px] leading-[1.6] text-[#4B5563]">{desc}</p>
      </div>
    </div>
  );
}

function PromiseCard({ code, icon: Icon, title, desc }: { code: string; icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="bg-white p-7">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex h-8 w-8 items-center justify-center border border-[#E5E7EB] bg-[#F9FAFB]">
          <Icon className="h-3.5 w-3.5 text-[#374151]" strokeWidth={1.5} />
        </div>
        <span className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">{code}</span>
      </div>
      <h3 className="font-display text-[15.5px] font-semibold tracking-tight text-[#0F1419]">{title}</h3>
      <p className="mt-2 text-[12.5px] leading-[1.65] text-[#4B5563]">{desc}</p>
    </div>
  );
}
