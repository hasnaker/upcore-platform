# UpCore Documentation Site

**docs.upcore.io** — UpCore platformu için hedef kitle bazlı, Türkçe birincil + İngilizce ikincil, Docusaurus 3 tabanlı dokümantasyon sitesi.

## Yapı

```
apps/docs/
├── docusaurus.config.ts          # Site konfigürasyonu (i18n, Algolia, OpenAPI)
├── sidebars.ts                    # 5 kitle için sidebar yapısı
├── docs/
│   ├── calisan/                   # Çalışan rehberi (7 sayfa)
│   ├── yonetici/                  # Yönetici rehberi (10 sayfa)
│   ├── ik/                        # İK rehberi
│   │   ├── giris.md
│   │   ├── kvkk/giris.md
│   │   ├── hizli-baslangic/       # 4 tutorial
│   │   └── modul/                 # 8 modül × 10 sayfa = 80 sayfa
│   │       ├── surdurme/
│   │       ├── koruma/
│   │       ├── performans/
│   │       ├── mobility/
│   │       ├── gelistirme/
│   │       ├── ik-ops/
│   │       ├── analitik/
│   │       └── kvkk/
│   ├── admin/                     # Admin rehberi (24 sayfa)
│   └── developer/                 # Geliştirici (24 sayfa + 17 OpenAPI servisleri)
├── changelog/                     # Changelog blog + RSS
├── src/
│   ├── css/custom.css             # UpCore tema
│   ├── components/FeedbackWidget/ # 👍/👎 widget
│   ├── theme/DocItem/Footer/      # Swizzle — feedback widget mount
│   └── pages/                     # Ana sayfa + iletişim + hukuki
├── static/
│   ├── img/                       # Logo, favicon
│   ├── openapi/                   # Eksik servis OpenAPI spec'leri (7 tane)
│   ├── robots.txt                 # AI crawler izinli
│   └── llms.txt                   # LLM rehber
└── scripts/                       # Build-time araçlar
    ├── generate-module-docs.mjs   # Content-driven doc üretici
    ├── generate-openapi-index.mjs # OpenAPI meta indeks
    └── lighthouse-check.mjs       # Lighthouse CI
```

## Komutlar

```bash
# Geliştirme
pnpm --filter @upcore/docs dev     # http://localhost:3100

# Production build
pnpm --filter @upcore/docs build

# Build'i serve et
pnpm --filter @upcore/docs serve

# OpenAPI spec'lerden API dokümanı üret
pnpm --filter @upcore/docs gen:openapi

# Lighthouse test (build sonrası)
pnpm --filter @upcore/docs lighthouse
```

## Özellikler

- **Hedef kitle bazlı sidebar** — çalışan, yönetici, İK, admin, geliştirici
- **İ18n** — Türkçe (primary) + İngilizce çerçevesi (Enterprise)
- **Algolia DocSearch** — Türkçe stemmer, kontekstuel arama
- **OpenAPI 3.1 render** — 17 servis (10 doğrudan + 7 stub)
- **"Try it out" sandbox** — docusaurus-plugin-openapi-docs
- **Feedback widget** — "Bu sayfa yardımcı oldu mu? 👍/👎" → analytics
- **Changelog + RSS** — blog-driven, otomatik feed
- **Versioning** — v1 + v2 (Docusaurus native)
- **Dark mode** — sistem tercihine göre
- **Lighthouse hedef:** SEO 95+, Performance 90+, Accessibility 95+

## Deploy

1. **Subdomain:** `docs.upcore.io` (CNAME → Azure Front Door / Cloudflare Pages)
2. **CI:** GitHub Actions build & push
3. **CDN:** Cloudflare (cache invalidation on deploy)
4. **Analytics:** Plausible (cookie-less, KVKK uyumlu)
5. **Sitemap:** `/sitemap.xml` otomatik üretim
6. **robots.txt:** Index all, AI crawler izinli

## Geri bildirim widget endpoint

`FeedbackWidget` `/api/docs/feedback` endpoint'ine JSON gönderir. Bu endpoint
`@upcore/api-gateway` üzerinde `POST /api/v1/docs/feedback` yoluna map edilir.
`DOCS_FEEDBACK_ENDPOINT` env var override için kullanılır.
