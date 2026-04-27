> ⚠️ **DRAFT — Avukat onayı öncesi üretim sözleşmesi için KULLANMAYIN.**

# SLA — Service Level Agreement %99.5 (KOBİ · Growth · Platform planı)

**Sürüm:** Draft v1 · **Tarih:** 2026-04-24 · **Uygulama:** Starter / Growth / Platform planları

---

## 1. Kapsam

Bu SLA, UpCore Hizmet sağlayıcısının aşağıdaki kaynaklar için hizmet düzeyi
taahhüdüdür. MSA'nın Ek-2 parçasıdır.

---

## 2. Uptime Taahhüdü

### 2.1 Aylık uptime: %99.5

Aylık izin verilen kesinti: **3 saat 39 dakika**.

| Aylık uptime | Hizmet kredisi |
|---|---|
| ≥ 99.5% | Kredi yok |
| 99.0% – 99.5% | %10 kredi |
| 98.0% – 99.0% | %25 kredi |
| < 98.0% | %50 kredi |

### 2.2 Kredi hesaplama

Kredi = (ihlal oranı yüzdesi) × (aylık abonelik ücreti)

Örnek: Aylık fatura 5.000 TRY, aylık uptime %98.5 → 98.5 < 99.0 → %25 kredi =
1.250 TRY (bir sonraki faturada düşülür).

### 2.3 Kredi koşulları

- Müşteri, ihlalden itibaren 30 gün içinde `destek@upcore.io` adresine yazılı
  talep göndermelidir.
- Kredi, aylık bedelin %50'sini aşamaz.
- Kredi nakit iade edilmez; gelecek ay faturasından düşülür.

---

## 3. Uptime Tanımı

**Uptime:** Hizmetin müşteri tarafından erişilebilir ve beklenen şekilde çalışır
durumda olduğu toplam sürenin aylık toplam süreye oranı.

**Sayılmaz (excluded downtime):**

- Planlı bakım (Pazar gecesi 02:00-06:00 TR, 72 saat önceden duyurulur)
- Müşteri kaynaklı sorunlar (çalışan verisi hatalı yüklenmesi vs.)
- Azure, Clerk, Iyzico gibi 3. taraf servis kesintileri (UpCore makul çabayı
  gösterir, ancak kredi doğurmaz)
- Güvenlik olayı nedeniyle zorunlu askıya alma
- Mücbir sebepler

**Ölçüm:** `status.upcore.io` uptime probe (30 saniye interval) resmî ölçüdür.

---

## 4. Performans Hedefleri

| Metrik | Hedef |
|---|---|
| API p50 latency | ≤ 150ms |
| API p95 latency | ≤ 400ms |
| API p99 latency | ≤ 800ms |
| Ana sayfa TTFB | ≤ 300ms |
| Pulse anket gönderim başarı oranı | ≥ %99.5 |

Performans hedefi ihlalleri tek başına kredi doğurmaz — uptime hesabına
girmez. Ancak sürekli ihlal MSA Madde 10.2 kapsamında materyal ihlal sayılabilir.

---

## 5. Destek

| Plan | Kanallar | Yanıt SLA |
|---|---|---|
| Starter | E-posta | 48 iş saati |
| Growth | E-posta + chat | 8 iş saati |
| Platform | E-posta + chat + telefon | 4 iş saati |

Çalışma saatleri: Pazartesi-Cuma 09:00-18:00 TR.

**Acil durum:** `destek-acil@upcore.io` — her zaman 1 saat içinde ack.

---

## 6. İstisnalar

- Free/Trial plan kullanıcılarına bu SLA uygulanmaz.
- Ödeme gecikmesi 30+ gün olan hesaplar SLA kapsamı dışındadır.
- Müşteri'nin beta/preview modüllere erişimi "as-is" sunulur, SLA yok.

---

## 7. İletişim

- **Status page:** https://status.upcore.io
- **Destek:** destek@upcore.io
- **Hukuk:** hukuk@upcore.io
