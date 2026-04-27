===PAGE id=genel-bakis title=Performans modülü — genel bakış pos=1===
# Performans modülü — genel bakış

Performans modülü OKR, 360° feedback, 9-kutu kalibrasyon, PIP ve sürekli geri bildirim akışlarını barındırır.

## Felsefe

Yıllık değerlendirmenin 3 klasik sorunu vardır:
1. **Hafıza yanlılığı** — son 2 haftanın izi tüm yılı temsil eder
2. **Kanıt eksikliği** — yönetici gözlemi anekdottur, sistematik değil
3. **Bias** — benzer olana yüksek skor, farklı olana düşük skor

UpCore Performans modülü bu 3 sorunu sürekli kanıt toplama, çok-kaynaklı değerlendirme ve algorithmic audit ile çözer.

## Bileşenler

- **OKR** (quarterly hedef + Key Result)
- **360°** (çok yönlü anket)
- **9-kutu** (performans × potansiyel)
- **PIP** (Performans İyileştirme Planı, 30/60/90 gün)
- **Sürekli geri bildirim** (Slack/Teams bot)
- **Yıl sonu değerlendirme** (tüm pipeline)
- **Zam/terfi karar destek** (kanıt-temelli)

## Kullanım haritası

| Quarter | Aktivite |
|---|---|
| Q1 başlangıç | OKR belirleme |
| Çeyrek içi | Haftalık ilerleme güncelleme |
| Q sonu | OKR kapanış + feedback |
| Yıl sonu | 360 + yönetici eval + 9-kutu kalibrasyon |
| Ocak | Zam/terfi kararları + PIP başlatma |

===PAGE id=okr-kurulum title=OKR kurulumu pos=2===
# OKR kurulumu

## Cycle tanımı

UpCore çeyrek (Q1, Q2, Q3, Q4) bazında çalışır. Her cycle için tarih aralığı:
- **Q1:** 1 Ocak – 31 Mart
- **Q2:** 1 Nisan – 30 Haziran
- **Q3:** 1 Temmuz – 30 Eylül
- **Q4:** 1 Ekim – 31 Aralık

Şirketler kendi fiskal takvimlerine göre bu tarihleri özelleştirebilir.

## OKR kaskad

1. **Şirket OKR** (CEO + yönetim kurulu) — yılın ilk haftası
2. **Departman OKR** — 2. hafta
3. **Ekip OKR** — 3. hafta
4. **Bireysel OKR** — 4. hafta

Her seviye üst seviyeye **bağlı** olmalı (sistem zorlar).

## OKR yapısı

- **Objective:** Niteliksel, ilham verici, 1 cümle
- **Key Results:** 3-5 adet, nicel, test edilebilir

## Tipik hata örnekleri

Kötü: "Müşteri memnuniyetini artır" — ölçüm yok.
İyi: "Q3 sonunda NPS 42 → 55'e çıkar"

Kötü: "Daha iyi ürün" — anlamsız.
İyi: "Q2 sonunda mobil uygulamada haftalık aktif kullanıcı 100k → 150k"

Kötü: "Performansa odaklan" — tautolojik.
İyi: "p95 API latency 250ms → 120ms, Q2 sonu"

## Şablonlar

UpCore'da 12 sektörel OKR şablonu:
- SaaS büyüme
- B2B satış
- Müşteri başarı
- Ürün geliştirme
- Üretim verimliliği
- İK etkinliği
- Finans kontrolü
- Belediye hizmet memnuniyeti
- Holding konsolide büyüme
- E-ticaret dönüşüm
- Lojistik optimizasyon
- Sağlık hizmet kalitesi

===PAGE id=key-result-takibi title=Key Result ilerleme takibi pos=3===
# Key Result ilerleme takibi

## Haftalık güncelleme

Her Key Result (KR) haftalık güncellenir. İK ayarları ile zorunlu ya da opsiyonel yapılabilir.

- **Çalışan:** Kendi KR'ını haftalık günceller
- **Yönetici:** Kontrol eder, yorum bırakır
- **Sistem:** Trend alarm verir

## İlerleme türleri

1. **Sayısal ilerleme:** 0 → hedef değer (örn. 100K satış)
2. **Boolean:** Yapıldı / yapılmadı (örn. "ISO sertifika aldık")
3. **Takip milestone:** 4 milestone × %25 (örn. proje fazları)

## Renk kodu

| Durum | Renk | Anlam |
|---|---|---|
| On track | 🟢 | İlerleme beklenen hızda |
| At risk | 🟡 | Yavaş ama muhtemel |
| Off track | 🔴 | Hedef kaçırma ihtimali yüksek |
| Done | ✅ | Tamamlandı |

Sistem otomatik belirler: beklenen% = (geçen gün / toplam gün) × 100. Gerçek % bu değere göre renk.

## Engelleyici işaretleme

KR güncelleme ekranında engelleyici (blocker) alanı vardır:
- "Teknik borç 3 story point'lik bir task'ı kilitledi"
- "Satıcı teslim geciktiriyor"
- "Yönetici onayı 2 haftadır bekliyor"

Bu engelleyiciler 1-1 görüşmede otomatik gündemlenir.

## Eski verileri düzenleme

KR değerleri **geriye dönük değiştirilemez**. Yanlış güncelleme yapıldıysa:
- Yönetici onay ile düzeltme request
- Audit log'a düzeltme kaydı (eski değer + yeni değer + sebep)

## KR skor hesabı

Çeyrek sonu:
- Her KR %0-%150 arası skor (stretch goals için)
- Objective skoru = KR'ların ağırlıklı ortalaması (ağırlıkları %0-100)

:::info
%100 hedefin altı kötü değildir. Google'da ortalama OKR skoru %70-80. %100 → "çok kolay koymuşsunuz"; %50 → "çok ambitious koymuşsunuz".
:::

===PAGE id=360-anket title=360° anket süreci pos=4===
# 360° anket süreci

360 = "her yönden" geri bildirim: üst, ast, akran, müşteri, öz.

## Kampanya kurulumu

**Performans > 360 > Yeni kampanya**

1. **Hedef:** Bireysel değerlendirilecek çalışan(lar)
2. **Rater matrisi:** Kim kimi değerlendirecek?
3. **Anket şablonu:** 10-25 soru (şablon veya özel)
4. **Zamanlama:** Başlangıç + süre (7-14 gün)
5. **Anonimlik:** Çalışana bireysel mi agrega mı gösterilecek?

## Rater sayıları (öneri)

| Rol | Üst | Ast | Akran | Müşteri | Öz |
|---|---|---|---|---|---|
| Bireysel katkıda bulunan | 1 | - | 2-3 | - | 1 |
| Yönetici | 1 | 3-5 | 2 | - | 1 |
| Üst yönetici | 1 (varsa) | 5-7 | 2-3 | 1-2 | 1 |
| Satış / B2B | 1 | 0-2 | 2 | 2-3 | 1 |

## Anket soru örnekleri

### İletişim
- "Zor konularda bile düşüncesini net ifade eder"
- "Farklı paydaşlarla etkili iletişim kurar"

### Teknik yetkinlik
- "Kendi alanında teknik yetkinliği yeterlidir"
- "Karmaşık problemleri parçalayıp çözer"

### Liderlik
- "Ekibe net yön gösterir"
- "Zor kararları vermekten kaçınmaz"
- "Zorlukta ekibin yanında durur"

### Gelişim odağı
- "Yeni şeyler öğrenmeye açık"
- "Geri bildirimi yapıcı alır ve uygular"

## Anonimlik koruma

- 3'ten az rater — sonuç gösterilmez (anonim kimlik deşifre edilebilir)
- Serbest metin yorumları — eşleştirme ipuçları (isim, proje kodu) otomatik maskelenir
- Üst → ast anonimdir ama rol ("üst") gösterilir

## Raporlama

Her çalışan için tek sayfalık rapor:
- Genel skor (5 üzerinden)
- Alt kategoriler × rol kırılımı (örn. iletişim: üst 4.2, akran 3.8, ast 3.5)
- Güçlü yönler top 3
- Gelişim alanları top 3
- Anonim yorumlardan özet (NLP ile)

## Açıklama görüşmesi

Sonuç yönetici ile 1-1'da paylaşılır. Protokol:
1. Çalışan önce raporu kendisi okur (15 dk)
2. 45 dk görüşme — ne şaşırtıcı, ne doğrulayıcı?
3. Gelişim planı — 1 alan, 3 aksiyon
4. 90 gün sonra follow-up

===PAGE id=360-soru-havuzu title=360 soru havuzu pos=5===
# 360 soru havuzu

UpCore'da 150+ 360-bazlı soru hazır. Yetkinlik modeline göre gruplanır.

## 6 temel yetkinlik ailesi

### 1. İletişim ve işbirliği (22 soru)
- Etkili sözlü iletişim
- Yazılı iletişim netliği
- Aktif dinleme
- Kültürler arası iletişim
- Zor konuşmaları yönetme
- Takım içi işbirliği

### 2. Müşteri odaklılık (18 soru)
- İç müşteri memnuniyeti
- Dış müşteri empatisi
- Problem çözme hızı
- Proaktif hizmet

### 3. Yenilikçilik ve problem çözme (24 soru)
- Yapıcı eleştiri
- Yaratıcı düşünce
- Risk alma dengesi
- Değişime uyum
- Sistemik düşünme

### 4. Teknik uzmanlık (domain bazında değişken)
- Alan bilgisi derinliği
- En iyi uygulamaları takip
- Araç kullanımı
- Bilgi paylaşımı

### 5. Liderlik (28 soru — yönetici rolü için)
- Vizyon tanımlama
- Koçluk
- Karar verme
- Delegasyon
- Çatışma yönetimi
- İkna etme
- Ekip geliştirme

### 6. Sonuç odaklılık (20 soru)
- Deadline'ı tutma
- Kaliteli teslim
- Öncelik sıralama
- Zaman yönetimi

## Özel sorular

Şirketinize özel 10-20 soru eklenebilir. Öneri:
- "Kurumsal değerlerimizi günlük işinde yaşar" (her şirketin değeri var)
- "Pozisyonuna özel bir madde" (rol-bazlı soru havuzu)

## Yetkinlik modeli eşleştirme

Geliştirme modülünde tanımladığınız yetkinlik modeliyle eşleştirilir. Sonuçlar hem 360 raporuna, hem yetkinlik haritasına yansır.

===PAGE id=9-kutu-kalibrasyon title=9-kutu kalibrasyon (toplantı modu) pos=6===
# 9-kutu kalibrasyon (toplantı modu)

Yıl sonu kalibrasyon toplantıları için özel **toplantı modu** vardır.

## Moderatör rolü

- İK temsilcisi
- Tarafsız, zaman yöneticisi
- Tartışma kayıtlı tutar (audit log)

## Toplantı akışı

1. **Moderatör** her yöneticinin taslaklarını yansıtır (anonim — hangi yöneticinin eseri olduğu gizli)
2. **Yuvarlak masa tartışma:** 3 dakika / çalışan
3. **İtiraz hakkı:** "Ben farklı gözlemledim" itirazı olursa kanıt zorunlu
4. **Consensus:** Oy değil — hep konsensüs ile ilerlenir
5. **Karar:** Kutu kesinleşir

## Bias denetim araçları

Toplantı öncesi İK şu raporları yansıtır:
- Önceki yıl dağılımı (bu yıl ile karşılaştırma için)
- Demografik dağılım (cinsiyet, yaş, kıdem × kutu)
- Departman dağılımı

Toplantı sırasında sistem real-time denetim:
- "Bu yöneticinin 8 raporundan 5'i B1'e yerleştirildi, normal mi?"
- "Kadın çalışanların %60'ı C1-C2, erkeklerin %40'ı — istatistiksel anomali"

## Rol matrisi — kutulara göre aksiyon

| Kutu | Etiket | Tipik aksiyon |
|---|---|---|
| A1 (yüksek perf, yüksek pot) | Star | Succession pool, yüksek zam |
| A2 (yüksek perf, orta pot) | Solid performer | Orta zam |
| A3 (yüksek perf, düşük pot) | Deneyimli uzman | Uzmanlık yolu, yatay gelişim |
| B1 (orta perf, yüksek pot) | Gelişmekte olan | Gelişim planı, mentor |
| B2 (orta perf, orta pot) | Standart | Normal ilerleme |
| B3 (orta perf, düşük pot) | Stabil | Rol zenginleştirme |
| C1 (düşük perf, yüksek pot) | Yanlış rol | Rotasyon |
| C2 (düşük perf, orta pot) | Destek | Koçluk, PIP düşünülür |
| C3 (düşük perf, düşük pot) | Risk | PIP zorunlu |

## Karar kayıtları

Her 9-kutu ataması:
- Kim karar verdi (yöneticiler listesi)
- Gerekçe özet
- İtiraz varsa detay
- Değişen kutu (taslak → final)

5 yıl saklanır. İş mahkemesi durumunda delil olarak kullanılabilir.

## Çalışanla paylaşım

:::warning
9-kutu sonucu **çalışana gösterilmez**. Sadece İK + yönetici bilir.
:::

Çalışana açık konuşulur:
- "Senin için gelişim alanı: X"
- "Kariyer yolu: Y"
- "Bir sonraki hedef: Z"

**Söylenmez:** "Sen B1'desin"

===PAGE id=pip-is-akisi title=PIP (Performans İyileştirme Planı) iş akışı pos=7===
# PIP (Performans İyileştirme Planı) iş akışı

PIP, performans sorunlarını **yazılı, ölçülebilir, adil** bir plan ile çözme sürecidir.

## PIP ne zaman başlatılır?

- 2 ardışık çeyrek performans skoru < 2.5/5
- 9-kutu C3 yerleştirme
- Belirgin davranışsal sorun (geç teslim pattern'i, kalite düşüklüğü)
- Yönetici + İK + HR Business Partner ortak kararı

## PIP süreler

- **30 gün** — hafif performans gap
- **60 gün** — orta (en yaygın)
- **90 gün** — kapsamlı gap / yeni role transition

## Plan içeriği

1. **Gap tanımı** — Ne eksik?
2. **Beklentiler** — Ne bekliyoruz?
3. **Kaynaklar** — Ne destek vereceğiz? (eğitim, mentor, ekipman)
4. **Hedefler** — Net, ölçülebilir, tarih
5. **Kontrol noktaları** — Haftalık 1-1
6. **Başarısızlık sonuçları** — Pozisyon değişimi, iş sözleşmesi feshi

## Hukuki çerçeve

- **4857 İş Kanunu Madde 25/2:** "İşçinin yeterli gayreti göstermemesi" haklı fesih sebebi — ancak **ispat yükü işverende**
- PIP yazılı, imzalı, kontrol noktaları belgelenmiş ise ispat daha kolay
- İşçi PIP'e imza atmayı reddedebilir — imzalamama fesih gerekçesi **değildir**, tebligat yeter

## Adil PIP için kontrol listesi

- [ ] Hedefler spesifik (bulanık değil)
- [ ] Gerçekçi (imkansız hedef koyma)
- [ ] Zaman yeterli (30 güne kapsamlı iş değişimi dahil edilmez)
- [ ] Destek somut (mentor/eğitim saat sayısı belirtilmiş)
- [ ] Aksiyon süreci izlenmeli (kayıtlar)
- [ ] Paralel başka cezalar yok (uyarı yazıları, maaş kesintisi)

## Başarı / başarısızlık

### Başarı (hedefler tutar)
- PIP kapatılır
- Yıl sonu değerlendirmesinde "PIP başarıyla tamamlandı" notu
- 6 ay takip — tekrar gerileme olmazsa tamamen silinir

### Başarısızlık
- Fesih düşünülür — hukuk onayı zorunlu
- İşçiye önceden yazılı tebliğ
- Kıdem + ihbar tazminatı yasal olarak ödenir (şarta bağlı)
- **Ayrımcılık kontrolü** — İş Kanunu Madde 5, benzer durumdaki çalışana farklı uygulama varsa tazminat

## UpCore PIP yönetim ekranı

- Tüm aktif PIP'leri görme
- Haftalık check-in takvim
- Başarı oranı izleme
- Bias denetim (demografik kırılımda PIP dağılımı)

## Yaygın hatalar

:::danger Kaçınılacaklar
- PIP'i "işten çıkarma rampası" olarak kullanma (iş mahkemesi bunu anlar)
- Duygusal tepki ile başlatma (birkaç gün bekle, objektif değerlendir)
- Hedefleri kurgulama (gerçekten ulaşılabilir olmalı)
- PIP bitince hemen fesih (değerlendirme zamanı tanı)
:::

===PAGE id=yil-sonu-degerlendirme title=Yıl sonu değerlendirme (performans modülü) pos=8===
# Yıl sonu değerlendirme (performans modülü)

[Hızlı başlangıç tam senaryosu](/docs/ik/hizli-baslangic/yil-sonu-degerlendirme) üzerinden genel akışı inceleyin. Bu sayfada performans modülüne özel teknik detaylar.

## Süreç adımları (teknik)

### 1. Pipeline başlatma

**Performans > Yıl sonu > Pipeline başlat**

- Değerlendirme cycle: yıllık (2026-Y)
- Hedef kitle: tüm aktif çalışanlar (istisna listesi opsiyonel — izinli, stajyer)
- Zaman aralığı: 6 hafta (otomatik milestone'lar)
- İş kolu tercihi: yönetici ↔ ast → tüm matris

### 2. Öz değerlendirme gönderim

- E-posta + in-app
- Form 5 soru (ayarlanabilir)
- Son teslim: 1 hafta

### 3. 360 kampanyası

- Ayrı 360 kampanyası (otomatik oluşur)
- Rater ataması yönetici+İK onayı
- Anket: Yıl sonu 360 şablonu (15 madde)
- Son teslim: 2 hafta

### 4. Yönetici değerlendirme

- Yönetici formu: 10 kriter × 1-5 puan + kanıt zorunluluğu
- OKR skorlamaları otomatik eklenir
- Son teslim: 1 hafta

### 5. Kalibrasyon toplantıları

- Departman × yönetici × İK
- 9-kutu yerleştirme toplantı modunda
- Auto-schedule: sistem uygun 2 saatlik slot bulur

### 6. Açıklama görüşmeleri

- 1-1 şablonu (45 dk)
- Yazılı değerlendirme PDF çıktı
- Dijital imza (çalışan + yönetici)
- Gelişim planı oluşturma

## Çıktılar

- Her çalışan için **değerlendirme raporu PDF** (imzalı)
- Yönetici **ekip özeti**
- İK **şirket genel raporu** + bias denetim
- Zam/terfi **kanıt-temelli öneriler**

## Zam/terfi decision support

Sistem zam öneri üretir ama **nihai karar insan**. Öneri şablonu:
- Performans skoru: %35 ağırlık
- Potansiyel (9-kutu): %25
- 360 skoru: %15
- Piyasa maaş karşılaştırma: %15
- Kıdem: %5
- Şirket finans durumu (max zam bütçesi): %5

## KVKK uyumluluğu

- Otomatik kararlar (zam/terfi/PIP) **insan onayı** olmadan uygulanmaz
- Çalışan değerlendirme kopyasını indirebilir (Madde 11/a)
- Yanlış değerlendirme → düzeltme talebi (Madde 11/d)
- Yıl sonu verisi 5 yıl saklanır, sonra anonimleştirilir

===PAGE id=bonus-hesabi title=Bonus hesabı pos=9===
# Bonus hesabı

Performans-linked bonus hesaplama motoru.

## Bonus türleri

| Tip | Hesap | Ne zaman |
|---|---|---|
| Yıllık performans bonus | Maaş × performans çarpanı | Yıl sonu |
| Quarterly spot bonus | Sabit tutar | Çeyrek sonu |
| Satış komisyonu | Revenue × yüzde | Aylık |
| Referral bonus | Yeni çalışan işe alınınca | Tek seferlik |
| Proje başarı bonusu | Bütçe → hedef altı | Proje sonu |

## Performans çarpanı modeli

Varsayılan model:
- Skor 1.0–2.0 → %0 bonus
- Skor 2.0–3.0 → %25 × hedef bonus
- Skor 3.0–4.0 → %75 × hedef bonus
- Skor 4.0–5.0 → %100 × hedef bonus
- Exceptional (sadece %5 çalışan) → %125 × hedef bonus

Hedef bonus = Aylık brüt maaş × (1–4) ay bonus katsayısı (şirket politikası).

## OKR entegrasyon

OKR skoru bonus çarpanına dahil edilebilir:
- Sadece performans skoru (default)
- Performans %70 + OKR %30 (hibrit)
- Sadece OKR (KR tamamlanma) — risk: Goodhart yasası

:::warning
%100 OKR → bonus modeli Goodhart yasası riskini artırır. Çalışanlar kolay hedefleri seçmeye yönlendirilir.
:::

## Bias denetimi

Otomatik:
- Cinsiyet × ortalama bonus
- Yaş × ortalama bonus
- Departman × ortalama bonus

%10+ fark varsa uyarı — yönetim kuruluna rapor.

## Hesap formülü (şirket özel)

UpCore'da drag-and-drop formül editörü ile hesap:

    bonus = base_salary
            * performance_multiplier
            * company_performance_factor
            * tenure_factor

Her faktör tenant-bazlı ayarlanabilir.

## Bonus onayı

- Yönetici öneri yapar
- Bir üst yönetici onaylar
- CHRO global onay
- Finance final onay (bütçe limiti)

Audit log her adımı kayıt altına alır.

## Ödeme

Bordro sistemi ile entegrasyon:
- Hesaplanan bonus → bordro içinde "ek gelir" kalemi
- Gelir vergisi + SGK prim otomatik kesinti
- Çalışanın bordrosunda ayrı satır olarak görünür

===PAGE id=sikca-sorulanlar title=Performans — sıkça sorulanlar pos=10===
# Performans — sıkça sorulanlar

## 360 sonucunu çalışana ne kadar göstermeliyim?

Agrega skor (5 üzerinden) + güçlü yönler + gelişim alanları. Bireysel rater yorumları **anonim** ve **ham değil özetlenmiş** olarak.

## OKR %100 ulaşmalı mı?

**Hayır.** Google normu %70-80. %100 → düşük ambisyon. UpCore varsayılan alarm eşiği: ortalama < %50 veya > %95.

## PIP her zaman fesih ile sonuçlanır mı?

Hayır — UpCore istatistiklerine göre PIP'lerin **%45'i başarıyla kapanır**. %30 fesih, %25 rol değişimi ile sonuçlanır.

## 9-kutu sonucunu ne kadar ciddiye almalıyım?

Önemli ama tek girdi değil. Zam kararında ~%25 ağırlık önerilir. Yüksek potansiyel etiketi **garanti terfi değil** — kanıt toplamaya devam.

## Zam kararında OKR tamamlama yüzdesi tek metrik olsun mu?

**Hayır.** Goodhart yasası: ölçüm hedefe dönüşür, davranış bozulur. Zam kararı çoklu kanıt gerektirir.

## Bonus hesaplamasında bias nasıl tespit ediyorum?

**Analitik > Bias denetimi** sayfasında her bonus döneminden sonra otomatik rapor. Cinsiyet × bonus dağılımı, yaş × bonus dağılımı. Anomali > %10 → alarm.

## Performans skoruna çalışan itiraz edebilir mi?

Evet — KVKK Madde 11/(d) "düzeltme talebi". Süreç:
1. Yazılı itiraz (sistem üzerinden)
2. İK + yönetici inceleme (14 gün)
3. Konsensüs yok → CHRO hakemlik
4. Karar çalışana bildirilir + audit log'a kayıt
