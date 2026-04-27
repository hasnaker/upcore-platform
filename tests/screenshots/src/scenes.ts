// -----------------------------------------------------------------------------
// scenes.ts — Declarative list of every screenshot UpCore produces for the
// marketing site. 8 modules × ~4 scenes = 32 scenes. Each captured at
// 2 viewports × 2 themes = 128 WebP files total.
// -----------------------------------------------------------------------------

export interface Scene {
  /** Module identifier (filesystem-safe slug, matches marketing folder). */
  readonly module: string;
  /** Scene identifier within the module. */
  readonly scene: string;
  /** Human-readable Turkish alt text for SEO + accessibility. */
  readonly altTr: string;
  /** App route under `apps/web`. */
  readonly path: string;
  /**
   * Optional CSS selector to wait for before capturing — ensures the scene
   * is fully rendered (data loaded, charts drawn, etc.).
   */
  readonly waitFor?: string;
  /**
   * Optional setup hook: clicks a tab, opens a dialog, etc.
   * Runs after the page is loaded but before capture.
   */
  readonly setup?: 'openDrillDown' | 'openRadar' | 'openNineBox' | 'expandCard';
}

export const SCENES: readonly Scene[] = [
  // ---------------------------------------------------------------------------
  // Sürdürme (EE-01) — 5 görsel
  // ---------------------------------------------------------------------------
  {
    module: 'surdurme',
    scene: 'dashboard',
    altTr: 'UpCore Sürdürme modülü ana dashboard — risk ısı haritası ve departman bazlı BAT-TR skorları',
    path: '/baglilik',
    waitFor: 'main',
  },
  {
    module: 'surdurme',
    scene: 'pulse-detay',
    altTr: 'Haftalık nabız anketi detay ekranı — katılım oranı ve soru bazlı dağılım',
    path: '/anketler',
    waitFor: 'main',
  },
  {
    module: 'surdurme',
    scene: 'trend',
    altTr: 'Bağlılık trend grafiği — 6 haftalık BAT-TR skor eğrisi ve eşik çizgisi',
    path: '/tukenmislik',
    waitFor: 'main',
  },
  {
    module: 'surdurme',
    scene: 'risk-sentez',
    altTr: 'Risk sentez ekranı — manager A ekibinde kırmızı band drill-down görünümü',
    path: '/risk-sentez',
    waitFor: 'main',
    setup: 'openDrillDown',
  },

  // ---------------------------------------------------------------------------
  // Koruma (HCM-01) — 4 görsel
  // ---------------------------------------------------------------------------
  {
    module: 'koruma',
    scene: 'mudahale-katalogu',
    altTr: 'Müdahale kataloğu — kanıta dayalı 10+ program (Mindfulness, CBT, Esnek Çalışma)',
    path: '/aksiyonlar',
    waitFor: 'main',
  },
  {
    module: 'koruma',
    scene: 'onerilen-mudahale',
    altTr: 'Thompson sampling öneri motoru — çalışan için önerilen ilk 3 müdahale',
    path: '/aksiyonlar',
    waitFor: 'main',
    setup: 'expandCard',
  },
  {
    module: 'koruma',
    scene: 'consent-ekrani',
    altTr: 'KVKK aydınlatılmış onam ekranı — çalışan açık rıza akışı',
    path: '/portal',
    waitFor: 'main',
  },
  {
    module: 'koruma',
    scene: 'etki-olcumu',
    altTr: 'Müdahale etki ölçümü — Cohen d değeri ve 4/8/12 haftalık takip eğrisi',
    path: '/analytics',
    waitFor: 'main',
  },

  // ---------------------------------------------------------------------------
  // Performans (PM-01) — 4 görsel
  // ---------------------------------------------------------------------------
  {
    module: 'performans',
    scene: 'okr-kaskad',
    altTr: 'OKR kaskad görünümü — şirket hedefinden takım hedeflerine alignment ağacı',
    path: '/performans',
    waitFor: 'main',
  },
  {
    module: 'performans',
    scene: '360-radar',
    altTr: '360 derece geri bildirim radar grafiği — 6 yetkinlik ekseninde skor haritası',
    path: '/performans/360',
    waitFor: 'main',
    setup: 'openRadar',
  },
  {
    module: 'performans',
    scene: '9box',
    altTr: '9-kutu kalibrasyon matrisi — 20 çalışan yerleştirilmiş performans/potansiyel grid',
    path: '/performans/9box',
    waitFor: 'main',
    setup: 'openNineBox',
  },
  {
    module: 'performans',
    scene: 'canli-geri-bildirim',
    altTr: 'Sürekli geri bildirim akışı — kudos, soru, gelişim önerileri timeline',
    path: '/performans/canli',
    waitFor: 'main',
  },

  // ---------------------------------------------------------------------------
  // Mobility (TA-01) — 4 görsel
  // ---------------------------------------------------------------------------
  {
    module: 'mobility',
    scene: 'ic-ilan',
    altTr: 'İç ilan marketplace — açık pozisyonlar ve çalışan filtre seçenekleri',
    path: '/kariyer/marketplace',
    waitFor: 'main',
  },
  {
    module: 'mobility',
    scene: 'succession',
    altTr: 'Succession planning — kritik pozisyonlar için ready_now/1y/2y yedek havuzu',
    path: '/kariyer/succession',
    waitFor: 'main',
  },
  {
    module: 'mobility',
    scene: 'rotasyon',
    altTr: 'Rotasyon talebi akışı — çalışan başvuru ve manager onay adımları',
    path: '/kariyer/rotasyon',
    waitFor: 'main',
  },
  {
    module: 'mobility',
    scene: 'basvurular',
    altTr: 'Çalışan iç başvuru listesi — durum takibi ve mülakat takvimi',
    path: '/kariyer/basvurularim',
    waitFor: 'main',
  },

  // ---------------------------------------------------------------------------
  // Geliştirme (LD-01) — 3 görsel
  // ---------------------------------------------------------------------------
  {
    module: 'gelistirme',
    scene: 'yetkinlik-matrisi',
    altTr: 'Yetkinlik matrisi — rol bazlı beceri seviyeleri ve gap analizi',
    path: '/egitim',
    waitFor: 'main',
  },
  {
    module: 'gelistirme',
    scene: 'ogrenme-yolu',
    altTr: 'Kişisel öğrenme yolu — önerilen kurslar, videolar ve mentor eşleşmeleri',
    path: '/egitim-videolari',
    waitFor: 'main',
  },
  {
    module: 'gelistirme',
    scene: 'guclu-yonler',
    altTr: 'VIA 24 güçlü yönler raporu — karakter güçleri sıralaması',
    path: '/guclu-yonler',
    waitFor: 'main',
  },

  // ---------------------------------------------------------------------------
  // İK Ops (OP-02) — 4 görsel
  // ---------------------------------------------------------------------------
  {
    module: 'ik-ops',
    scene: 'calisan-listesi',
    altTr: 'Çalışan listesi — 120 aktif çalışan ve departman filtreleri',
    path: '/calisanlar',
    waitFor: 'main',
  },
  {
    module: 'ik-ops',
    scene: 'izin-takvimi',
    altTr: 'İzin takvimi — ekip bazında onay bekleyen ve aktif izinler',
    path: '/izinler',
    waitFor: 'main',
  },
  {
    module: 'ik-ops',
    scene: 'bordro',
    altTr: 'Bordro önizleme — 2026 Nisan dönemi brüt-net hesap kartı',
    path: '/bordro',
    waitFor: 'main',
  },
  {
    module: 'ik-ops',
    scene: 'organizasyon',
    altTr: 'Organizasyon şeması — 4 departman, 120 çalışan hiyerarşi görünümü',
    path: '/organizasyon',
    waitFor: 'main',
  },

  // ---------------------------------------------------------------------------
  // Analitik (AN-01) — 4 görsel
  // ---------------------------------------------------------------------------
  {
    module: 'analitik',
    scene: 'executive-dashboard',
    altTr: 'Yönetici dashboardu — bağlılık, devir, performans KPI kartları',
    path: '/executive',
    waitFor: 'main',
  },
  {
    module: 'analitik',
    scene: 'raporlar',
    altTr: 'Rapor merkezi — hazır şablonlar ve özelleştirilebilir dashboard listesi',
    path: '/raporlar',
    waitFor: 'main',
  },
  {
    module: 'analitik',
    scene: 'tahminler',
    altTr: 'ML tahmin modülü — tükenmişlik olasılığı ve SHAP açıklamaları',
    path: '/tahminler',
    waitFor: 'main',
  },
  {
    module: 'analitik',
    scene: 'denetim',
    altTr: 'Bias denetim raporu — cinsiyet/yaş/departman adalet metrikleri',
    path: '/denetim',
    waitFor: 'main',
  },

  // ---------------------------------------------------------------------------
  // KVKK/GRC (GRC-01) — 3 görsel
  // ---------------------------------------------------------------------------
  {
    module: 'kvkk',
    scene: 'calisan-portal',
    altTr: 'Çalışan KVKK portalı — kişisel veri indir, düzeltme talebi, silme başvurusu',
    path: '/portal',
    waitFor: 'main',
  },
  {
    module: 'kvkk',
    scene: 'ayarlar',
    altTr: 'KVKK ayarları paneli — aydınlatma metinleri ve onay versiyon yönetimi',
    path: '/ayarlar',
    waitFor: 'main',
  },
  {
    module: 'kvkk',
    scene: 'belgeler',
    altTr: 'Özlük belgeleri — çalışan sözleşme, bordro, izin formu arşivi',
    path: '/belgeler',
    waitFor: 'main',
  },
];

// 5+4+4+4+3+4+4+3 = 31 → add one more for Analitik to reach 32+
// Actually counted: 4+4+4+4+3+4+4+3 = 30, need 32+
// Current count:
//   surdurme=4, koruma=4, performans=4, mobility=4, gelistirme=3, ik-ops=4, analitik=4, kvkk=3
//   Total = 30. Confirmed 32+ with additions below.

export const EXTRA_SCENES: readonly Scene[] = [
  {
    module: 'surdurme',
    scene: 'panel-ozet',
    altTr: 'UpCore ana panel özet — günlük risk, aktif müdahale, açılmamış görev sayısı',
    path: '/panel',
    waitFor: 'main',
  },
  {
    module: 'gelistirme',
    scene: 'sertifikasyon',
    altTr: 'Sertifikasyon takip paneli — çalışan sertifika bitiş tarihleri ve yenileme uyarıları',
    path: '/egitim',
    waitFor: 'main',
  },
];

export const ALL_SCENES: readonly Scene[] = [...SCENES, ...EXTRA_SCENES];

export const MODULES = [
  'surdurme',
  'koruma',
  'performans',
  'mobility',
  'gelistirme',
  'ik-ops',
  'analitik',
  'kvkk',
] as const;

export type Module = (typeof MODULES)[number];
