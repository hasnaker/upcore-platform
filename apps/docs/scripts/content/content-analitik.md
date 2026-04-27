===PAGE id=genel-bakis title=Analitik modülü — genel bakış pos=1===
# Analitik modülü — genel bakış

UpCore analitik modülü; executive dashboard, bias denetim, ROI hesap, yıllık rapor üretimini merkezi olarak sunar.

## Bileşenler

- **Executive dashboard** — board-seviye özet
- **Bias denetim** — algoritmic audit
- **ROI hesap** — İK yatırımının iş sonuçlarına etkisi
- **Yıllık rapor** — kapsamlı üretim
- **Departman karşılaştırma** — kıyaslama
- **Trend analizi** — zaman serisi
- **Tahmin modelleri** — geleceğe dönük tahminler
- **İhracat entegrasyon** — Power BI, Tableau, Metabase bağlantı

## Veri kaynakları

- Pulse anketleri (Sürdürme modülü)
- Performans skorları
- Bordro + izin + SGK verileri
- Mobility akışı
- Öğrenme yolu ilerleme
- Müdahale etkileri
- Dış veriler: piyasa maaş benchmarks, sektör ortalamaları

## Gerçek zamanlılık

- Canlı veri: 5 dakika gecikmeli
- Analytical workloads (agrega rapor): 1 saat gecikmeli (performans için)
- Tahmin modelleri: gecelik retrain
- Bias denetim: haftalık

## Veri dili

Kullanıcı dili tercihine göre Türkçe/İngilizce görsel + terminoloji.

===PAGE id=executive-dashboard title=Executive dashboard pos=2===
# Executive dashboard

CEO/CHRO/Yönetim Kurulu için tek sayfalık özet.

## Ana KPI'lar

### Bağlılık ve sağlık
- Ortalama bağlılık skoru (UWES-9)
- Tükenmişlik risk haritası (BAT-TR)
- Pulse katılım oranı
- Çalışan NPS (eNPS)

### Performans
- OKR ortalama tamamlanma
- Performans skoru dağılımı
- 9-kutu dağılımı

### Mobilite
- İç/dış işe alım oranı
- Kritik pozisyon doluluk
- Ayrılma oranı (voluntary + involuntary)

### Operasyon
- Toplam çalışan sayısı (trend)
- Cinsiyet dağılımı
- Yaş dağılımı
- Ortalama kıdem

### Maliyet
- Toplam personel maliyeti / gelir
- Eğitim bütçesi kullanımı
- İşe alım maliyeti / kazanılan FTE
- Ayrılma maliyeti

## Görsel tasarım

- Maks 6 KPI kart (bilişsel yük)
- Trend oku (▲▼■)
- Renk kodu (yeşil/sarı/kırmızı)
- Tooltip: detaylı açıklama

## Hedefler

Her KPI için:
- Şirket hedefi (yıllık)
- Sektör ortalaması
- En iyi sektör benchmark

## Drill-down

Kart tıklaması → detay sayfası:
- Departman kırılımı
- Zaman serisi
- Alt-metrik breakdown

## Bildirim

- Kritik KPI sapması → e-posta
- Haftalık özet
- Aylık yönetim kurulu raporu (otomatik PDF)

===PAGE id=bias-denetimi title=Bias denetimi pos=3===
# Bias denetimi

Algorithmic fairness audit — her karar destek modeli için.

## Neden bias denetim?

- İnsan kararlarında bias var (proven, 100+ yıllık araştırma)
- ML modelleri insan verisinden öğrenir — bias'ı öğrenir
- İK kararları yasal olarak ayrımcılık yasağı altında (İş K. md. 5, KVKK md. 22)
- Yeterince büyük şirketlerde yıllık audit yasal gereksinim

## Protected attributes

UpCore bu özniteliklere göre denetim yapar:
- **Cinsiyet**
- **Yaş** (18-25, 25-35, 35-45, 45-55, 55+)
- **Etnik köken** (gönüllü veri, az şirket)
- **Engellilik** (evet/hayır)
- **Annelik durumu** (kadın, 35 yaş altı)

## Denetim metriği

### 1. Disparate Impact (DI)
```
DI = P(olumlu sonuç | protected group) / P(olumlu sonuç | referans grup)
```

- DI < 0.80 → kritik bias (4/5 kural, ABD EEOC)
- DI 0.80-1.25 → normal
- DI > 1.25 → ters bias (gen. az, ama kontrol)

### 2. Equalized Odds
False positive rate + false negative rate grupları arasında eşit olmalı.

### 3. Demographic Parity
Seçim olasılıkları gruplar arasında eşit olmalı.

### 4. Calibration
Skorlar gruplar arasında eşit kalibre edilmiş olmalı.

## Hangi kararlarda denetim?

UpCore otomatik her karar için:
- İşe alma (ATS)
- Zam / terfi
- Bonus
- PIP (performans iyileştirme)
- Müdahale seçimi (Thompson sampling)
- Succession pool
- Öğrenme yatırımı
- Fesih

## Raporlama

Her çeyrek:
- Protected attribute × karar matrisi
- DI hesapları
- Anomali işaretleme
- Root cause analizi
- Düzeltme önerileri

## Düzeltme aksiyonları

Bias tespit edildiğinde:
- **İnsan kararları:** Eğitim, bilinçlendirme, blind review
- **ML modeller:** Yeniden eğitim (fairness constraints ile), feature düzeltme, post-processing
- **Süreç:** Karar verme protokolü revize (örn. panel chat ile karar)

## Fairness/accuracy trade-off

- Fairness constraint → doğruluk %3-7 düşer
- UpCore default: fairness > accuracy (etik öncelik)
- Shadow mode: her iki versiyon karşılaştır, sonuç yayımla

## Audit raporu yayını

- Yıllık public rapor (KVK Kurulu önerisi)
- Anonim agrega — rakip bilgisi yok
- Sektör için benchmark oluşturur

## Yasal çerçeve

- İş Kanunu Madde 5 — ayrımcılık yasağı
- KVKK Madde 22 — otomatik karar yasağı (insan onayı olmadan)
- AB EU AI Act (2024+) — yüksek riskli AI sistemler için audit zorunluluğu

===PAGE id=roi-hesabi title=ROI hesabı pos=4===
# ROI hesabı

İK yatırımlarının iş sonuçlarına getirisini hesaplama.

## İK modül başına ROI

### Sürdürme (pulse)
- Yatırım: yıllık lisans + İK zamanı
- Kazanç: azalan tükenmişlik → daha düşük ayrılma oranı → işe alım tasarrufu

### Koruma (müdahale)
- Yatırım: müdahale maliyeti (koç/psikolog/eğitim)
- Kazanç: Cohen's d ≥ 0.4 → performans artış + devamsızlık azalış

### Performans (OKR + 360)
- Yatırım: modül + yönetici zamanı
- Kazanç: hedeflere ulaşma + şirket geliri artış

### Mobility (succession)
- Yatırım: gelişim programları + eğitim
- Kazanç: dış işe alım tasarrufu + kritik pozisyon risk azaltma

## Hesap yöntemleri

### 1. A/B test (rigorous)
- Rastgele 2 gruba bölme
- Müdahale var/yok
- Sonuçları karşılaştırma
- Etik zor: "kontrol grubuna bir şey yapılmasın" iK kabul etmez

### 2. Propensity score matching
- Müdahale alan vs eşdeğer profil almayanları eşleştir
- Karşılaştırma
- İstatistiksel dengeleme

### 3. Regression discontinuity
- Eşik altı/üstü karşılaştırma
- Ayrı tedavi grupları
- Causal inference

### 4. Difference-in-differences
- Önce/sonra × müdahale/kontrol
- Zaman trendi etkisini arındır

## Genel formül

```
ROI = (Toplam kazanç - Toplam yatırım) / Toplam yatırım × 100
```

Örnek: Tükenmişlik müdahale programı
- Yıllık yatırım: 500 000 TRY
- Tasarruf: %15 daha az ayrılma × 50 çalışan × 50 000 TL işe alım = 375 000 TRY
- Devamsızlık azalış: %10 × 500 gün × 2 000 TL = 100 000 TRY
- Performans artış: ölçülmesi zor, ihtiyatlı %2-3 tahmin

ROI = (475 000 - 500 000) / 500 000 = -%5 (yıl 1)
Yıl 2+: ROI = ~%50-100 (kurulum maliyeti amorti eder)

## Süre etkisi

- Kısa vade: yatırım > kazanç (nadir ROI negatif)
- Orta vade (1-3 yıl): break-even
- Uzun vade (3+ yıl): güçlü ROI

Sabırlı olmak — İK yatırımının ROI'si yazılım geliştirme ROI'sinden yavaş.

## Sektör benchmark

Şirket başarısızlık durumları:
- Yüksek turnover sektörleri (retail, hospitality): %8-15
- Düşük turnover sektörleri (teknoloji, finans): %4-8
- Kamu: %2-5

Her %1 turnover azalışı: 1-2% gelir artışı.

## Raporlama

CFO için çeyrek rapor:
- Her modül × yatırım × kazanç
- Toplam ROI
- Gelecek yıl tahmin

===PAGE id=yillik-rapor title=Yıllık rapor pos=5===
# Yıllık rapor

UpCore yıl sonunda kapsamlı rapor üretir.

## İçindekiler

1. **Executive summary** (2 sayfa)
2. **Çalışan sağlığı** — bağlılık, tükenmişlik trendleri
3. **Performans** — OKR, 360, 9-kutu dağılımları
4. **Mobilite** — iç/dış akış, succession durum
5. **Öğrenme** — eğitim bütçesi, sertifikalar, etki
6. **Çeşitlilik ve kapsayıcılık** — demografik analiz, bias denetim
7. **Operasyon** — bordro özeti, SGK rapor, izin kullanımı
8. **KVKK uyum** — Madde 11 talepleri, VERBIS, ihlal (varsa)
9. **Maliyetler** — yıllık toplam, kategori
10. **Sonraki yıl öneri** — stratejik fırsatlar

## Üretim akışı

1. **12 Aralık:** Taslak otomatik oluşur
2. **15 Aralık:** İK ekibi inceler, düzenler, hikaye ekler
3. **20 Aralık:** CHRO onayı
4. **28 Aralık:** CFO + CEO incele
5. **5 Ocak:** Yönetim kuruluna sunum

## PDF dağıtım

- Yönetim kurulu (tam rapor)
- Yöneticiler (özet + kendi departman)
- Çalışanlar (kamu özeti, hassas veri yok)
- Bağımsız denetim (KVKK rapor kısmı)

## Hukuki dokümanlar

Yıllık rapor bazı hukuki belgeler için girdi:
- VERBIS beyan güncellemesi
- Yıllık İSG raporu
- Bağımsız denetim raporu (enterprise)
- Borsa listelenmiş şirketlerde yıllık faaliyet raporu bölümü

## Benchmark dahil

UpCore diğer tenant'ların anonim agregalarından sektör karşılaştırma ekler:
- "Sizin sektörünüzde ortalama turnover %12 — siz %8"
- "Sektör ortalaması eğitim bütçesi 12 000 TRY/çalışan — siz 18 000"
- "Sektör ortalaması bağlılık skoru 3.4/5 — siz 3.9"

## İç benchmark (yıl-yıl)

Önceki 3 yıl karşılaştırma:
- 2024: ...
- 2025: ...
- 2026: ...

Trendler + sebep analizi.

## Araştırma verileri

- Akademik yayın önerisi (TUBITAK, araştırma fonları)
- Yıllık sektör analizi (public)
- Policy brief (kamu paylaşım için)

===PAGE id=departman-karsilastirma title=Departman karşılaştırma pos=6===
# Departman karşılaştırma

Farklı departmanların kıyaslanması.

## Karşılaştırma boyutları

- Bağlılık skoru
- Tükenmişlik risk
- Pulse katılım
- Performans skoru
- OKR tamamlanma
- Turnover oranı
- İç mobilite
- Eğitim bütçesi kullanımı
- Yıllık izin kullanım ortalaması
- Overtime saati
- Devamsızlık (hastalık izin günü)

## Normalizasyon

Büyüklük / sektör fark eden departmanları karşılaştırmak için:
- Z-skor normalizasyonu
- Yüzde agrega
- Departman-spesifik benchmark

## Görselleştirme

### Bar grafiği
- Her departman × metrik
- Benchmark çizgisi (sektör ortalaması, şirket ortalaması)

### Heatmap
- Departman × metrik matrisi
- Renk kodu: yeşil = iyi, kırmızı = dikkat

### Radar grafiği
- Tek departman çok boyut
- Diğer departmanlarla overlay

## Outlier analizi

İstatistiksel anomali:
- Z-skor > 2 → kritik sapma
- IQR dışında → outlier
- Nedeni araştır:
  - Yönetici etkisi
  - İş yapısı farkı
  - Ekip dinamiği
  - Sektörel etki

## Best practice paylaşım

Yüksek performans gösteren departmanlardan:
- Ne farklı yapıyorlar?
- Yöneticinin liderlik tarzı
- Ekip ritüelleri
- Aday pratikler

UpCore "Inside Stories" bölümünde paylaşılabilir (tenant onayı ile).

## Eşit olmayan karşılaştırma

Bazı departmanlar **doğası gereği** zor:
- Çağrı merkezi — yüksek stres
- Üretim — mekanik iş
- Sağlık — duygusal iş

Karşılaştırma yaparken bu bağlamı göz ardı etmeyin.

## Trend karşılaştırma

Tek anlık değil, zaman içinde:
- Departman A: 6 ayda %15 iyileşme
- Departman B: sabit ama seviye yüksek
- Departman C: kademeli kötüleşme

İyileşme trendi > yüksek stabil skor (farklılık önemli).

===PAGE id=trend-analizi title=Trend analizi pos=7===
# Trend analizi

Zaman serisi analizi — zaman içinde KPI değişimleri.

## Analiz türleri

### 1. Lineer trend
- Haftalık / aylık çizgi grafik
- Ortalama eğim
- Anlamlı mı (t-test)

### 2. Mevsimsellik
- Yıllık patern
- Aylık/çeyreklik sezon
- Dini-ulusal tatil etkisi
- Yaz tatili etkisi (izin sezonu)

### 3. Değişim noktası
- Önemli değişim nerede başladı?
- Statistical change point detection
- Olay ile ilişkilendirme (örn. yeni CEO atandı)

### 4. Anomali
- Beklenenden sapma
- Control chart (UCL/LCL)
- Bildirim tetikleme

### 5. Causal inference
- "X yapıldıktan sonra Y değişti"
- Correlational değil, causal
- Propensity score, IV, RDD

## UpCore araçları

### Zaman serisi grafiği
- Çizgi grafik + güven aralığı
- Hedef çizgisi
- Olay etiketleri

### Forecast
- Gelecek 3-6 ay projeksiyon
- ARIMA / Prophet / LSTM model
- Güven aralığı

### Decomposition
- Trend + seasonal + residual
- Seasonal adjustment
- Noise filtrasyonu

### Correlation matrix
- Hangi KPI'lar birlikte hareket ediyor?
- Lead/lag ilişkisi
- Causal hypothesis

## Data quality

Trend analizi için:
- **Minimum 12 ay veri** (mevsimsellik yakalanması için)
- **Tutarlı sorgu tanımı** (eş tanım)
- **Outlier temizleme** (data error kaldırma)
- **Missing data imputation** (interpolation)

## Yaygın hatalar

1. **Trend görmedi:** Noise içinde gerçek trend var ama gözardı edildi
2. **Trend gördü ama yok:** Rastgele noise'i trend sandı (confirmation bias)
3. **Seasonal karıştırma:** Yaz düşüşü normal, panik yapma
4. **Correlation vs causation:** İki değişken birlikte hareket eden mutlaka causal değildir

## Narrative layer

Trend grafiğinin yanında **hikaye**:
- "Q1'de bağlılık skorumuz 15% düştü. Eş zamanlı olarak 3 kıdemli müdürümüz ayrıldı. İki faktör bağlantılı olabilir."
- Kanıta dayalı anlatım

## Executive rapor dahil

Yıllık / çeyrek raporlarda trend bölümü:
- Top 3 iyileşen KPI
- Top 3 kötüleşen KPI
- Anomaliler ve açıklamalar
- Forecast

===PAGE id=tahmin-modelleri title=Tahmin modelleri pos=8===
# Tahmin modelleri

Geleceğe yönelik tahminler — geleceğe hazırlıklı olmak için.

## Tahmin türleri

### 1. Ayrılma tahmini
- 90 gün içinde kim ayrılacak?
- [Ayrılış risk tahmini](/docs/ik/modul/mobility/ayrilis-risk-tahmini) detayı

### 2. Tükenmişlik tahmini
- 6 ay içinde kimler kırmızı banda düşecek?
- Erken müdahale için

### 3. Performans tahmini
- Çeyrek sonu performans skoru?
- Risk yönetimi (PIP öncesi)

### 4. İşe alım ihtiyacı
- Önümüzdeki yıl kaç FTE gerekli?
- Departman büyümesi + ayrılma

### 5. Bütçe tahmini
- Personel maliyeti projeksiyon
- Zam + yeni işe alım + ayrılma etkisi

### 6. Eğitim ihtiyacı
- Hangi yetkinlik açıkları büyüyecek?
- Önerilen programlar

## Model tipleri

- **Time series:** ARIMA, Prophet, LSTM
- **Classification:** XGBoost, Random Forest (ayrılma, tükenmişlik)
- **Regression:** Elastic Net (performans skoru)
- **Clustering:** K-means, HDBSCAN (profil segmentasyonu)
- **Causal:** Double ML (müdahale etkisi)

## Uncertainty quantification

Tahminler nokta değeri değil, aralık:
- %50 güven aralığı
- %90 güven aralığı
- Scenario planning

## Kalibrasyon

- Brier score
- Reliability diagram
- Calibration curve

Miscalibrated model → yanıltıcı tahmin.

## Retrain sıklığı

- Kritik modeller: çeyrek
- Orta kritik: 6 ay
- Statik durumlar: yıllık
- Data drift tespiti → otomatik tetikleme

## Açıklanabilirlik

- **SHAP values** — her özelliğin tahmin üzerine etkisi
- **Feature importance** — genel
- **What-if analysis** — parametre değiştirme
- **Counterfactual explanation** — "ne değişse sonuç ters olurdu?"

Çalışan kendi tahmin açıklamasını isteyebilir (KVKK Madde 11/g).

## Etik sınırlar

- Hiçbir tahmin kendi başına karar değil
- İnsan yöneticisi değerlendirir
- Tahmin → retention aksiyonu (negatif karar değil)
- Bias denetim zorunlu

===PAGE id=ihracat-entegrasyon title=İhracat ve entegrasyon pos=9===
# İhracat ve entegrasyon

Analitik verilerinin dış sistemlere aktarımı.

## Desteklenen destinationlar

### BI araçları
- **Power BI** — DirectQuery / Import
- **Tableau** — Tableau Connector
- **Looker** — LookML model
- **Metabase** — SQL direct (read-only replica)
- **Amazon QuickSight** — S3 export

### Data warehouse
- **Snowflake** — Snowflake Connector
- **BigQuery** — BigQuery Transfer Service
- **Azure Synapse** — pipeline
- **Redshift** — COPY command

### Export formatlar
- CSV — günlük otomatik
- Parquet — büyük veri
- JSON — API-driven
- Excel — İK raporlama

## Export türleri

### 1. Tam export (full dump)
- Tüm veri snapshot
- Tipik nightly
- Tam tarih geçmişi

### 2. Delta export (incremental)
- Son N saat/gün
- Daha hızlı, daha küçük
- Timestamp-based

### 3. Streaming
- Real-time (< 1 dakika)
- Kafka, Kinesis
- Enterprise özellik

## API'lar

- **REST API:** paginated, bearer token
- **GraphQL:** esnek sorgu (beta)
- **Webhook:** event-driven push
- **SQL access:** read-only replica (Enterprise)

## KVKK uyumluluğu

Export öncesi:
- **Anonymization** (TCKN maskeleme, hash)
- **Field selection** (sadece gerekli alanlar)
- **Retention** (ihracat verilerinin silinme politikası)
- **Alt işleyici sözleşme** (KVKK md. 12)

## Audit log

Her export kayıt edilir:
- Kim
- Ne zaman
- Hangi veri kümesi
- Amacı
- Destination sistem

## Şifreleme

- Transit: TLS 1.3
- At-rest: AES-256-GCM
- Key management: Azure Key Vault / AWS KMS

## Sample SQL erişim

```sql
-- Pulse anonim agregat örneği
SELECT
  department_id,
  DATE_TRUNC('month', response_at) AS month,
  AVG(bat_total_score) AS avg_score,
  COUNT(*) AS n
FROM app.pulse_responses_anonymous
WHERE response_count >= 5  -- k-anonimlik
GROUP BY department_id, month
ORDER BY month DESC;
```

## Rate limit

- REST API: 1 000 req/dk (tenant başına)
- SQL erişim: 50 eş zamanlı sorgu
- Export: 10 GB/gün (Starter), 100 GB/gün (Enterprise)

===PAGE id=sikca-sorulanlar title=Analitik — sıkça sorulanlar pos=10===
# Analitik — sıkça sorulanlar

## Veriler ne kadar gerçek zamanlıdır?

- Dashboard: 5 dakika gecikmeli
- Rapor: 1 saat
- ML tahmin: günlük
- Bias denetim: haftalık

## Başka bir BI tool kullanıyorum — entegre edebilir miyim?

Evet — Power BI, Tableau, Looker, Metabase destekleniyor. Enterprise'da SQL direct read-only. Starter'da CSV export yeter.

## Neden haftalık bias denetim?

Daha sık = gürültülü rapor, aksiyon üretmez. Haftalık: anlamlı trend yakalar, aksiyonable.

## Executive dashboard'u whitelabel yapabilir miyim?

Enterprise planı: evet. Kendi logo, renk, başlık. API-driven custom widget.

## Veri kaynaklarımı birleştirebilir miyim?

BI tool içinde UpCore verisi + kendi ERP + CRM birleştirme yapılabilir. UpCore içine başka veri import şu an yok (roadmap 2027).

## Yıllık rapor kimin için?

- Yönetim Kurulu
- CFO / CHRO / CEO
- Bağımsız denetim
- KVKK/VERBIS yıllık beyan
- Public faaliyet raporu (listed şirketler için)

## Tahmin modelleri yanlış çıkarsa sorumluluk kime?

UpCore model önerileri **karar destek**, karar değildir. Sorumluluk: **insan yöneticisi** (KVKK md. 22 uygun). UpCore yanlış tahmin için sorumluluk kabul etmez ama:
- Model doğruluğunu sürekli izler
- Kalibrasyon <%70 düşerse retrain
- Transparentlık rapor — %95 güven aralığı her tahminde
