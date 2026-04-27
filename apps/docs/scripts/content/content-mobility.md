===PAGE id=genel-bakis title=Mobility modülü — genel bakış pos=1===
# Mobility modülü — genel bakış

Mobility modülü **iç mobilite yatırımıyla dış işe alım maliyetini 6× azaltmayı** hedefler.

## İstatistikler

- Dış işe alım ortalama maliyeti: 15 000 – 60 000 TRY (rol bazında)
- İç rotasyon maliyeti: ~2 500 TRY (onboarding + eğitim)
- Dış kayıp maliyeti: çıkış yapmadan önce 6-9 ay tükenmişlik işe alım maliyetine ekleniyor
- İç mobilite odaklı şirketlerde ayrılma oranı %23 daha düşük (LinkedIn 2023)

## Bileşenler

- **İç ilan marketplace** — çalışanların kendi içinde başvurabildiği pozisyonlar
- **Succession pipeline** — kritik pozisyon yedek havuzu
- **Kariyer yolu editörü** — pozisyon-to-pozisyon geçiş haritası
- **Rotasyon iş akışı** — geçici görev / kalıcı transfer
- **9-kutu entegrasyon** — yüksek potansiyel → succession pool otomatik
- **Ayrılış risk tahmini** — ML model, 90 gün horizon
- **Maliyet analizi** — iç mobilite vs dış işe alım

## Paydaşlar

- **Çalışan:** Fırsatları görür, başvurur
- **İK:** Marketplace operasyonu, succession pool yönetimi
- **Yönetici:** Ekibinden ayrılacak çalışan için replacement planı
- **Mevcut yönetici (hedef):** Yeni gelecek çalışanı değerlendirme

===PAGE id=ic-ilan-marketplace title=İç ilan marketplace pos=2===
# İç ilan marketplace

Şirket içi **pozisyon borsası** — çalışan dışarı bakmadan içeride fırsat bulsun.

## Çalışan tarafı

### Başvuru akışı

1. **İç ilanlar** sayfası — filtre: departman, lokasyon, kıdem gereksinimi
2. Pozisyon detayı: sorumluluklar, gerekli yetkinlikler, maaş aralığı
3. **Başvur** butonu — kısa motivasyon yazısı (200 kelime)
4. Mevcut yönetici otomatik bilgilendirilir (şeffaflık — 3 iş günü önceden)
5. Hedef yönetici ile görüşme

### Gizlilik seçenekleri

- **Açık başvuru:** Mevcut yönetici görür
- **Gizli başvuru:** Sadece mülakat aşamasında bilgilendirilir (İK filtrelemesi yapar)

## İK tarafı

### İlan açma

- Dahili yeni pozisyon veya açılan pozisyon
- Minimum kıdem: ör. 1 yıl
- Minimum performans skoru: ör. 3.0/5
- Departman rotasyon kuralı: mevcut pozisyonda min 6 ay olmak
- Başvuru son tarih

### Eşleştirme motoru

- Çalışan kariyer hedefi + yetkinlik haritası → ilanlarla ML eşleştirme
- Push notifications: "profilinize uygun 3 ilan yayımda"

### Dış ilan önce ilerleme kuralı

Enterprise tenant'larda:
- İç ilan **7 gün açık** kalır
- 7 gün sonunda aday yoksa dış ilana açılır
- Bu politika **İK politika dokümanında** imza altına alınır (çalışan güveni)

## Yönetici tarafı

### "Çalışanım başvurdu" bildirimi

Yönetici:
- Başvuruyu **bloklayamaz** (iç hareket hakkı)
- Kontra-teklif yapabilir (zam, yeni proje, yeni yetki)
- Replacement planı düşünmesi için süre vardır

### Replacement planı

- Mevcut çalışan 30 gün sonra yeni role geçecek
- Yeni ekibine alınacak yerine:
  - İç rotasyon (başka birinin kariyer fırsatı)
  - Dış işe alım (ATS modülü)
  - Rol değişimi (yeniden örgütleme)

## Metrikler

- İç başvuru oranı: iç ilan sayısı / toplam ilan (hedef > %60)
- İç yerleştirme oranı: iç başvuru → işe alma (hedef > %30)
- Dış işe alım / iç mobilite oranı (hedef < 2.0)

Executive dashboard'da bu metrikler quarterly gösterilir.

===PAGE id=succession-pool title=Succession pipeline (kritik pozisyon yedek havuzu) pos=3===
# Succession pipeline (kritik pozisyon yedek havuzu)

## Kritik pozisyon tanımı

Kritik pozisyon = ayrıldığında şirket için **büyük risk** oluşturan pozisyon.

Kriterler (biri yeterli):
- Stratejik önemi yüksek (CEO, CTO, CFO, CHRO)
- Alanında nadir yetkinlik (Chief AI Scientist, domain uzmanı)
- Müşteri ilişkisi kişisel (Key Account Manager)
- Süreçte kritik nokta (Ar-Ge baş tasarımcı)

## Ready level sınıflaması

Her kritik pozisyon için 3 kategoride potansiyel adaylar:

| Kategori | Anlam | Sayı (öneri) |
|---|---|---|
| **Ready now** | Yarın o rolde başlayabilir | 1-2 |
| **Ready in 1 year** | 1 yıl gelişim ile hazır olur | 2-3 |
| **Ready in 2 years** | 2 yıl içinde hazırlanır | 3-4 |

Toplam succession pool = 6-9 aday / pozisyon.

## Değerlendirme kriterleri

- 9-kutu kutusu (yüksek potansiyel filtre)
- Yetkinlik değerlendirme (rol gereksinimleri vs mevcut)
- Liderlik potansiyeli (yönetici değerlendirmesi)
- Çalışan kendi kariyer tercihi (willing to move)
- Eş/aile durumu (lokasyon gerektiren roller için)

## Gelişim planı

Her succession aday için:
- **Gap analizi:** Hangi yetkinlikler eksik?
- **Gelişim aksiyonları:**
  - Eğitim programları
  - Mentor ataması (mevcut üst)
  - Cross-functional proje
  - Yurtdışı rotasyon
  - Executive education (INSEAD, HBS, Koç)
- **Takip ritmi:** Çeyrek review

## Gizlilik

Aday **gelişim alanı** olarak bilgilendirilir ama specifik pozisyon **gizli tutulur**:

İyi: "Seni liderlik becerilerini geliştirmek için bu eğitime gönderiyoruz"
Kötü: "CEO için hazırlanıyorsun"

Sebep: vaat edip yerine getirememek → ciddi demotivasyon + hukuki risk.

## 9-kutu entegrasyon

9-kutu A1 (yüksek perf, yüksek pot) kutusundakiler otomatik öneri olarak succession pool'a girer. İK onay ile havuz güncellenir.

## Risk izleme

UpCore otomatik hesaplar:
- Her kritik pozisyon için **boşluk riski skoru** (mevcut kişi kalma olasılığı × replacement hazırlığı)
- Aylık CHRO raporu
- Kritik: herhangi bir pozisyon için 0 ready-now aday varsa uyarı

## Bias denetim

Her kalibrasyon sonrası:
- Succession pool'da cinsiyet dağılımı
- Yaş dağılımı
- Etnik köken dağılımı (opsiyonel, gönüllü veri)

Dengesizlik → üst yönetim incelemesi.

===PAGE id=kariyer-yolu title=Kariyer yolu editörü pos=4===
# Kariyer yolu editörü

Çalışanlara şeffaf kariyer yolları göstererek mobilite motivasyonu arttıran modül.

## Kariyer yolu haritası

Drag-and-drop editörde roller arasında:
- **Dikey geçiş** (terfi): Junior → Mid → Senior → Lead → Principal
- **Yatay geçiş** (rotasyon): Backend Developer → Data Engineer
- **Yönetim yoluna geçiş:** Senior Developer → Engineering Manager
- **Uzmanlık yoluna geçiş:** Senior Developer → Staff Engineer (IC)

## Rol tanımlama

Her rol için:
- Sorumluluk alanları
- Gerekli yetkinlikler (Geliştirme modülü yetkinlik modeli ile bağlantı)
- Deneyim gereksinimi (yıl, seviye)
- Tipik maaş aralığı (şirket politikası)
- Rol → rol geçiş kriteri (net checklist)

## Çalışan deneyim

Çalışan **Kariyerim** sayfasına bakar:
- Şu anki rolüm
- 6 ay / 1 yıl / 2 yıl sonra olası geçişler
- Her geçiş için gereksinim gap'i
- "Hazır olmam için hangi adımları atmalıyım?" (action plan)

## Yetkinlik gap'i → öğrenme yolu

Sistem gap'i tespit edip **Geliştirme modülündeki öğrenme yolu** önerir:
- Kurs önerisi (internal + LinkedIn Learning + Udemy Business)
- Mentor önerisi
- Stretch proje önerisi
- Kitap önerisi

## Performans → kariyer linki

- **Yüksek performans, yüksek potansiyel (9-kutu A1):** Fast track — 1-2 yıl terfi
- **Orta performans, yüksek potansiyel (B1):** Gelişim yolu — mentor ataması
- **Stabil performans:** Yan geçiş fırsatları (farklı ekip, projeler)
- **Düşük performans:** Mevcut role odak, sonra kariyer konuşması

## Kariyer görüşmesi

Yıllık 1 kez çalışan-yönetici arasında yapılır:
- Çalışanın hedefi
- Gelişim alanları
- Fırsatlar + gerçekçi zaman çizelgesi
- Blockers

1 saatlik özel görüşme. Yıllık değerlendirmeden farklıdır (performans değil, gelecek).

## Ekosistem perspektif

Şirket içinde kariyer yolu olmayan (açık) çalışanlar:
- Ayrılma olasılığı 3× artıyor
- Tükenmişlik olasılığı 2× artıyor

Bu yüzden her çalışan için **en az 1 kariyer yolu** görünür olmalıdır. Sistem kontrolü yapar — tanımlanmamış çalışan listesi oluşturulur.

===PAGE id=rotasyon-is-akisi title=Rotasyon iş akışı pos=5===
# Rotasyon iş akışı

Rotasyon = geçici veya kalıcı iç görev değişimi.

## Rotasyon türleri

### 1. Kısa rotasyon (3-6 ay)

- **Shadow rolü:** Başka ekipte öğrenme amaçlı
- **Cross-functional proje:** Farklı departmanda katkı
- **Hackathon / innovation sprint**

### 2. Orta rotasyon (6-12 ay)

- **Farklı lokasyonda çalışma** (yurtiçi)
- **Geçici rol değişikliği** — mevcut pozisyon korunur

### 3. Uzun rotasyon (12+ ay)

- **Kalıcı transfer** — eski ekibe dönmez
- **Yurt dışı görev** (expat)
- **Kurucu ekip** (yeni şirket / joint venture)

## Onay süreci

1. Çalışan başvuru
2. Mevcut yöneticiden onay (max 5 iş günü, bloklama süresi 3 iş günü bilgi)
3. Hedef yöneticiden onay
4. İK teknik kontrol (hukuki, bordro, izin)
5. Başlama tarihi belirleme

## Bordro ve izin

- **Aynı şehir kısa rotasyon:** Bordro değişmez
- **Farklı şehir:** Ek lokasyon tazminatı (şirket politikası)
- **Yurt dışı:** Ayrı sözleşme, hukuki kontrol (WP, vize, vergi)
- **Birikmiş izin:** Rotasyon öncesinde kullanım önerilir

## Takip

Rotasyon süresinde:
- Hem mevcut hem hedef yönetici 360 değerlendirmesi verir
- Öğrenme hedefleri tanımlanır (SMART)
- Rotasyon sonu değerlendirme (performans kaydına etki)

## Rotasyon sonrası iş yeri

- **Kısa rotasyon:** Eski pozisyona döner
- **Uzun rotasyon:** İK + çalışan ile yeniden iş yeri karar
- **Kalıcı:** Yeni pozisyon sabit

## Metrikler

- Yıllık rotasyon sayısı / toplam çalışan (hedef > %5)
- Rotasyon sonu memnuniyet (hedef > 4/5)
- Post-rotasyon 12 ay içinde ayrılma oranı (düşük olmalı)
- Rotasyon maliyeti (eğitim, onboarding, üretkenlik kaybı)

## Rotasyon tipi: geri dönmeme

Kalıcı transferde 6 ay "gözlem" süresi vardır. Başarısızlık halinde eski pozisyon açık tutulabilir.

===PAGE id=ready-now-siniflandirma title=Ready-now sınıflandırma pos=6===
# Ready-now sınıflandırma

Succession pool'daki "ready now" etiketinin kriterleri.

## Ready-now checklist

Bir aday için tüm kutucukların **evet** olması gerekir:

### Performans
- [ ] Son 2 çeyrek performans skoru ≥ 4.0/5
- [ ] Mevcut rolünde ≥ 18 ay
- [ ] Son yıl 9-kutu A1 veya B1

### Yetkinlik
- [ ] Hedef rol yetkinliklerinin %85+'ı kapsıyor
- [ ] Leadership test (assessment center) geçti
- [ ] En az 1 yıl mentor eşliği (hedef pozisyona)

### Liderlik deneyimi
- [ ] En az 3 direct report (yönetici rolü için)
- [ ] En az 2 cross-functional proje
- [ ] Kamu konuşma veya müşteri sunumu deneyimi

### Motivasyon
- [ ] Kendi kariyer tercihi olarak belirtti
- [ ] Eş/aile durumu uygun (lokasyon gerektiren roller)
- [ ] Rol başlama tarihi (3 ay içinde, kabul ediyor)

## Değerlendirme yöntemleri

1. **360 değerlendirme** (hedef rol yetkinlikleri için özel şablon)
2. **Assessment center** (yarım gün simülasyon — müşteri, çalışan, finans senaryosu)
3. **Case study** (hedef pozisyonun tipik kararı)
4. **Psikometrik test** (Hogan, WAVE, UpCore UpCap)
5. **Interview panel** (3-5 kişi, üst yönetim + İK)

## Ready-now aday zorunluluğu

Her kritik pozisyon için en az **1 ready-now aday** olmalı — yoksa:
- Kırmızı uyarı CHRO dashboard'da
- Üst yönetim kurulunda acil gündem
- Rapid succession planı başlat (gelişim süresi kısaltılır)

## Ready-now → 1-year transition

Ready-now iken pozisyon boşalırsa:
- 2-4 hafta transition (eski → yeni)
- Ekibine veda + tanışma
- 100 günlük plan (onboarding + ilk hedefler)

## Birden fazla ready-now

Bir pozisyon için 2+ ready-now aday varsa:
- Birine pozisyon — diğerine eşdeğer büyüme fırsatı (başka pozisyon, strategic project)
- Kaybetme riski yüksek (rekabet, demotivation)
- CHRO müdahale — alternatif kariyer yolu tartışma

## Ready-now iken kaybetme (external offer)

Ready-now aday dış teklif alırsa:
- Geri tutma (retention) önceliği
- Counter-offer: zam, hızlandırılmış terfi, special project
- Başarısız olursa: kayıp kurumsal maliyet 100 000+ TRY (dış işe alım + kayıp bilgi)

===PAGE id=ayrilis-risk-tahmini title=Ayrılış risk tahmini (ML) pos=7===
# Ayrılış risk tahmini (ML)

UpCore ML modeli her çalışanın **90 gün içinde ayrılma olasılığı**nı tahmin eder.

## Model özeti

- **Tür:** XGBoost classification, kalibre edilmiş (Platt scaling)
- **Eğitim verisi:** 180 000 çalışan kaydı, 5 yıllık gözlem (2020-2025)
- **AUC-ROC:** 0.78 (test setinde)
- **Calibration:** Brier score 0.14
- **Fairness:** cinsiyet/yaş/departman için disparate impact < 1.25

Detay: [Ayrılış ML model kartı](/docs/developer/ml/burnout-prediction-kart)

## Özellikler (features)

50+ özellik, önde gelenler:
1. Son pulse BAT-TR skoru
2. Son pulse UWES skoru
3. Yöneticisi ile tenure
4. Son 6 ay izin kullanımı
5. Son 6 ay hastalık izin günü
6. Son 3 ay overtime saati
7. Maaş percentile (piyasa)
8. Son terfi üzerinden geçen süre
9. Eğitim bütçesi kullanımı
10. İç ilan başvuru sayısı
11. 1-1 sıklığı (son 3 ay)
12. LinkedIn profil güncellemesi (opt-in, çalışan izni)
13. E-posta gönderim sayısı (agrega, dışarı)
14. Cinsiyet (bias kontrolü için, tahmin değişkeni değil)

## Risk skoru yorumu

| Skor | Anlam | Aksiyon |
|---|---|---|
| 0-15% | Düşük | İzlem |
| 15-35% | Orta | Yönetici tarafında 1-1'da gündem |
| 35-60% | Yüksek | İK müdahale önerisi |
| 60%+ | Kritik | Retention plan oluştur |

## Retention plan

Yüksek risk → planlı aksiyonlar:
- 1-1 görüşme — "seni dinlemek istiyorum"
- Kariyer konuşması
- Zam / terfi değerlendirmesi
- Rol değişim / rotasyon teklifi
- Yan fayda iyileştirme (evden çalışma, eğitim bütçesi)

## Etik sınırlar

:::warning
Ayrılış risk skoru **asla** işten çıkarma gerekçesi olamaz. Yalnızca retention aksiyonu için kullanılır.
:::

KVKK Madde 22 — "sadece otomatik işleme dayalı ayrımcılık yasağı":
- Tahmin tek başına karar değildir
- İnsan yöneticisi kanıtı değerlendirir
- Çalışan itiraz edebilir

## Çalışan şeffaflığı

Çalışan kendi risk skorunu görebilir (opt-in ayar). Görmek istemeyebilir — UpCore varsayılan **gizli**.

## Model güncelleme

- Her çeyrek retrain (yeni veriler dahil)
- Yıllık bias audit
- Shap value ile açıklanabilirlik
- Model versiyonu logged (audit trail)

===PAGE id=9-kutu-entegrasyon title=9-kutu entegrasyon (Mobility ↔ Performans) pos=8===
# 9-kutu entegrasyon (Mobility ↔ Performans)

Performans modülündeki 9-kutu kalibrasyon sonucu Mobility modülünü besler.

## Otomatik aksiyonlar

| 9-kutu kutusu | Mobility aksiyonu |
|---|---|
| A1 (yüksek perf, yüksek pot) | Succession pool → ready-now veya 1-year aday |
| A2 (yüksek perf, orta pot) | Stable performer — rotasyon öneri |
| A3 (yüksek perf, düşük pot) | Uzman yolu — staff engineer vb |
| B1 (orta perf, yüksek pot) | Succession pool → 2-year aday, development plan |
| B2 (orta perf, orta pot) | Normal ilerleme — rotasyon fırsat |
| B3 (orta perf, düşük pot) | Rol zenginleştirme teklifi |
| C1 (düşük perf, yüksek pot) | Yanlış rol — rotasyon kritik |
| C2 (düşük perf, orta pot) | Koçluk + performans iyileştirme |
| C3 (düşük perf, düşük pot) | PIP — iş sözleşmesi fesih riski |

## Succession öneri motoru

Kalibrasyon sonrası sistem otomatik:
1. A1 kutusundakileri ready-now veya 1-year aday olarak **öneri** çıkarır
2. B1 kutusundakileri 2-year aday olarak **öneri** çıkarır
3. İK inceler, pozisyon eşleştirmesi yapar
4. Aday kabul ederse succession pool'a girer

## Succession pool kalibrasyon

Yılda 1 kez succession pool kalibrasyon toplantısı:
- Mevcut aday listesi review
- Yeni eklemeler
- Çıkartmalar (dış çıkış, performans düşüş, rol değişim)
- Gelişim plan güncellemesi

## Rotasyon önerisi

C1 kutusundakiler (düşük performans, yüksek potansiyel) için sistem **yanlış rol hipotezi** kurar:
- Mevcut rol yetkinlikleri: gap analizi
- Alternatif roller: ranking
- Rotasyon önerisi

## Bias kontrolü

- 9-kutu kalibrasyon sırasında otomatik bias denetim
- Succession pool ayrıca ikinci bias denetim (cinsiyet, yaş, etnik, engellilik)
- Dengesizlik → CHRO raporu + düzeltme plan

## Gizlilik

- 9-kutu sonucu **çalışana gösterilmez**
- Succession pool üyeliği **çalışana gösterilmez** (açık konuşulmaz)
- Çalışan **gelişim alanları** olarak bilgilendirilir, spesifik pozisyon **gizli**

## KVKK Madde 22 uyumluluğu

Succession aday seçimi **otomatik** değil — insan onayı zorunlu. Öneri motoru karar vermiyor, sadece liste üretiyor.

===PAGE id=maliyet-analizi title=Maliyet analizi pos=9===
# Maliyet analizi

İç mobilite yatırımının **ROI** (yatırım getirisi) analizi.

## Dış işe alım maliyet bileşenleri

| Kalem | Tipik TRY |
|---|---|
| İlan yayım (LinkedIn, kariyer sitesi) | 2 000 – 5 000 |
| Agency komisyonu (senior roller) | Brüt yıllık × %20-25 |
| Mülakat süreç (HR + yönetici zamanı) | 5 000 – 15 000 |
| Değerlendirme araçları (assessment, test) | 2 000 – 8 000 |
| Onboarding (ilk 90 gün) | 10 000 – 25 000 |
| Kayıp üretkenlik (ramp-up) | 3 ay × %50 maaş |
| **Toplam senior rol için** | **40 000 – 150 000** |

## İç mobilite maliyet bileşenleri

| Kalem | Tipik TRY |
|---|---|
| Eğitim bütçesi | 3 000 – 10 000 |
| Mentor atama (süre × maaş) | 5 000 – 15 000 |
| Rotasyon geçiş (2-4 hafta) | 5 000 – 10 000 |
| Knowledge transfer (eski rol) | 3 000 – 8 000 |
| **Toplam senior rol için** | **15 000 – 45 000** |

## Tasarruf oranı

Senior rol başına tasarruf: **25 000 – 105 000 TRY**

Orta ölçekli şirket (500 çalışan) yıllık:
- 50 dış işe alım yerine 30 iç mobilite + 20 dış
- Tasarruf: ~2.5 milyon TRY / yıl

## Gizli maliyetler

İç mobilite gizli maliyetleri:
- Eski ekipte geçiş dönemi üretkenlik düşüşü
- Çift kişi gereksinimi (geçici)
- Eğer başarısız olursa rotasyon geri çevirme maliyeti

Dış işe alımdaki gizli maliyetler:
- Kayıp bilgi (ayrılan çalışan)
- Ekip moralinin etkisi
- Kültür uyum riski (yeni çalışan)
- İlk 1 yılda ayrılma oranı (sektör ortalama %25)

## ROI hesap formülü

ROI = (Dış işe alım maliyeti - İç mobilite maliyeti - risk faktörü) / İç mobilite maliyeti

Tipik ROI: **%150-300** (1.5-3 katı)

## Raporlama

CFO dashboard'da:
- Çeyrek iç/dış oranı
- Tasarruf toplam
- Kritik pozisyon doluluk süresi
- ROI

Executive raporunda yılda 4 kez bu metrikler yer alır.

===PAGE id=sikca-sorulanlar title=Mobility — sıkça sorulanlar pos=10===
# Mobility — sıkça sorulanlar

## Yöneticim başvurumu bloklayabilir mi?

Hayır — iç mobilite hakkıdır. Yönetici 3 iş günü önceden bilgilendirilir ama reddedemez.

## Başvuru sonrası yöneticim beni cezalandırabilir mi?

Hukuki olarak yasak (İş Kanunu Madde 5 ayrımcılık yasağı). Eğer cezalandırma gözlerseniz:
- UpCore KVKK/GRC portal — whistleblower kanalı (anonim)
- İK bağımsız soruşturma
- Bulgular varsa yönetici disiplin süreci

## Succession pool'da olduğumu nasıl anlarım?

Size açıkça söylenmez. Ancak:
- Sürekli yüksek profilli projelere atanma
- Mentor ataması
- Executive education fırsat
- Yıllık kariyer görüşmelerinde "senin için gelecek planı" konusu

bunlar işarettir.

## Dış teklif aldım — counter-offer alacak mıyım?

Ready-now succession adayıysanız: büyük ihtimalle evet. B1/B2 gibi orta potansiyeldeyseniz: maaş counter, bazı durumlarda rotasyon teklifi.

**Uyarı:** counter-offer kabul eden çalışanların %50'si 2 yıl içinde yine ayrılır (sebep: fundamental engagement problemi counter ile çözülmez).

## Rotasyon başarısız olursa?

6 ay gözlem süresi — hem çalışan hem yönetici değerlendirir. Başarısızlık durumunda:
- Eski pozisyon açık tutulursa geri dönüş
- Üçüncü bir rol aranır
- Son seçenek: mutual separation (karşılıklı ayrılma)

## İç mobilite sayım terfi sayıyor mu?

Yatay geçiş **terfi değil**, **rotasyon**. Dikey geçiş terfidir. Kariyer yolu editöründe net görünür — tek yönlü ok yatay, yukarı ok dikey.

## Ayrılış risk tahmini gizli mi?

Çalışana gizli (varsayılan). İsterseniz opt-in ile kendi skorunuzu görebilirsiniz. Yönetici **göremez** (İK görür + KVKK audit log).
