> ⚠️ **DRAFT — Avukat onayı öncesi üretim sözleşmesi için KULLANMAYIN.**

# SLA — Service Level Agreement %99.9 (Enterprise planı)

**Sürüm:** Draft v1 · **Tarih:** 2026-04-24 · **Uygulama:** Enterprise planı
(custom MSA imzalamış 1000+ çalışan müşteri)

---

## 1. Kapsam

Bu SLA, Enterprise müşterileri için geçerlidir. MSA'nın Ek-2 parçasıdır.

---

## 2. Uptime Taahhüdü

### 2.1 Aylık uptime: %99.9

Aylık izin verilen kesinti: **43 dakika 49 saniye**.

| Aylık uptime | Hizmet kredisi |
|---|---|
| ≥ 99.9% | Kredi yok |
| 99.5% – 99.9% | %15 kredi |
| 99.0% – 99.5% | %30 kredi |
| 98.0% – 99.0% | %50 kredi |
| < 98.0% | %100 kredi (o ayki tam iade) |

### 2.2 Yıllık uptime: %99.95 (opsiyonel premium taahhüt)

Enterprise müşteriler ek bedel karşılığı %99.95 yıllık uptime alabilir.
Yıllık izin verilen kesinti: **4 saat 23 dakika**.

### 2.3 Kredi koşulları

- Müşteri, ihlalden itibaren 60 gün içinde yazılı talep göndermelidir.
- Kredi, aylık bedelin %100'ünü aşamaz.
- Kredi bir sonraki faturadan düşülür veya yıl sonunda nakit iade seçeneği.

---

## 3. Uptime Tanımı

**Uptime:** Hizmetin müşteri tarafından erişilebilir ve beklenen şekilde çalışır
durumda olduğu toplam sürenin aylık toplam süreye oranı.

**Sayılmaz (excluded downtime):**

- Planlı bakım (Pazar gecesi 02:00-06:00 TR, 7 gün önceden duyurulur,
  Enterprise için opt-out mümkün)
- Müşteri kaynaklı sorunlar
- Azure region-level outage'lar (ancak UpCore 60 dakika içinde failover region'a
  geçiş başlatmalıdır — geçiş yapılmazsa SLA kapsamına girer)
- Mücbir sebepler

**Ölçüm:** `status.upcore.io` + üçüncü taraf Pingdom probe (15 saniye interval)
birleştirilir. İhtilaf halinde üçüncü taraf log'u esastır.

---

## 4. Performans Hedefleri (Binding)

Enterprise için performans hedef ihlalleri de kredi doğurur:

| Metrik | Hedef | İhlal kredisi |
|---|---|---|
| API p95 latency | ≤ 250ms | Aylık ortalama p95 > 250ms → %5 kredi |
| API p99 latency | ≤ 500ms | Aylık ortalama p99 > 500ms → %5 kredi |
| Ana sayfa TTFB | ≤ 200ms | — |
| Pulse anket gönderim başarı | ≥ %99.9 | < 99.9% → %5 kredi |
| DB query p95 | ≤ 50ms | — |

Birden fazla metrik ihlali birleşik kredi yaratır; toplam aylık bedelin %50'sini
geçmez (Madde 2.1'e ek olarak).

---

## 5. Destek & On-Call

| Kanal | Yanıt SLA (P0) | Yanıt SLA (P1) |
|---|---|---|
| PagerDuty | 15 dk | 1 saat |
| E-posta acil | 15 dk | 1 saat |
| Telefon (dedicated) | 15 dk | 1 saat |

**P0 tanımı:** Müşteri üretim operasyonu tamamen durmuş, çalışan verilerine
erişim yok veya güvenlik olayı.

**24/7 on-call destek** dahildir. Dedicated TAM (Technical Account Manager)
atanır.

---

## 6. Veri Güvenliği & Compliance Taahhütleri

- ISO 27001 sertifikası (2026-Q4 hedefi — o zamana kadar hazırlık taahhüdü)
- SOC 2 Type II raporu (2026-Q4 hedefi)
- Yıllık penetration test raporu paylaşımı
- KVKK veri ihlali bildirimi 24 saat içinde (regülasyondaki 72 saat yerine
  Enterprise için sıkılaştırılmış)
- DPA SCC eki dahildir

---

## 7. Disaster Recovery

| Metrik | Hedef |
|---|---|
| RPO (Recovery Point Objective) | ≤ 15 dakika |
| RTO (Recovery Time Objective) | ≤ 60 dakika |
| PITR window | 35 gün |
| Geo-redundant backup | Evet (northeurope) |

RTO/RPO ihlali SLA kredisi doğurur (Madde 2.1).

---

## 8. İstisnalar

- Müşteri onayı olmadan modüle yapılan değişiklikler SLA dışıdır.
- Özel entegrasyonlar (müşteri API, webhook) ayrı SLA belgelerine tabidir.

---

## 9. Çıkış Planı (Exit Plan)

Fesih kararında UpCore 180 gün (Enterprise için MSA 90 gün yerine uzatılmış)
salt-okunur arşiv + `pg_dump` export sağlar. Veri taşıma sürecinde ücret talep
edilmez.

---

## 10. İletişim

- **24/7 Acil:** oncall@upcore.io (pager)
- **TAM:** atanan TAM @upcore.io
- **Hukuk:** hukuk@upcore.io
