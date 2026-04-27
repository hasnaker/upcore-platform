# UpCap-TR v1.0 — Psikolojik Sermaye Ölçeği (Türkçe Uyarlama)

**Versiyon:** 1.0
**Locale:** tr-TR
**Lisans:** CC-BY 4.0
**Durum:** Bilimsel doğrulama sürecinde (provisional)
**Temel:** CPC-12 · Lorenz, Beer, Pütz & Heinitz (2016) · Compound PsyCap Scale · CC-BY 4.0
**DOI (pilot sonrası):** beklemede

---

## 1. Kapsam ve amaç

UpCap-TR v1.0, çalışanların **psikolojik sermayesini** üç faktörde ölçen 12 maddelik kısa formdur.
Luthans ve meslektaşlarının (2007) **PsyCap** (Psychological Capital) çatısı temel alınmış, Lorenz
et al. (2016) tarafından yayımlanan CPC-12 (Compound PsyCap Scale, 12 madde, CC-BY 4.0) ölçeği
Türkçeye uyarlanmıştır.

### Faktör yapısı

| Faktör (TR)        | Faktör (EN)       | Madde sayısı | Madde kodları                  |
|--------------------|-------------------|--------------|--------------------------------|
| Umut-İyimserlik    | Hope & Optimism   | 4            | upcap_01..upcap_04             |
| Dirençlilik        | Resilience        | 4            | upcap_05..upcap_08             |
| Öz-Yeterlik        | Self-Efficacy     | 4            | upcap_09..upcap_12             |

**Her faktörde 1 ters puanlı madde** vardır (upcap_04, upcap_08, upcap_12).

### Yanıt ölçeği

6-basamaklı Likert: 1 = Kesinlikle katılmıyorum → 6 = Kesinlikle katılıyorum.

---

## 2. Madde Bankası (item bank)

> Aşağıdaki madde metinleri CC-BY 4.0 kapsamındadır. Atıf verildiği sürece ücretsiz kullanılabilir.

### Faktör 1 · Umut-İyimserlik

| Kod      | Madde metni (TR)                                                                  | Ters puanlı |
|----------|-----------------------------------------------------------------------------------|-------------|
| upcap_01 | İş hedeflerime ulaşmak için şu an birçok yol bulabilirim.                         | Hayır       |
| upcap_02 | Şu an iş hedeflerimi kararlılıkla takip ediyorum.                                 | Hayır       |
| upcap_03 | İşimle ilgili olarak her zaman işlerin iyi tarafını görürüm.                      | Hayır       |
| upcap_04 | İşimde işlerin benim için her zaman ters gideceğini düşünürüm.                    | **Evet**    |

### Faktör 2 · Dirençlilik

| Kod      | Madde metni (TR)                                                                                      | Ters puanlı |
|----------|-------------------------------------------------------------------------------------------------------|-------------|
| upcap_05 | İşimdeki zorlukların üstesinden genellikle bir yolla gelebilirim.                                     | Hayır       |
| upcap_06 | İşteki aksiliklerden sonra toparlanmam uzun sürmez.                                                   | Hayır       |
| upcap_07 | İş yerinde stresli durumlarla başa çıkabilirim çünkü daha önce de benzer zorluklar yaşadım.           | Hayır       |
| upcap_08 | İşte bir terslik olduğunda uzun süre toparlanamıyorum.                                                | **Evet**    |

### Faktör 3 · Öz-Yeterlik

| Kod      | Madde metni (TR)                                                                  | Ters puanlı |
|----------|-----------------------------------------------------------------------------------|-------------|
| upcap_09 | İşimde karmaşık bir problemi analiz etmede kendime güvenirim.                     | Hayır       |
| upcap_10 | Yönetimle strateji tartışmasında kendi görüşümü savunabilirim.                    | Hayır       |
| upcap_11 | Yeni bir müşteri veya paydaşla görüşmede kendime güvenirim.                       | Hayır       |
| upcap_12 | İşimde kendimi yeterli hissetmediğim pek çok durum vardır.                        | **Evet**    |

---

## 3. Scoring Formülü

### 3.1 Ters kodlama

Ters puanlı bir madde için:

```
yeni_değer = (scale_max + scale_min) - ham_değer
           = 7 - ham_değer    (1-6 ölçeği için)
```

Örnek: upcap_04 için ham yanıt 2 → kodlanmış 5.

### 3.2 Faktör ortalaması

Her faktör için, ters kodlama sonrası 4 maddenin aritmetik ortalaması:

```
faktör_skor = (item_1 + item_2 + item_3 + item_4_reverse) / 4
```

### 3.3 Composite (toplam) skor

Üç faktör ortalamasının aritmetik ortalaması:

```
composite = (umut_iyimserlik + dirençlilik + öz_yeterlik) / 3
```

Composite ve faktör skorları **1-6 aralığında** kalır.

### 3.4 Percentile (yüzdelik)

Ham composite skoru, segment-özel norm tablosundan (sektör / yaş / cinsiyet / genel)
**lineer interpolasyon** ile yüzdelik sıraya dönüştürülür. Norm tablosunun altında /
üstünde kalan değerler uçlara sabitlenir (clamp).

### 3.5 T-skor

Klasik psikometrik dönüşüm — referans grup ortalaması 50, standart sapma 10:

```
T = 50 + 10 * (ham - mean) / sd
```

T-skor yorum bantları:

| Aralık | Yorum                              |
|--------|------------------------------------|
| ≥ 65   | Çok yüksek · psikolojik sermaye güçlü |
| 55-64  | Yüksek · ortalamanın üzerinde      |
| 45-54  | Ortalama · referans grupla tutarlı |
| 35-44  | Düşük · gelişim alanı              |
| < 35   | Çok düşük · öncelikli gelişim      |

---

## 4. Referans scoring kodu (Python 3.12)

Tam implementasyon: [`ml-services/psychometric-scoring/app/scoring/upcap_tr_scoring.py`](../../ml-services/psychometric-scoring/app/scoring/upcap_tr_scoring.py)

### 4.1 Minimal örnek

```python
from app.scoring.upcap_tr_scoring import score_upcap_tr

responses = {f"upcap_{i:02d}": 5 for i in range(1, 13)}
overall_norm = {
    "mean_score": 4.2,
    "sd_score": 0.8,
    "percentile_map": {"raw_to_pctl": {"3.0": 20, "4.0": 55, "5.0": 88}},
    "t_score_map": {"raw_to_t": {"3.0": 35.0, "4.0": 47.5, "5.0": 60.0}},
}

result = score_upcap_tr(responses, overall_norm=overall_norm)
print(result.composite_score, result.percentile, result.t_score)
```

### 4.2 Ters kodlama (Python)

```python
REVERSE = {"upcap_04", "upcap_08", "upcap_12"}
def reverse_code(item_id: str, value: int) -> int:
    return (6 + 1) - value if item_id in REVERSE else value
```

---

## 5. Norm Tablosu (Türkiye provisional)

> `N=0` pilot başlangıcı — değerler CPC-12 Avrupa referans dağılımından türetilmiş, pilot sonrası
> güncellenecektir. Versiyon yayını için `app.psychometric_scales.published_at` + DOI referansı
> bekleyiniz.

### 5.1 Genel (tüm örneklem)

| Ham skor | Percentile | T-skor |
|---------:|-----------:|-------:|
| 2.0      | 2          | 21.6   |
| 2.5      | 7          | 27.9   |
| 3.0      | 17         | 34.4   |
| 3.5      | 35         | 40.8   |
| 4.0      | 55         | 47.2   |
| 4.5      | 74         | 53.6   |
| 5.0      | 88         | 60.0   |
| 5.5      | 96         | 66.4   |
| 6.0      | 99         | 72.8   |

### 5.2 Sektör ortalamaları (provisional)

| Sektör          | Ortalama | SD   |
|-----------------|---------:|-----:|
| Kamu/Belediye   | 4.05     | 0.88 |
| Holding         | 4.35     | 0.80 |
| KOBİ            | 4.15     | 0.90 |
| Sağlık          | 3.95     | 0.92 |
| Eğitim          | 4.10     | 0.83 |

### 5.3 Yaş bandı ortalamaları (provisional)

| Yaş bandı | Ortalama | SD   |
|-----------|---------:|-----:|
| 22-30     | 4.25     | 0.85 |
| 31-45     | 4.22     | 0.83 |
| 46-60     | 4.18     | 0.82 |

---

## 6. Doğrulama Pipeline

### 6.1 Hedef kriterler (yayın öncesi)

| Kriter                  | Hedef değer                                          |
|-------------------------|------------------------------------------------------|
| Katılımcı sayısı (N)    | ≥ 300 (CFA için Kline 2015 önerisi)                  |
| Cronbach α (faktör)     | ≥ 0.85 (min 0.80)                                    |
| Cronbach α (composite)  | ≥ 0.90                                               |
| CFA · CFI               | ≥ 0.95                                               |
| CFA · TLI               | ≥ 0.95                                               |
| CFA · RMSEA             | ≤ 0.06                                               |
| CFA · SRMR              | ≤ 0.08                                               |
| Test-retest (2 hafta)   | ICC ≥ 0.75                                           |
| Convergent validity     | UWES-9 ile r ≥ 0.40, BAT-12-TR ile r ≤ -0.30         |
| Measurement invariance  | Cinsiyet × Sektör gruplarında configural + scalar    |
| DIF                     | ΔCFI ≤ 0.01 cinsiyet ve yaş grupları arası           |

### 6.2 Disclaimer kullanımı

Platform UI'de ve pazarlama içeriğinde **yalnızca** aşağıdaki kurallara uyulur:

- `validated=false` → "bilimsel doğrulama sürecinde" · T-skor ve percentile gösterilir ama
  "provisional" bayrağı aktiftir.
- `validated=true` → "Türkiye'de doğrulandı · DOI: ..." · peer-review kabul sonrası aktive edilir.

`psychometric_scales.validated` alanı peer-review yayını kabul edilip DOI alınmadan `true`
yapılamaz.

---

## 7. Etik ve KVKK

- **Etik kurul:** Bir Türkiye üniversitesi (Koç / Sabancı / Boğaziçi hedefli) İnsan Araştırmaları
  Etik Kurulu protokolü altında yürütülecektir.
- **Aydınlatılmış onam:** Türkçe + İngilizce `aydinlatilmis_onam_v1.0` metni pilotun başında
  `upcap_pilot_consents` tablosuna kaydedilir.
- **KVKK Madde 6 açık rıza:** Pilot katılımcılardan spesifik, bilgilendirilmiş ve geri alınabilir
  açık rıza alınır.
- **Veri asgariliği:** Pilot tablosu `tenant_id`, `employee_id`, ad-soyad gibi PII içermez.
  Sadece anonim demografik (sektör, yaş bandı, cinsiyet, kıdem yılı) ve yanıt vektörü toplanır.
- **K-anonymity:** Yayın öncesi tüm alt gruplar k ≥ 5 garantisi ile raporlanır.

---

## 8. Atıf (citation)

Çalışmanızda UpCap-TR kullandıysanız lütfen atıf veriniz:

```
UpCore Research Team (2026). UpCap-TR v1.0: Türkçe Psikolojik Sermaye Ölçeği.
CPC-12 (Lorenz et al. 2016) temelli Türkçe uyarlama. CC-BY 4.0.
https://upcore.io/bilim/upcap-tr-v1
```

**Temel ölçek referansı:**

```
Lorenz, T., Beer, C., Pütz, J., & Heinitz, K. (2016). Measuring Psychological Capital:
Construction and Validation of the Compound PsyCap Scale (CPC-12).
PLoS ONE, 11(4), e0152892. https://doi.org/10.1371/journal.pone.0152892
```

---

## 9. Sürüm geçmişi

| Sürüm | Tarih       | Değişiklik                                                                   |
|-------|-------------|------------------------------------------------------------------------------|
| 1.0   | 2026-04-23  | İlk kamuya açık sürüm · pilot başlatıldı · 3 faktör × 4 madde yapı kilitli   |

---

## 10. İlgili dosyalar

- Scoring: `ml-services/psychometric-scoring/app/scoring/upcap_tr_scoring.py`
- API: `ml-services/psychometric-scoring/app/api/routes_upcap_tr.py`
- Norm JSON: `ml-services/psychometric-scoring/app/norms/data/upcap_tr_v1_0.json`
- Migration: `database/migrations/057_psychometric_validation.up.sql`
- Portal UI: `apps/web/src/app/(app)/portal/upcap/page.tsx`
- Advisory Board: `apps/web/src/app/(marketing)/bilim/danisma-kurulu/page.tsx`
