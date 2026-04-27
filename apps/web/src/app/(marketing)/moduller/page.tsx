import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight, Users, HeartPulse, Sparkles, Compass, Shield, BarChart3, CheckCircle2,
  Clock, LineChart, GraduationCap, Building2, Briefcase, FileText,
  Layers, FileCheck2, Database, TrendingUp,
} from 'lucide-react';

export const metadata: Metadata = {
  title: '17 Modül · UpCore',
  description: 'UpCore\'un 17 entegre İK modülü: işe alım, onboarding, tükenmişlik ölçümü, performans, bordro, kariyer, KVKK. Bilimsel temel + enterprise güvenlik.',
};

const CATEGORIES = [
  {
    label: 'Yaşam Döngüsü',
    desc: 'Aday başvurusundan emekliliğe bütün çalışan yolculuğu',
    color: '#FF5400',
    modules: [
      { icon: Briefcase, title: 'İşe Alım (ATS)', href: '#ats',
        summary: 'Pozisyon açma → CV toplama → psikometrik değerlendirme → teklif → e-imza.',
        features: ['Kariyer.net + LinkedIn entegrasyonu', 'CV parsing (PDF/DOCX) + AI özet', 'Kanban pipeline + SLA takibi',
          'Daily.co video mülakat + kayıt', 'Bulk psikometrik pre-screen', 'Offer letter DocuSign e-imza', 'Referans kontrolü + arka plan']
      },
      { icon: Sparkles, title: 'Onboarding', href: '#onboarding',
        summary: 'İlk gün checklist\'ten 90 gün değerlendirmeye rehberli, ölçümlü süreç.',
        features: ['Task template\'leri (ekipman, eğitim, yetki)', 'Mentor eşleştirme + 1-1 takvim', '30/60/90 gün pulse anketi',
          'Progress dashboard yöneticiye', 'Buddy system + Slack bot', 'Dijital özlük dosyası', 'Yasal form otomatik doldurma']
      },
      { icon: Users, title: 'Çalışan Yönetimi', href: '#employees',
        summary: 'Özlük dosyası, sözleşme, atamalar, organizasyon şeması tek kaynakta.',
        features: ['Full-time / part-time / 4B / 657', 'TCKN pgcrypto şifreleme', 'Sözleşme tarihçe versiyonlama',
          'Aile ve acil iletişim kişileri', 'Asgari ücret istisnası otomasyonu', 'Fotoğraf + evrak blob storage', 'GDPR/KVKK silme flow']
      },
      { icon: Building2, title: 'Organizasyon', href: '#org',
        summary: 'Departman hiyerarşisi, pozisyon tanımları, matrix reporting lines.',
        features: ['Sürükle-bırak organizasyon şeması', 'Pozisyon + kadro + derece/kademe', 'Matrix manager ilişkileri',
          'Vekalet ve geçici atama', 'Headcount planlaması + bütçe', 'Sürüm karşılaştırma', 'Org chart PDF/SVG export']
      },
    ]
  },
  {
    label: 'Bilimsel Ölçüm',
    desc: 'JD-R + BAT-TR + UWES + COPSOQ III + UpCap-TR psikometrik entegrasyon',
    color: '#10B981',
    modules: [
      { icon: HeartPulse, title: 'Tükenmişlik (BAT-TR)', href: '#burnout',
        summary: '2 haftada bir BAT-12-TR pulse, departman heatmap, ML erken uyarı.',
        features: ['BAT-12-TR Türk standardizasyonu', '5 alt ölçek: exhaustion/cynicism/cognitive/emotional/complaints',
          'Anonim mod + bireysel mod', 'Departman bucket (min 5 kişi)', 'ML risk tahmini 90 gün öncesinden',
          'Trend grafikleri 12 aylık', 'Intervention öneri motoru']
      },
      { icon: BarChart3, title: 'Performans', href: '#performance',
        summary: '360° review, OKR çerçevesi, nine-box kalibrasyon, manager feedback.',
        features: ['Yıllık + çeyreklik review döngüsü', 'OKR → anahtar sonuç → checkpoint',
          'Peer + self + manager + skip-level', 'Nine-box (performans × potansiyel)', 'Kalibrasyon oturumu + rubric',
          'Feedback template kütüphanesi', 'Performans artırım → maaş önerisi']
      },
      { icon: Compass, title: 'Kariyer & Mobilite', href: '#career',
        summary: 'İç ilan (internal marketplace), succession plan, rotation, kariyer yolu.',
        features: ['Kariyer yolu tasarım aracı', 'Succession nine-box', 'İç ilan marketplace',
          'Rotation program yönetimi', 'Skill gap analizi', 'Kariyer hedefi + mentor eşleştirme',
          'Uluslararası mobility + visa takibi']
      },
      { icon: LineChart, title: 'Analitik & Tahmin', href: '#analytics',
        summary: 'Executive dashboard, turnover forecasting, departman benchmark, ML.',
        features: ['CHRO executive dashboard', 'Turnover tahmini (6 ay)', 'Compensation benchmarking',
          'Departman verimlilik skorları', 'Grafana dashboard embed', 'PDF + Excel + PowerPoint export',
          'Anomali tespiti + uyarı']
      },
    ]
  },
  {
    label: 'Operasyon',
    desc: 'Günlük İK + finans işlemleri: izin, mesai, bordro, SGK',
    color: '#F59E0B',
    modules: [
      { icon: Clock, title: 'İzin & Mesai', href: '#leave',
        summary: 'Yıllık/hastalık/mazeret izni onay akışı + vardiya + fazla mesai.',
        features: ['İzin tipleri konfigüre edilebilir', 'Onay hiyerarşisi (manager → HR → CEO)',
          'Overlap detection (ekip çakışması)', 'Shift template + vardiya çizelgesi',
          'Fazla mesai hesap + SGK uyum', 'İzin bakiyesi otomatik hesap', 'Mobil bildirim + e-onay']
      },
      { icon: FileText, title: 'Bordro', href: '#payroll',
        summary: 'Maaş hesabı, SGK e-Bildirge, muhtasar, muhasebe-i umumiye, banka.',
        features: ['657 kamu + 4857 özel + 4B sözleşmeli', 'Asgari ücret, 5510 teşvikleri otomatik',
          'Kıdem + ihbar tazminatı hesabı', 'SGK e-Bildirge XML üretimi', 'Muhtasar beyanname',
          'Banka toplu transfer (Garanti, İş, ING...)', 'Bordro zarfı PDF + e-imza']
      },
      { icon: GraduationCap, title: 'Eğitim & LMS', href: '#training',
        summary: 'Kurs kataloğu, enrollment, sertifika, skill matrix, yetkinlik çerçevesi.',
        features: ['Kurs tanımı + kredi + geçerlilik', 'Skill matrix + yetkinlik haritası',
          'Enrollment + onay akışı', 'Otomatik sertifika (UPC-CERT-YYYY-NNNNN)',
          'ISO eğitim uyum takibi (iş sağlığı, KVKK)', 'Eğitim bütçesi + maliyet raporu',
          'Kariyer yolu ile entegre zorunlu kurslar']
      },
      { icon: Database, title: 'Belgeler & E-imza', href: '#documents',
        summary: 'Sözleşme, bordro zarfı, kimlik fotokopisi, ISO evrakları, imzalı arşiv.',
        features: ['Azure Blob AES-256 şifreli depolama', 'ClamAV virus tarama upload\'ta',
          'DocuSign e-imza workflow', 'Belge kategorisi + retention policy',
          'KVKK silme talebi → tüm belgelerde', 'Versiyonlama + audit log',
          'Arama: full-text + OCR (Tesseract)']
      },
    ]
  },
  {
    label: 'Uyum & Güvenlik',
    desc: 'KVKK + ISO 27001 + SOC 2 uyum + audit + SSO',
    color: '#5E5CE6',
    modules: [
      { icon: Shield, title: 'KVKK & Veri Yönetimi', href: '#kvkk',
        summary: 'Veri envanteri, DPIA, silme/aktarma talepleri, audit log, veri sahibi portalı.',
        features: ['VERBIS kayıt şablonu', 'DPIA (BAT-TR + psikometrik için)', 'KVKK 11 portalı (silme/aktarma)',
          'Veri işleyen sözleşmesi (DPA) şablonu', 'Audit log 7 yıl immutable (WORM)',
          '72 saat ihlal bildirim SLA', 'Quarterly access review']
      },
      { icon: Layers, title: 'Güvenlik & SSO', href: '#security',
        summary: 'SAML 2.0, Multi-tenant RLS, RBAC, MFA zorunlu, API key yönetimi.',
        features: ['SAML 2.0 / OIDC SSO', 'Azure AD / Okta / Google Workspace', 'MFA zorunlu (TOTP / WebAuthn)',
          'RBAC: 20+ önceden tanımlı rol', 'Multi-tenant Row-Level Security', 'API key + webhook HMAC imza',
          'Tüm erişim audit log\'a düşer']
      },
      { icon: FileCheck2, title: 'Workflow & Saga', href: '#workflow',
        summary: 'Özel iş akışları, onay hiyerarşileri, saga orchestrator (event-driven).',
        features: ['No-code workflow builder', 'Onay zinciri (sıralı / paralel)', 'Timer + webhook + email trigger',
          'Saga orchestrator (cross-service)', 'Kompanse edilebilir işlemler', 'Dead letter queue + replay',
          'Çalışan self-service form template\'leri']
      },
      { icon: TrendingUp, title: 'Raporlama & Export', href: '#reports',
        summary: 'KVKK uyumlu export, Excel/PDF, Grafana embed, custom SQL query builder.',
        features: ['200+ hazır rapor şablonu', 'Custom query builder (no-SQL)',
          'Scheduled export (email/SFTP)', 'Grafana dashboard gömme', 'KPI widget kütüphanesi',
          'Maaş bordrosu PDF bulk', 'Denetim için snapshot export']
      },
    ]
  },
];

export default function ModulesPage() {
  return (
    <div className="bg-white text-[#0F1419]">
      <section className="relative overflow-hidden border-b border-[#F0F0F0]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,84,0,0.06),transparent_60%)]" />
        <div className="relative mx-auto max-w-[1280px] px-6 pt-24 pb-16 md:pt-32">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.25em] text-[#FF5400]">Modüller</p>
            <h1 className="font-display text-[44px] font-semibold leading-[1.1] tracking-[-0.03em] md:text-[64px]">
              17 modül.<br />Tek platform. Tek gerçek.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-[1.6] text-[#525252]">
              UpCore&apos;un her modülü aynı çalışan kimliğini, aynı organizasyon yapısını, aynı yetki modelini paylaşır.
              Entegrasyon bir &quot;kutu&quot; değil, tek bir sistem.
            </p>
            <div className="mt-8 inline-flex flex-wrap items-center justify-center gap-2 text-[11px] font-medium text-[#8A8A8A]">
              {CATEGORIES.map((c) => (
                <span key={c.label} className="inline-flex items-center gap-1.5 rounded-full border border-[#E8E8E8] bg-white px-3 py-1">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {CATEGORIES.map((cat) => (
        <section key={cat.label} className="border-b border-[#F0F0F0]">
          <div className="mx-auto max-w-[1280px] px-6 py-20 md:py-28">
            <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.25em]" style={{ color: cat.color }}>
                  {cat.label}
                </p>
                <h2 className="font-display text-[32px] font-semibold leading-tight tracking-[-0.025em] md:text-[44px]">
                  {cat.desc}
                </h2>
              </div>
              <span className="rounded-full border border-[#E8E8E8] px-4 py-1.5 text-[11px] font-medium text-[#525252]">
                {cat.modules.length} modül
              </span>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {cat.modules.map((m) => (
                <div
                  key={m.title}
                  id={m.href.slice(1)}
                  className="group rounded-2xl border border-[#EBEBEB] bg-white p-8 transition-all hover:border-[#0F1419] hover:shadow-[0_20px_50px_-20px_rgba(0,0,0,0.1)]"
                >
                  <div className="flex items-start gap-5">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${cat.color}15`, color: cat.color }}
                    >
                      <m.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-display text-[22px] font-semibold tracking-tight text-[#0F1419]">{m.title}</h3>
                      <p className="mt-2 text-[14px] leading-relaxed text-[#525252]">{m.summary}</p>
                    </div>
                  </div>
                  <div className="mt-6 border-t border-[#F0F0F0] pt-6">
                    <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-[#8A8A8A]">Özellikler</p>
                    <ul className="grid grid-cols-1 gap-2">
                      {m.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-[13px] text-[#333]">
                          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: cat.color }} />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* CTA */}
      <section className="bg-[#FAFAFA]">
        <div className="mx-auto max-w-[1280px] px-6 py-20 text-center md:py-24">
          <h2 className="font-display text-[28px] font-semibold tracking-tight text-[#0F1419] md:text-[40px]">
            Hangi modüller sizin için? Birlikte karar verelim
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] text-[#525252]">
            45 dakikalık demo toplantısında ihtiyaçlarınızı konuşur, size en uygun modül kombinasyonunu öneririz.
          </p>
          <Link
            href="/demo"
            className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-[#0F1419] px-7 text-[14px] font-semibold text-white transition-all hover:bg-[#FF5400]"
          >
            Demo Talep Et <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
