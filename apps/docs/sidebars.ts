import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

/**
 * UpCore dokümantasyonu için hedef kitle bazlı sidebar yapısı.
 * 5 kitle: çalışan, yönetici, İK, admin, geliştirici.
 * 8 modül rehberi İK sidebar'ı altında modül-başı gruplanır.
 */
const sidebars: SidebarsConfig = {
  employeeSidebar: [
    { type: "doc", id: "calisan/giris", label: "Başlangıç" },
    {
      type: "category",
      label: "Hesabım",
      collapsed: false,
      items: [
        "calisan/hesap/ilk-giris",
        "calisan/hesap/profil-guncelleme",
        "calisan/hesap/sifre-mfa",
        "calisan/hesap/bildirim-tercihleri",
      ],
    },
    {
      type: "category",
      label: "Pulse anketleri",
      items: [
        "calisan/pulse/pulse-nedir",
        "calisan/pulse/pulse-cevaplama",
        "calisan/pulse/anonimlik-guvencesi",
      ],
    },
    {
      type: "category",
      label: "KVKK hakları",
      items: [
        "calisan/kvkk/madde-11-haklar",
        "calisan/kvkk/veri-indirme",
        "calisan/kvkk/silme-talebi",
      ],
    },
    { type: "doc", id: "calisan/sss", label: "Sıkça sorulanlar" },
  ],

  managerSidebar: [
    { type: "doc", id: "yonetici/giris", label: "Başlangıç" },
    {
      type: "category",
      label: "Ekip yönetimi",
      collapsed: false,
      items: [
        "yonetici/ekip/ekip-dashboard",
        "yonetici/ekip/bire-bir-gorusmeler",
        "yonetici/ekip/surekli-geri-bildirim",
      ],
    },
    {
      type: "category",
      label: "Pulse ve sinyaller",
      items: [
        "yonetici/pulse/ekip-pulse-yorumu",
        "yonetici/pulse/kirmizi-band-triage",
        "yonetici/pulse/mudahale-onayi",
      ],
    },
    {
      type: "category",
      label: "Performans",
      items: [
        "yonetici/performans/okr-belirleme",
        "yonetici/performans/360-feedback-verme",
        "yonetici/performans/9-kutu-kalibrasyon",
      ],
    },
  ],

  hrSidebar: [
    { type: "doc", id: "ik/giris", label: "Başlangıç" },
    {
      type: "category",
      label: "İlk 15 dakika",
      collapsed: false,
      items: [
        "ik/hizli-baslangic/ilk-15-dakika",
        "ik/hizli-baslangic/ilk-pulse-anketi",
        "ik/hizli-baslangic/ilk-mudahale",
        "ik/hizli-baslangic/yil-sonu-degerlendirme",
      ],
    },
    {
      type: "category",
      label: "Sürdürme modülü",
      items: [
        "ik/modul/surdurme/genel-bakis",
        "ik/modul/surdurme/pulse-kurulum",
        "ik/modul/surdurme/anket-guvenilirligi",
        "ik/modul/surdurme/heatmap-okuma",
        "ik/modul/surdurme/kirmizi-band-triage",
        "ik/modul/surdurme/soru-bankasi",
        "ik/modul/surdurme/jd-r-yorumu",
        "ik/modul/surdurme/bat-tr-skorlama",
        "ik/modul/surdurme/sablon-kutuphanesi",
        "ik/modul/surdurme/sikca-sorulanlar",
      ],
    },
    {
      type: "category",
      label: "Koruma modülü",
      items: [
        "ik/modul/koruma/genel-bakis",
        "ik/modul/koruma/mudahale-katalogu",
        "ik/modul/koruma/thompson-sampling",
        "ik/modul/koruma/consent-akisi",
        "ik/modul/koruma/plan-takibi",
        "ik/modul/koruma/etki-olcumu",
        "ik/modul/koruma/cohens-d-yorumu",
        "ik/modul/koruma/referral-network",
        "ik/modul/koruma/izleme-takvimi",
        "ik/modul/koruma/sikca-sorulanlar",
      ],
    },
    {
      type: "category",
      label: "Performans modülü",
      items: [
        "ik/modul/performans/genel-bakis",
        "ik/modul/performans/okr-kurulum",
        "ik/modul/performans/key-result-takibi",
        "ik/modul/performans/360-anket",
        "ik/modul/performans/360-soru-havuzu",
        "ik/modul/performans/9-kutu-kalibrasyon",
        "ik/modul/performans/pip-is-akisi",
        "ik/modul/performans/yil-sonu-degerlendirme",
        "ik/modul/performans/bonus-hesabi",
        "ik/modul/performans/sikca-sorulanlar",
      ],
    },
    {
      type: "category",
      label: "Mobility modülü",
      items: [
        "ik/modul/mobility/genel-bakis",
        "ik/modul/mobility/ic-ilan-marketplace",
        "ik/modul/mobility/succession-pool",
        "ik/modul/mobility/kariyer-yolu",
        "ik/modul/mobility/rotasyon-is-akisi",
        "ik/modul/mobility/ready-now-siniflandirma",
        "ik/modul/mobility/ayrilis-risk-tahmini",
        "ik/modul/mobility/9-kutu-entegrasyon",
        "ik/modul/mobility/maliyet-analizi",
        "ik/modul/mobility/sikca-sorulanlar",
      ],
    },
    {
      type: "category",
      label: "Geliştirme modülü",
      items: [
        "ik/modul/gelistirme/genel-bakis",
        "ik/modul/gelistirme/yetkinlik-modeli",
        "ik/modul/gelistirme/ogrenme-yolu",
        "ik/modul/gelistirme/sertifika-takibi",
        "ik/modul/gelistirme/koçluk-programi",
        "ik/modul/gelistirme/mentorluk",
        "ik/modul/gelistirme/ilk-kaynak-kutuphanesi",
        "ik/modul/gelistirme/butce-yonetimi",
        "ik/modul/gelistirme/etki-degerlendirme",
        "ik/modul/gelistirme/sikca-sorulanlar",
      ],
    },
    {
      type: "category",
      label: "İK Ops modülü",
      items: [
        "ik/modul/ik-ops/genel-bakis",
        "ik/modul/ik-ops/ozluk-dosyasi",
        "ik/modul/ik-ops/sozlesme-yonetimi",
        "ik/modul/ik-ops/izin-yonetimi",
        "ik/modul/ik-ops/bordro-hesaplama",
        "ik/modul/ik-ops/sgk-e-bildirge",
        "ik/modul/ik-ops/kiyafet-mesai",
        "ik/modul/ik-ops/kidem-tazminati",
        "ik/modul/ik-ops/is-kazasi-bildirim",
        "ik/modul/ik-ops/sikca-sorulanlar",
      ],
    },
    {
      type: "category",
      label: "Analitik modülü",
      items: [
        "ik/modul/analitik/genel-bakis",
        "ik/modul/analitik/executive-dashboard",
        "ik/modul/analitik/bias-denetimi",
        "ik/modul/analitik/roi-hesabi",
        "ik/modul/analitik/yillik-rapor",
        "ik/modul/analitik/departman-karsilastirma",
        "ik/modul/analitik/trend-analizi",
        "ik/modul/analitik/tahmin-modelleri",
        "ik/modul/analitik/ihracat-entegrasyon",
        "ik/modul/analitik/sikca-sorulanlar",
      ],
    },
    {
      type: "category",
      label: "KVKK / GRC modülü",
      link: { type: "doc", id: "ik/kvkk/giris" },
      items: [
        "ik/modul/kvkk/genel-bakis",
        "ik/modul/kvkk/madde-11-talep-yonetimi",
        "ik/modul/kvkk/verbis-kayit-sureci",
        "ik/modul/kvkk/aydınlatma-metni",
        "ik/modul/kvkk/acik-riza",
        "ik/modul/kvkk/dpia-sablon",
        "ik/modul/kvkk/ihlal-bildirim-72-saat",
        "ik/modul/kvkk/saklama-politikasi",
        "ik/modul/kvkk/yurtdisi-aktarim",
        "ik/modul/kvkk/sikca-sorulanlar",
      ],
    },
  ],

  adminSidebar: [
    { type: "doc", id: "admin/giris", label: "Başlangıç" },
    {
      type: "category",
      label: "Tenant kurulumu",
      collapsed: false,
      items: [
        "admin/tenant/yeni-tenant-olusturma",
        "admin/tenant/onboarding-wizard",
        "admin/tenant/csv-import",
        "admin/tenant/ilk-modul-secimi",
      ],
    },
    {
      type: "category",
      label: "Kimlik ve erişim",
      items: [
        "admin/iam/sso-saml",
        "admin/iam/sso-oidc",
        "admin/iam/scim-kullanici-senkron",
        "admin/iam/rbac-rol-yonetimi",
        "admin/iam/mfa-zorunlu-kilma",
      ],
    },
    {
      type: "category",
      label: "Billing ve abonelik",
      items: [
        "admin/billing/plan-secimi",
        "admin/billing/fatura-yonetimi",
        "admin/billing/kullanim-metrikleri",
        "admin/billing/seat-yonetimi",
      ],
    },
    {
      type: "category",
      label: "Operasyon",
      items: [
        "admin/operasyon/feature-flag",
        "admin/operasyon/webhook-konfigurasyon",
        "admin/operasyon/api-key-olusturma",
        "admin/operasyon/impersonation",
        "admin/operasyon/bulk-export",
        "admin/operasyon/audit-log-izleme",
      ],
    },
    {
      type: "category",
      label: "Uyum",
      items: [
        "admin/uyum/soc2-readiness",
        "admin/uyum/dpa-sablon",
        "admin/uyum/veri-ikametgahi",
        "admin/uyum/log-retansiyon",
      ],
    },
  ],

  developerSidebar: [
    { type: "doc", id: "developer/giris", label: "Başlangıç" },
    {
      type: "category",
      label: "Temel kavramlar",
      collapsed: false,
      items: [
        "developer/kavramlar/mimari-genel-bakis",
        "developer/kavramlar/kimlik-dogrulama",
        "developer/kavramlar/coklu-tenant",
        "developer/kavramlar/hata-kodlari",
        "developer/kavramlar/idempotency",
        "developer/kavramlar/pagination",
      ],
    },
    {
      type: "category",
      label: "API referansı",
      items: [
        "developer/api/genel-bakis",
        "developer/api/rate-limit",
        "developer/api/versiyonlama",
        "developer/api/try-it-out-sandbox",
        {
          type: "category",
          label: "Servis API'leri",
          items: [
            { type: "link", label: "Auth", href: "/docs/developer/api/auth" },
            { type: "link", label: "Tenant", href: "/docs/developer/api/tenant" },
            { type: "link", label: "Employee", href: "/docs/developer/api/employee" },
            { type: "link", label: "Organization", href: "/docs/developer/api/organization" },
            { type: "link", label: "Leave", href: "/docs/developer/api/leave" },
            { type: "link", label: "Document", href: "/docs/developer/api/document" },
            { type: "link", label: "Assessment", href: "/docs/developer/api/assessment" },
            { type: "link", label: "Survey", href: "/docs/developer/api/survey" },
            { type: "link", label: "Intervention", href: "/docs/developer/api/intervention" },
            { type: "link", label: "Performance", href: "/docs/developer/api/performance" },
            { type: "link", label: "Mobility", href: "/docs/developer/api/mobility" },
            { type: "link", label: "ATS", href: "/docs/developer/api/ats" },
            { type: "link", label: "Notification", href: "/docs/developer/api/notification" },
            { type: "link", label: "Bordro", href: "/docs/developer/api/bordro" },
            { type: "link", label: "Billing", href: "/docs/developer/api/billing" },
            { type: "link", label: "Audit", href: "/docs/developer/api/audit" },
            { type: "link", label: "API Gateway", href: "/docs/developer/api/gateway" },
          ],
        },
      ],
    },
    {
      type: "category",
      label: "Webhook",
      items: [
        "developer/webhook/genel-bakis",
        "developer/webhook/imzalama",
        "developer/webhook/retry-politikasi",
        "developer/webhook/olaylar",
      ],
    },
    {
      type: "category",
      label: "SDK",
      items: [
        "developer/sdk/javascript",
        "developer/sdk/python",
        "developer/sdk/go",
      ],
    },
    {
      type: "category",
      label: "ML ve AI",
      items: [
        "developer/ml/model-kartlari",
        "developer/ml/burnout-prediction-kart",
        "developer/ml/jd-r-fit-kart",
        "developer/ml/intervention-recommendation-kart",
        "developer/ml/yeniden-egitim-takvimi",
      ],
    },
  ],
};

export default sidebars;
