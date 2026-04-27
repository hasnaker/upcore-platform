import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/en/changelog',
    component: ComponentCreator('/en/changelog', '904'),
    exact: true
  },
  {
    path: '/en/changelog/archive',
    component: ComponentCreator('/en/changelog/archive', '101'),
    exact: true
  },
  {
    path: '/en/changelog/authors',
    component: ComponentCreator('/en/changelog/authors', 'e96'),
    exact: true
  },
  {
    path: '/en/changelog/q2-ml-retrain',
    component: ComponentCreator('/en/changelog/q2-ml-retrain', 'e97'),
    exact: true
  },
  {
    path: '/en/changelog/soc2-type-i-tamamlandi',
    component: ComponentCreator('/en/changelog/soc2-type-i-tamamlandi', '6e4'),
    exact: true
  },
  {
    path: '/en/changelog/tags',
    component: ComponentCreator('/en/changelog/tags', 'c15'),
    exact: true
  },
  {
    path: '/en/changelog/tags/beta',
    component: ComponentCreator('/en/changelog/tags/beta', '61f'),
    exact: true
  },
  {
    path: '/en/changelog/tags/compliance',
    component: ComponentCreator('/en/changelog/tags/compliance', '9d7'),
    exact: true
  },
  {
    path: '/en/changelog/tags/ml',
    component: ComponentCreator('/en/changelog/tags/ml', '7a4'),
    exact: true
  },
  {
    path: '/en/changelog/tags/models',
    component: ComponentCreator('/en/changelog/tags/models', '58c'),
    exact: true
  },
  {
    path: '/en/changelog/tags/release',
    component: ComponentCreator('/en/changelog/tags/release', '275'),
    exact: true
  },
  {
    path: '/en/changelog/tags/security',
    component: ComponentCreator('/en/changelog/tags/security', '9c6'),
    exact: true
  },
  {
    path: '/en/changelog/tags/soc-2',
    component: ComponentCreator('/en/changelog/tags/soc-2', '5fe'),
    exact: true
  },
  {
    path: '/en/changelog/tags/v-2',
    component: ComponentCreator('/en/changelog/tags/v-2', '8f1'),
    exact: true
  },
  {
    path: '/en/changelog/v2-beta-yayinda',
    component: ComponentCreator('/en/changelog/v2-beta-yayinda', 'd50'),
    exact: true
  },
  {
    path: '/en/hukuki/gizlilik',
    component: ComponentCreator('/en/hukuki/gizlilik', '11d'),
    exact: true
  },
  {
    path: '/en/hukuki/kullanim-sartlari',
    component: ComponentCreator('/en/hukuki/kullanim-sartlari', 'd04'),
    exact: true
  },
  {
    path: '/en/iletisim',
    component: ComponentCreator('/en/iletisim', 'acd'),
    exact: true
  },
  {
    path: '/en/search',
    component: ComponentCreator('/en/search', '5d6'),
    exact: true
  },
  {
    path: '/en/docs',
    component: ComponentCreator('/en/docs', '494'),
    routes: [
      {
        path: '/en/docs',
        component: ComponentCreator('/en/docs', '223'),
        routes: [
          {
            path: '/en/docs',
            component: ComponentCreator('/en/docs', 'dd4'),
            routes: [
              {
                path: '/en/docs/admin/billing/fatura-yonetimi',
                component: ComponentCreator('/en/docs/admin/billing/fatura-yonetimi', 'e26'),
                exact: true,
                sidebar: "adminSidebar"
              },
              {
                path: '/en/docs/admin/billing/kullanim-metrikleri',
                component: ComponentCreator('/en/docs/admin/billing/kullanim-metrikleri', '8bd'),
                exact: true,
                sidebar: "adminSidebar"
              },
              {
                path: '/en/docs/admin/billing/plan-secimi',
                component: ComponentCreator('/en/docs/admin/billing/plan-secimi', 'cd1'),
                exact: true,
                sidebar: "adminSidebar"
              },
              {
                path: '/en/docs/admin/billing/seat-yonetimi',
                component: ComponentCreator('/en/docs/admin/billing/seat-yonetimi', '15e'),
                exact: true,
                sidebar: "adminSidebar"
              },
              {
                path: '/en/docs/admin/giris',
                component: ComponentCreator('/en/docs/admin/giris', 'f0d'),
                exact: true,
                sidebar: "adminSidebar"
              },
              {
                path: '/en/docs/admin/iam/mfa-zorunlu-kilma',
                component: ComponentCreator('/en/docs/admin/iam/mfa-zorunlu-kilma', '73c'),
                exact: true,
                sidebar: "adminSidebar"
              },
              {
                path: '/en/docs/admin/iam/rbac-rol-yonetimi',
                component: ComponentCreator('/en/docs/admin/iam/rbac-rol-yonetimi', '426'),
                exact: true,
                sidebar: "adminSidebar"
              },
              {
                path: '/en/docs/admin/iam/scim-kullanici-senkron',
                component: ComponentCreator('/en/docs/admin/iam/scim-kullanici-senkron', '4b0'),
                exact: true,
                sidebar: "adminSidebar"
              },
              {
                path: '/en/docs/admin/iam/sso-oidc',
                component: ComponentCreator('/en/docs/admin/iam/sso-oidc', '9b6'),
                exact: true,
                sidebar: "adminSidebar"
              },
              {
                path: '/en/docs/admin/iam/sso-saml',
                component: ComponentCreator('/en/docs/admin/iam/sso-saml', '96b'),
                exact: true,
                sidebar: "adminSidebar"
              },
              {
                path: '/en/docs/admin/operasyon/api-key-olusturma',
                component: ComponentCreator('/en/docs/admin/operasyon/api-key-olusturma', '2b4'),
                exact: true,
                sidebar: "adminSidebar"
              },
              {
                path: '/en/docs/admin/operasyon/audit-log-izleme',
                component: ComponentCreator('/en/docs/admin/operasyon/audit-log-izleme', '23e'),
                exact: true,
                sidebar: "adminSidebar"
              },
              {
                path: '/en/docs/admin/operasyon/bulk-export',
                component: ComponentCreator('/en/docs/admin/operasyon/bulk-export', '6af'),
                exact: true,
                sidebar: "adminSidebar"
              },
              {
                path: '/en/docs/admin/operasyon/feature-flag',
                component: ComponentCreator('/en/docs/admin/operasyon/feature-flag', '72d'),
                exact: true,
                sidebar: "adminSidebar"
              },
              {
                path: '/en/docs/admin/operasyon/impersonation',
                component: ComponentCreator('/en/docs/admin/operasyon/impersonation', 'ac1'),
                exact: true,
                sidebar: "adminSidebar"
              },
              {
                path: '/en/docs/admin/operasyon/webhook-konfigurasyon',
                component: ComponentCreator('/en/docs/admin/operasyon/webhook-konfigurasyon', '054'),
                exact: true,
                sidebar: "adminSidebar"
              },
              {
                path: '/en/docs/admin/tenant/csv-import',
                component: ComponentCreator('/en/docs/admin/tenant/csv-import', '9bf'),
                exact: true,
                sidebar: "adminSidebar"
              },
              {
                path: '/en/docs/admin/tenant/ilk-modul-secimi',
                component: ComponentCreator('/en/docs/admin/tenant/ilk-modul-secimi', '756'),
                exact: true,
                sidebar: "adminSidebar"
              },
              {
                path: '/en/docs/admin/tenant/onboarding-wizard',
                component: ComponentCreator('/en/docs/admin/tenant/onboarding-wizard', 'b6c'),
                exact: true,
                sidebar: "adminSidebar"
              },
              {
                path: '/en/docs/admin/tenant/yeni-tenant-olusturma',
                component: ComponentCreator('/en/docs/admin/tenant/yeni-tenant-olusturma', 'c9a'),
                exact: true,
                sidebar: "adminSidebar"
              },
              {
                path: '/en/docs/admin/uyum/dpa-sablon',
                component: ComponentCreator('/en/docs/admin/uyum/dpa-sablon', '418'),
                exact: true,
                sidebar: "adminSidebar"
              },
              {
                path: '/en/docs/admin/uyum/log-retansiyon',
                component: ComponentCreator('/en/docs/admin/uyum/log-retansiyon', '2e5'),
                exact: true,
                sidebar: "adminSidebar"
              },
              {
                path: '/en/docs/admin/uyum/soc2-readiness',
                component: ComponentCreator('/en/docs/admin/uyum/soc2-readiness', '2a9'),
                exact: true,
                sidebar: "adminSidebar"
              },
              {
                path: '/en/docs/admin/uyum/veri-ikametgahi',
                component: ComponentCreator('/en/docs/admin/uyum/veri-ikametgahi', '281'),
                exact: true,
                sidebar: "adminSidebar"
              },
              {
                path: '/en/docs/calisan/giris',
                component: ComponentCreator('/en/docs/calisan/giris', '4ec'),
                exact: true,
                sidebar: "employeeSidebar"
              },
              {
                path: '/en/docs/calisan/hesap/bildirim-tercihleri',
                component: ComponentCreator('/en/docs/calisan/hesap/bildirim-tercihleri', 'fed'),
                exact: true,
                sidebar: "employeeSidebar"
              },
              {
                path: '/en/docs/calisan/hesap/ilk-giris',
                component: ComponentCreator('/en/docs/calisan/hesap/ilk-giris', 'b89'),
                exact: true,
                sidebar: "employeeSidebar"
              },
              {
                path: '/en/docs/calisan/hesap/profil-guncelleme',
                component: ComponentCreator('/en/docs/calisan/hesap/profil-guncelleme', 'a46'),
                exact: true,
                sidebar: "employeeSidebar"
              },
              {
                path: '/en/docs/calisan/hesap/sifre-mfa',
                component: ComponentCreator('/en/docs/calisan/hesap/sifre-mfa', 'c12'),
                exact: true,
                sidebar: "employeeSidebar"
              },
              {
                path: '/en/docs/calisan/kvkk/madde-11-haklar',
                component: ComponentCreator('/en/docs/calisan/kvkk/madde-11-haklar', '93b'),
                exact: true,
                sidebar: "employeeSidebar"
              },
              {
                path: '/en/docs/calisan/kvkk/silme-talebi',
                component: ComponentCreator('/en/docs/calisan/kvkk/silme-talebi', '99f'),
                exact: true,
                sidebar: "employeeSidebar"
              },
              {
                path: '/en/docs/calisan/kvkk/veri-indirme',
                component: ComponentCreator('/en/docs/calisan/kvkk/veri-indirme', '6b7'),
                exact: true,
                sidebar: "employeeSidebar"
              },
              {
                path: '/en/docs/calisan/pulse/anonimlik-guvencesi',
                component: ComponentCreator('/en/docs/calisan/pulse/anonimlik-guvencesi', 'd3e'),
                exact: true,
                sidebar: "employeeSidebar"
              },
              {
                path: '/en/docs/calisan/pulse/pulse-cevaplama',
                component: ComponentCreator('/en/docs/calisan/pulse/pulse-cevaplama', '50b'),
                exact: true,
                sidebar: "employeeSidebar"
              },
              {
                path: '/en/docs/calisan/pulse/pulse-nedir',
                component: ComponentCreator('/en/docs/calisan/pulse/pulse-nedir', '8b6'),
                exact: true,
                sidebar: "employeeSidebar"
              },
              {
                path: '/en/docs/calisan/sss',
                component: ComponentCreator('/en/docs/calisan/sss', '239'),
                exact: true,
                sidebar: "employeeSidebar"
              },
              {
                path: '/en/docs/developer/api/assessment',
                component: ComponentCreator('/en/docs/developer/api/assessment', 'e71'),
                exact: true
              },
              {
                path: '/en/docs/developer/api/ats',
                component: ComponentCreator('/en/docs/developer/api/ats', '3a4'),
                exact: true
              },
              {
                path: '/en/docs/developer/api/audit',
                component: ComponentCreator('/en/docs/developer/api/audit', 'af4'),
                exact: true
              },
              {
                path: '/en/docs/developer/api/auth',
                component: ComponentCreator('/en/docs/developer/api/auth', '965'),
                exact: true
              },
              {
                path: '/en/docs/developer/api/billing',
                component: ComponentCreator('/en/docs/developer/api/billing', '4dc'),
                exact: true
              },
              {
                path: '/en/docs/developer/api/bordro',
                component: ComponentCreator('/en/docs/developer/api/bordro', '8e1'),
                exact: true
              },
              {
                path: '/en/docs/developer/api/document',
                component: ComponentCreator('/en/docs/developer/api/document', '5d2'),
                exact: true
              },
              {
                path: '/en/docs/developer/api/employee',
                component: ComponentCreator('/en/docs/developer/api/employee', '865'),
                exact: true
              },
              {
                path: '/en/docs/developer/api/gateway',
                component: ComponentCreator('/en/docs/developer/api/gateway', '9e7'),
                exact: true
              },
              {
                path: '/en/docs/developer/api/genel-bakis',
                component: ComponentCreator('/en/docs/developer/api/genel-bakis', '069'),
                exact: true,
                sidebar: "developerSidebar"
              },
              {
                path: '/en/docs/developer/api/intervention',
                component: ComponentCreator('/en/docs/developer/api/intervention', '887'),
                exact: true
              },
              {
                path: '/en/docs/developer/api/leave',
                component: ComponentCreator('/en/docs/developer/api/leave', 'b06'),
                exact: true
              },
              {
                path: '/en/docs/developer/api/mobility',
                component: ComponentCreator('/en/docs/developer/api/mobility', '811'),
                exact: true
              },
              {
                path: '/en/docs/developer/api/notification',
                component: ComponentCreator('/en/docs/developer/api/notification', '739'),
                exact: true
              },
              {
                path: '/en/docs/developer/api/organization',
                component: ComponentCreator('/en/docs/developer/api/organization', 'a49'),
                exact: true
              },
              {
                path: '/en/docs/developer/api/performance',
                component: ComponentCreator('/en/docs/developer/api/performance', '39a'),
                exact: true
              },
              {
                path: '/en/docs/developer/api/rate-limit',
                component: ComponentCreator('/en/docs/developer/api/rate-limit', 'fa6'),
                exact: true,
                sidebar: "developerSidebar"
              },
              {
                path: '/en/docs/developer/api/survey',
                component: ComponentCreator('/en/docs/developer/api/survey', '174'),
                exact: true
              },
              {
                path: '/en/docs/developer/api/tenant',
                component: ComponentCreator('/en/docs/developer/api/tenant', '37c'),
                exact: true
              },
              {
                path: '/en/docs/developer/api/try-it-out-sandbox',
                component: ComponentCreator('/en/docs/developer/api/try-it-out-sandbox', '60c'),
                exact: true,
                sidebar: "developerSidebar"
              },
              {
                path: '/en/docs/developer/api/versiyonlama',
                component: ComponentCreator('/en/docs/developer/api/versiyonlama', 'fc6'),
                exact: true,
                sidebar: "developerSidebar"
              },
              {
                path: '/en/docs/developer/giris',
                component: ComponentCreator('/en/docs/developer/giris', '4e4'),
                exact: true,
                sidebar: "developerSidebar"
              },
              {
                path: '/en/docs/developer/kavramlar/coklu-tenant',
                component: ComponentCreator('/en/docs/developer/kavramlar/coklu-tenant', '71d'),
                exact: true,
                sidebar: "developerSidebar"
              },
              {
                path: '/en/docs/developer/kavramlar/hata-kodlari',
                component: ComponentCreator('/en/docs/developer/kavramlar/hata-kodlari', '252'),
                exact: true,
                sidebar: "developerSidebar"
              },
              {
                path: '/en/docs/developer/kavramlar/idempotency',
                component: ComponentCreator('/en/docs/developer/kavramlar/idempotency', 'fd1'),
                exact: true,
                sidebar: "developerSidebar"
              },
              {
                path: '/en/docs/developer/kavramlar/kimlik-dogrulama',
                component: ComponentCreator('/en/docs/developer/kavramlar/kimlik-dogrulama', '60d'),
                exact: true,
                sidebar: "developerSidebar"
              },
              {
                path: '/en/docs/developer/kavramlar/mimari-genel-bakis',
                component: ComponentCreator('/en/docs/developer/kavramlar/mimari-genel-bakis', 'ba6'),
                exact: true,
                sidebar: "developerSidebar"
              },
              {
                path: '/en/docs/developer/kavramlar/pagination',
                component: ComponentCreator('/en/docs/developer/kavramlar/pagination', '841'),
                exact: true,
                sidebar: "developerSidebar"
              },
              {
                path: '/en/docs/developer/ml/burnout-prediction-kart',
                component: ComponentCreator('/en/docs/developer/ml/burnout-prediction-kart', 'a47'),
                exact: true,
                sidebar: "developerSidebar"
              },
              {
                path: '/en/docs/developer/ml/intervention-recommendation-kart',
                component: ComponentCreator('/en/docs/developer/ml/intervention-recommendation-kart', '982'),
                exact: true,
                sidebar: "developerSidebar"
              },
              {
                path: '/en/docs/developer/ml/jd-r-fit-kart',
                component: ComponentCreator('/en/docs/developer/ml/jd-r-fit-kart', 'd7e'),
                exact: true,
                sidebar: "developerSidebar"
              },
              {
                path: '/en/docs/developer/ml/model-kartlari',
                component: ComponentCreator('/en/docs/developer/ml/model-kartlari', 'bc4'),
                exact: true,
                sidebar: "developerSidebar"
              },
              {
                path: '/en/docs/developer/ml/yeniden-egitim-takvimi',
                component: ComponentCreator('/en/docs/developer/ml/yeniden-egitim-takvimi', '3a5'),
                exact: true,
                sidebar: "developerSidebar"
              },
              {
                path: '/en/docs/developer/sdk/go',
                component: ComponentCreator('/en/docs/developer/sdk/go', '465'),
                exact: true,
                sidebar: "developerSidebar"
              },
              {
                path: '/en/docs/developer/sdk/javascript',
                component: ComponentCreator('/en/docs/developer/sdk/javascript', '4be'),
                exact: true,
                sidebar: "developerSidebar"
              },
              {
                path: '/en/docs/developer/sdk/python',
                component: ComponentCreator('/en/docs/developer/sdk/python', '24d'),
                exact: true,
                sidebar: "developerSidebar"
              },
              {
                path: '/en/docs/developer/webhook/genel-bakis',
                component: ComponentCreator('/en/docs/developer/webhook/genel-bakis', '908'),
                exact: true,
                sidebar: "developerSidebar"
              },
              {
                path: '/en/docs/developer/webhook/imzalama',
                component: ComponentCreator('/en/docs/developer/webhook/imzalama', 'a11'),
                exact: true,
                sidebar: "developerSidebar"
              },
              {
                path: '/en/docs/developer/webhook/olaylar',
                component: ComponentCreator('/en/docs/developer/webhook/olaylar', '461'),
                exact: true,
                sidebar: "developerSidebar"
              },
              {
                path: '/en/docs/developer/webhook/retry-politikasi',
                component: ComponentCreator('/en/docs/developer/webhook/retry-politikasi', '41e'),
                exact: true,
                sidebar: "developerSidebar"
              },
              {
                path: '/en/docs/ik/giris',
                component: ComponentCreator('/en/docs/ik/giris', '7a4'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/hizli-baslangic/ilk-15-dakika',
                component: ComponentCreator('/en/docs/ik/hizli-baslangic/ilk-15-dakika', '643'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/hizli-baslangic/ilk-mudahale',
                component: ComponentCreator('/en/docs/ik/hizli-baslangic/ilk-mudahale', '5b7'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/hizli-baslangic/ilk-pulse-anketi',
                component: ComponentCreator('/en/docs/ik/hizli-baslangic/ilk-pulse-anketi', '62c'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/hizli-baslangic/yil-sonu-degerlendirme',
                component: ComponentCreator('/en/docs/ik/hizli-baslangic/yil-sonu-degerlendirme', 'cb9'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/kvkk/giris',
                component: ComponentCreator('/en/docs/ik/kvkk/giris', 'f5d'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/analitik/bias-denetimi',
                component: ComponentCreator('/en/docs/ik/modul/analitik/bias-denetimi', '910'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/analitik/departman-karsilastirma',
                component: ComponentCreator('/en/docs/ik/modul/analitik/departman-karsilastirma', '66f'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/analitik/executive-dashboard',
                component: ComponentCreator('/en/docs/ik/modul/analitik/executive-dashboard', '7b5'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/analitik/genel-bakis',
                component: ComponentCreator('/en/docs/ik/modul/analitik/genel-bakis', '911'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/analitik/ihracat-entegrasyon',
                component: ComponentCreator('/en/docs/ik/modul/analitik/ihracat-entegrasyon', 'db7'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/analitik/roi-hesabi',
                component: ComponentCreator('/en/docs/ik/modul/analitik/roi-hesabi', '47e'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/analitik/sikca-sorulanlar',
                component: ComponentCreator('/en/docs/ik/modul/analitik/sikca-sorulanlar', 'd5b'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/analitik/tahmin-modelleri',
                component: ComponentCreator('/en/docs/ik/modul/analitik/tahmin-modelleri', '08c'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/analitik/trend-analizi',
                component: ComponentCreator('/en/docs/ik/modul/analitik/trend-analizi', '4bd'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/analitik/yillik-rapor',
                component: ComponentCreator('/en/docs/ik/modul/analitik/yillik-rapor', '767'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/gelistirme/butce-yonetimi',
                component: ComponentCreator('/en/docs/ik/modul/gelistirme/butce-yonetimi', 'a5e'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/gelistirme/etki-degerlendirme',
                component: ComponentCreator('/en/docs/ik/modul/gelistirme/etki-degerlendirme', '40b'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/gelistirme/genel-bakis',
                component: ComponentCreator('/en/docs/ik/modul/gelistirme/genel-bakis', 'b28'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/gelistirme/ilk-kaynak-kutuphanesi',
                component: ComponentCreator('/en/docs/ik/modul/gelistirme/ilk-kaynak-kutuphanesi', '41c'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/gelistirme/koçluk-programi',
                component: ComponentCreator('/en/docs/ik/modul/gelistirme/koçluk-programi', '8a1'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/gelistirme/mentorluk',
                component: ComponentCreator('/en/docs/ik/modul/gelistirme/mentorluk', '6fa'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/gelistirme/ogrenme-yolu',
                component: ComponentCreator('/en/docs/ik/modul/gelistirme/ogrenme-yolu', '8bb'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/gelistirme/sertifika-takibi',
                component: ComponentCreator('/en/docs/ik/modul/gelistirme/sertifika-takibi', 'eaf'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/gelistirme/sikca-sorulanlar',
                component: ComponentCreator('/en/docs/ik/modul/gelistirme/sikca-sorulanlar', '027'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/gelistirme/yetkinlik-modeli',
                component: ComponentCreator('/en/docs/ik/modul/gelistirme/yetkinlik-modeli', '079'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/ik-ops/bordro-hesaplama',
                component: ComponentCreator('/en/docs/ik/modul/ik-ops/bordro-hesaplama', '675'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/ik-ops/genel-bakis',
                component: ComponentCreator('/en/docs/ik/modul/ik-ops/genel-bakis', '677'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/ik-ops/is-kazasi-bildirim',
                component: ComponentCreator('/en/docs/ik/modul/ik-ops/is-kazasi-bildirim', 'b5f'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/ik-ops/izin-yonetimi',
                component: ComponentCreator('/en/docs/ik/modul/ik-ops/izin-yonetimi', '8b2'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/ik-ops/kidem-tazminati',
                component: ComponentCreator('/en/docs/ik/modul/ik-ops/kidem-tazminati', '832'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/ik-ops/kiyafet-mesai',
                component: ComponentCreator('/en/docs/ik/modul/ik-ops/kiyafet-mesai', '697'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/ik-ops/ozluk-dosyasi',
                component: ComponentCreator('/en/docs/ik/modul/ik-ops/ozluk-dosyasi', '97b'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/ik-ops/sgk-e-bildirge',
                component: ComponentCreator('/en/docs/ik/modul/ik-ops/sgk-e-bildirge', 'd5f'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/ik-ops/sikca-sorulanlar',
                component: ComponentCreator('/en/docs/ik/modul/ik-ops/sikca-sorulanlar', 'd49'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/ik-ops/sozlesme-yonetimi',
                component: ComponentCreator('/en/docs/ik/modul/ik-ops/sozlesme-yonetimi', '5f2'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/koruma/cohens-d-yorumu',
                component: ComponentCreator('/en/docs/ik/modul/koruma/cohens-d-yorumu', 'b81'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/koruma/consent-akisi',
                component: ComponentCreator('/en/docs/ik/modul/koruma/consent-akisi', '333'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/koruma/etki-olcumu',
                component: ComponentCreator('/en/docs/ik/modul/koruma/etki-olcumu', 'd19'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/koruma/genel-bakis',
                component: ComponentCreator('/en/docs/ik/modul/koruma/genel-bakis', '8e1'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/koruma/izleme-takvimi',
                component: ComponentCreator('/en/docs/ik/modul/koruma/izleme-takvimi', '180'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/koruma/mudahale-katalogu',
                component: ComponentCreator('/en/docs/ik/modul/koruma/mudahale-katalogu', 'df0'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/koruma/plan-takibi',
                component: ComponentCreator('/en/docs/ik/modul/koruma/plan-takibi', '0a5'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/koruma/referral-network',
                component: ComponentCreator('/en/docs/ik/modul/koruma/referral-network', 'c2f'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/koruma/sikca-sorulanlar',
                component: ComponentCreator('/en/docs/ik/modul/koruma/sikca-sorulanlar', 'e6a'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/koruma/thompson-sampling',
                component: ComponentCreator('/en/docs/ik/modul/koruma/thompson-sampling', '2ca'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/kvkk/acik-riza',
                component: ComponentCreator('/en/docs/ik/modul/kvkk/acik-riza', '58c'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/kvkk/aydınlatma-metni',
                component: ComponentCreator('/en/docs/ik/modul/kvkk/aydınlatma-metni', 'ce1'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/kvkk/dpia-sablon',
                component: ComponentCreator('/en/docs/ik/modul/kvkk/dpia-sablon', '206'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/kvkk/genel-bakis',
                component: ComponentCreator('/en/docs/ik/modul/kvkk/genel-bakis', 'f06'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/kvkk/ihlal-bildirim-72-saat',
                component: ComponentCreator('/en/docs/ik/modul/kvkk/ihlal-bildirim-72-saat', 'ea6'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/kvkk/madde-11-talep-yonetimi',
                component: ComponentCreator('/en/docs/ik/modul/kvkk/madde-11-talep-yonetimi', 'c19'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/kvkk/saklama-politikasi',
                component: ComponentCreator('/en/docs/ik/modul/kvkk/saklama-politikasi', '59d'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/kvkk/sikca-sorulanlar',
                component: ComponentCreator('/en/docs/ik/modul/kvkk/sikca-sorulanlar', '564'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/kvkk/verbis-kayit-sureci',
                component: ComponentCreator('/en/docs/ik/modul/kvkk/verbis-kayit-sureci', '9dc'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/kvkk/yurtdisi-aktarim',
                component: ComponentCreator('/en/docs/ik/modul/kvkk/yurtdisi-aktarim', '943'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/mobility/9-kutu-entegrasyon',
                component: ComponentCreator('/en/docs/ik/modul/mobility/9-kutu-entegrasyon', 'b13'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/mobility/ayrilis-risk-tahmini',
                component: ComponentCreator('/en/docs/ik/modul/mobility/ayrilis-risk-tahmini', '3ba'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/mobility/genel-bakis',
                component: ComponentCreator('/en/docs/ik/modul/mobility/genel-bakis', 'b3c'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/mobility/ic-ilan-marketplace',
                component: ComponentCreator('/en/docs/ik/modul/mobility/ic-ilan-marketplace', 'cec'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/mobility/kariyer-yolu',
                component: ComponentCreator('/en/docs/ik/modul/mobility/kariyer-yolu', '132'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/mobility/maliyet-analizi',
                component: ComponentCreator('/en/docs/ik/modul/mobility/maliyet-analizi', 'abe'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/mobility/ready-now-siniflandirma',
                component: ComponentCreator('/en/docs/ik/modul/mobility/ready-now-siniflandirma', '8f2'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/mobility/rotasyon-is-akisi',
                component: ComponentCreator('/en/docs/ik/modul/mobility/rotasyon-is-akisi', 'd79'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/mobility/sikca-sorulanlar',
                component: ComponentCreator('/en/docs/ik/modul/mobility/sikca-sorulanlar', '24d'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/mobility/succession-pool',
                component: ComponentCreator('/en/docs/ik/modul/mobility/succession-pool', 'b97'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/performans/360-anket',
                component: ComponentCreator('/en/docs/ik/modul/performans/360-anket', 'e18'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/performans/360-soru-havuzu',
                component: ComponentCreator('/en/docs/ik/modul/performans/360-soru-havuzu', 'd6d'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/performans/9-kutu-kalibrasyon',
                component: ComponentCreator('/en/docs/ik/modul/performans/9-kutu-kalibrasyon', '93a'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/performans/bonus-hesabi',
                component: ComponentCreator('/en/docs/ik/modul/performans/bonus-hesabi', '832'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/performans/genel-bakis',
                component: ComponentCreator('/en/docs/ik/modul/performans/genel-bakis', '082'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/performans/key-result-takibi',
                component: ComponentCreator('/en/docs/ik/modul/performans/key-result-takibi', '494'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/performans/okr-kurulum',
                component: ComponentCreator('/en/docs/ik/modul/performans/okr-kurulum', '020'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/performans/pip-is-akisi',
                component: ComponentCreator('/en/docs/ik/modul/performans/pip-is-akisi', '203'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/performans/sikca-sorulanlar',
                component: ComponentCreator('/en/docs/ik/modul/performans/sikca-sorulanlar', '5d5'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/performans/yil-sonu-degerlendirme',
                component: ComponentCreator('/en/docs/ik/modul/performans/yil-sonu-degerlendirme', 'e24'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/surdurme/anket-guvenilirligi',
                component: ComponentCreator('/en/docs/ik/modul/surdurme/anket-guvenilirligi', 'cbf'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/surdurme/bat-tr-skorlama',
                component: ComponentCreator('/en/docs/ik/modul/surdurme/bat-tr-skorlama', 'e52'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/surdurme/genel-bakis',
                component: ComponentCreator('/en/docs/ik/modul/surdurme/genel-bakis', 'c37'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/surdurme/heatmap-okuma',
                component: ComponentCreator('/en/docs/ik/modul/surdurme/heatmap-okuma', '6f1'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/surdurme/jd-r-yorumu',
                component: ComponentCreator('/en/docs/ik/modul/surdurme/jd-r-yorumu', 'ba7'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/surdurme/kirmizi-band-triage',
                component: ComponentCreator('/en/docs/ik/modul/surdurme/kirmizi-band-triage', 'eb9'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/surdurme/pulse-kurulum',
                component: ComponentCreator('/en/docs/ik/modul/surdurme/pulse-kurulum', '4bb'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/surdurme/sablon-kutuphanesi',
                component: ComponentCreator('/en/docs/ik/modul/surdurme/sablon-kutuphanesi', '2b8'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/surdurme/sikca-sorulanlar',
                component: ComponentCreator('/en/docs/ik/modul/surdurme/sikca-sorulanlar', '412'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/ik/modul/surdurme/soru-bankasi',
                component: ComponentCreator('/en/docs/ik/modul/surdurme/soru-bankasi', '30a'),
                exact: true,
                sidebar: "hrSidebar"
              },
              {
                path: '/en/docs/yonetici/ekip/bire-bir-gorusmeler',
                component: ComponentCreator('/en/docs/yonetici/ekip/bire-bir-gorusmeler', '258'),
                exact: true,
                sidebar: "managerSidebar"
              },
              {
                path: '/en/docs/yonetici/ekip/ekip-dashboard',
                component: ComponentCreator('/en/docs/yonetici/ekip/ekip-dashboard', '3c2'),
                exact: true,
                sidebar: "managerSidebar"
              },
              {
                path: '/en/docs/yonetici/ekip/surekli-geri-bildirim',
                component: ComponentCreator('/en/docs/yonetici/ekip/surekli-geri-bildirim', 'e5e'),
                exact: true,
                sidebar: "managerSidebar"
              },
              {
                path: '/en/docs/yonetici/giris',
                component: ComponentCreator('/en/docs/yonetici/giris', 'bd9'),
                exact: true,
                sidebar: "managerSidebar"
              },
              {
                path: '/en/docs/yonetici/performans/360-feedback-verme',
                component: ComponentCreator('/en/docs/yonetici/performans/360-feedback-verme', '1ec'),
                exact: true,
                sidebar: "managerSidebar"
              },
              {
                path: '/en/docs/yonetici/performans/9-kutu-kalibrasyon',
                component: ComponentCreator('/en/docs/yonetici/performans/9-kutu-kalibrasyon', '79a'),
                exact: true,
                sidebar: "managerSidebar"
              },
              {
                path: '/en/docs/yonetici/performans/okr-belirleme',
                component: ComponentCreator('/en/docs/yonetici/performans/okr-belirleme', '8d5'),
                exact: true,
                sidebar: "managerSidebar"
              },
              {
                path: '/en/docs/yonetici/pulse/ekip-pulse-yorumu',
                component: ComponentCreator('/en/docs/yonetici/pulse/ekip-pulse-yorumu', '46a'),
                exact: true,
                sidebar: "managerSidebar"
              },
              {
                path: '/en/docs/yonetici/pulse/kirmizi-band-triage',
                component: ComponentCreator('/en/docs/yonetici/pulse/kirmizi-band-triage', 'bc3'),
                exact: true,
                sidebar: "managerSidebar"
              },
              {
                path: '/en/docs/yonetici/pulse/mudahale-onayi',
                component: ComponentCreator('/en/docs/yonetici/pulse/mudahale-onayi', 'cc7'),
                exact: true,
                sidebar: "managerSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/en/',
    component: ComponentCreator('/en/', '6c2'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
