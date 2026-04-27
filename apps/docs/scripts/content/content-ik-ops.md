===PAGE id=genel-bakis title=İK Ops modülü — genel bakış pos=1===
# İK Ops modülü — genel bakış

İK Operasyon modülü; özlük, sözleşme, izin, bordro, SGK, iş kazası gibi klasik İK işlerini **Türkiye mevzuatına uyumlu** olarak yönetir.

## Yasal çerçeve

- **4857 sayılı İş Kanunu** (özel sektör işçi)
- **657 sayılı Devlet Memurları Kanunu** (kamu memuru)
- **5510 sayılı Sosyal Sigortalar ve Genel Sağlık Sigortası Kanunu**
- **6356 sayılı Sendikalar ve Toplu İş Sözleşmesi Kanunu**
- **6331 sayılı İş Sağlığı ve Güvenliği Kanunu**
- **193 sayılı Gelir Vergisi Kanunu** (bordro)
- **213 sayılı Vergi Usul Kanunu** (kayıt saklama)

## Bileşenler

- **Özlük dosyası** — tam çalışan profil, KVKK uyumlu saklama
- **Sözleşme yönetimi** — iş sözleşmesi, ek sözleşme, KVKK aydınlatma
- **İzin yönetimi** — yıllık, hastalık, idari, doğum, ücretsiz
- **Bordro hesaplama** — maaş + kesintiler + net
- **SGK e-Bildirge** — APB, İGB, İAB XML
- **Kıdem tazminatı hesabı**
- **Mesai ve fazla çalışma**
- **İş kazası bildirim**
- **İş güvenliği belgeleri**

## Personel tipleri

UpCore'da 4 personel tipi desteklenir:

| Kod | Açıklama | Mevzuat |
|---|---|---|
| MEMUR_657 | Devlet memuru | 657 DMK |
| 4B | Sözleşmeli personel (kamu) | 657 DMK 4/B |
| 4857 | İş Kanunu'na tabi işçi | 4857 İK |
| STAJYER | Stajyer | 4857 + Mesleki Eğitim Kanunu |

Her tip için farklı kesinti, izin, tazminat kuralı.

===PAGE id=ozluk-dosyasi title=Özlük dosyası pos=2===
# Özlük dosyası

Her çalışan için zorunlu ve opsiyonel bilgileri tutan merkez kayıt.

## Zorunlu alanlar (İK Yönetmeliği)

- TCKN (11 haneli)
- Ad, soyad
- Doğum tarihi + yeri
- Anne/baba adı
- Medeni durum
- Adres
- SGK sicil no (otomatik üretilir)
- İşe giriş tarihi
- Pozisyon + departman
- Maaş (brüt)
- IBAN (maaş)

## Opsiyonel alanlar

- Eş ve çocuk bilgisi (AGİ hesabı için)
- Askerlik durumu
- Engellilik oranı (ÖNG muafiyeti için)
- Eğitim durumu
- Ehliyet sınıfı
- Yabancı dil
- Acil durum iletişim
- Fotoğraf

## Dosya ekleri

Zorunlu belgeler:
- Kimlik fotokopisi
- İkametgah
- Diploma
- Sabıka kaydı (son 3 ay)
- Sağlık raporu (işe girişte)
- Askerlik belgesi (erkekler için)
- İş sözleşmesi (imzalı)
- KVKK aydınlatma imzalı örnek

Opsiyonel:
- SGK hizmet dökümü
- Referans mektupları
- Sertifikalar

## Elektronik imza

- Çalışan dijital imza (e-imza) veya mobil imza ile onaylayabilir
- İşveren İK müdürünün e-imzası
- Zaman damgası (TSE/TurkTrust)

## Saklama süreleri

| Belge türü | Süre | Mevzuat |
|---|---|---|
| İş sözleşmesi | 5 yıl (ayrıldıktan sonra) | TBK 146 |
| Bordro | 5 yıl | VUK |
| SGK belgeler | 10 yıl | SGK |
| İş kazası | 30 yıl | İSG |
| Kimlik fotokopisi | 5 yıl | SGK |

Süre sonunda otomatik silme (ya da anonimleştirme).

## KVKK uyumluluğu

- Açık rıza gerektiren alanlar ayrı (örn. fotoğraf, sağlık)
- Tüm PII alanları pgcrypto ile şifrelenir (at-rest)
- Audit log her erişim için (kim okudu, ne zaman)
- Çalışan self-servis portal — Madde 11 hakları

## İç değişim

Çalışan kendi profilini güncelleyebilir (belirli alanlar):
- Adres, telefon, acil iletişim
- Eş/çocuk bilgisi (AGİ için)

Yönetici tarafında güncellenen:
- Pozisyon, maaş (onay akışı)
- Departman değişimi

Otomatik kaynaklardan gelen:
- SGK hizmet dökümü senkronu (iki haftada bir)
- e-Devlet adres güncellemesi

===PAGE id=sozlesme-yonetimi title=Sözleşme yönetimi pos=3===
# Sözleşme yönetimi

İş sözleşmesi türleri, şablonları, imza akışı.

## Sözleşme türleri

### Belirsiz süreli iş sözleşmesi (4857 md. 9)

En yaygın sözleşme. Süre belirlenmez. Ayrılma → ihbar süresi + kıdem tazminatı.

### Belirli süreli iş sözleşmesi (4857 md. 11)

Objektif şartlar altında süreli:
- Projeye bağlı iş
- Mevsimlik iş
- Niteliği gereği belirli süre (örn. mühendis belirli inşaat)

Süre sonunda sonlanır — kıdem tazminatı **yok** (istisna: birçok zincirleme sözleşme → belirsiz sayılır).

### Kısmi süreli iş sözleşmesi (4857 md. 13)

Haftalık normal çalışmadan kısa. Tam zamanlı çalışana oranla prim, izin hesabı yapılır.

### Çağrı üzerine çalışma (4857 md. 14)

Düzensiz çağrılar. En az 20 saat/hafta garantili.

### Uzaktan çalışma (4857 md. 14/1 + Yönetmelik 2021)

- Yazılı sözleşme zorunlu
- İşverenin uzaktan iş gereken ekipman sağlama yükümlülüğü
- Çalışma saatleri net
- Performans izleme sınırlı

### Deneme süresi (4857 md. 15)

- Max 2 ay (toplu iş sözleşmesi ile 4 ay)
- İşveren ihbar süresi kısa
- Çalışan tek taraflı ayrılabilir

## Sözleşme şablonları

UpCore'da 15+ şablon:
- Beyaz yakalı belirsiz süreli
- Mavi yakalı belirsiz süreli
- Stajyer sözleşmesi
- Part-time
- Uzaktan çalışma
- Yönetici (özel hükümler: rekabet yasağı, gizlilik)
- Satış temsilcisi (komisyon bazlı)

Her şablon Türkçe + İngilizce.

## Zorunlu maddeler (4857 md. 8)

- Tarafların adları, adresleri
- İşin niteliği
- İşyeri
- Başlangıç tarihi
- Sözleşme süresi
- Ücret + ödeme şekli
- Çalışma saatleri
- İzin hakları
- Feshe tabi genel hükümler
- Uyuşmazlık çözümü

## Ek sözleşmeler

- Rekabet yasağı (max 2 yıl, coğrafi sınır, mevzuat md. 445)
- Gizlilik (NDA)
- Fikri mülkiyet (iş sırasında yapılan iş)
- Özel teşvik (bonus, opsiyonlar, hisse)
- Araç tahsisi
- Evden çalışma eki

## İmza akışı

1. İK sözleşme şablonu oluşturur
2. Çalışan bilgileri otomatik doldurulur
3. Çalışana e-imza / mobil imza ile imzaya gider
4. İK müdürü imzalar
5. Noter tasdik (opsiyonel, yönetici pozisyonları için önerilen)
6. PDF + JSON arşive
7. KVKK audit log

## Sözleşme değişikliği

- Çalışanın rızası zorunlu (maaş düşürme, pozisyon değişim)
- Ek protokol imzalanır
- Tek taraflı değişiklik → işçinin işi bırakması haklı fesih sebebi (4857 md. 24)

===PAGE id=izin-yonetimi title=İzin yönetimi pos=4===
# İzin yönetimi

Tüm izin tipleri + hakediş + kullanım takibi.

## İzin türleri

### Yıllık izin (4857 md. 53)

| Hizmet süresi | Yıllık izin hakkı |
|---|---|
| 1-5 yıl | 14 gün |
| 5-15 yıl | 20 gün |
| 15+ yıl | 26 gün |

18 yaş altı ve 50 yaş üstü: en az 20 gün.

### Mazeret izni (4857 md. 46, toplu iş sözleşmesi + özel iş sözleşmesi)

- Evlenme: 3 gün
- Eş ölümü: 3 gün
- Ana-baba, kardeş, çocuk ölümü: 3 gün
- Doğum (baba): 5 gün
- Doğum (anne): 16 hafta (8+8, doğum öncesi+sonrası)
- Emzirme: 1 saat/gün (ilk 1 yıl)
- Engelli çocuk bakımı: 10 gün/yıl
- Hastalık (doktor raporu) — ücretsiz (SGK geçici iş göremezlik öder)

### İdari izin

İşveren takdiri, ücretli:
- Yılın ilk mesai günü
- Cenaze
- Özel durum

### Ücretsiz izin

Çalışan talebi + işveren onayı:
- Askerlik (zorunlu — 4857 md. 31)
- Doğum (anne ek ücretsiz)
- Sağlık
- Kişisel (dışarıda okul, seyahat)

### Resmi tatil

Şirket politikasına göre ücretli (kamu benzer, özel sektör zorunlu değil ama yaygın uygulama).

## Hakediş hesabı

Yıllık izin otomatik hesap:
- Yıldönümü bazlı (giriş tarihi)
- 1 tam yıl dolmadan → orantılı
- Kıdem arttıkça kademe çıkışı

Hastalık izni:
- Doktor raporu sistemi
- 2 günden uzun → SGK bildirimi
- Fazla mesai üzerinden hesaplanmaz

## Onay akışı

1. Çalışan **İzin talebi** formu doldurur
2. Yöneticiye gider
3. Yönetici onay / red (max 3 iş günü)
4. İK otomatik onay (uzun süre / belirli tip)
5. Onay → takvim güncellenir

## İzin takvimi

- Ekip takvimi: kim ne zaman izinli
- Departman konflik kontrolü
- Yönetici otomatik uyarı: "ekibinizin %50'si aynı hafta izinli"
- Yıl sonu devir: kullanılmayan izin ilk 6 ay sonrası devreder

## Hasta izin

- Doktor raporu upload zorunlu
- 2+ gün SGK bildirimi otomatik
- Devam eden hastalık → sağlık kurulu raporu

## Doğum izni

- Doğum öncesi 8 hafta
- Doğum sonrası 8 hafta (toplu 16 hafta)
- Çoğul gebelik: +2 hafta
- İsterse ek ücretsiz 6 ay
- Emzirme hakkı: 1 yıl, günde 1 saat

## Yıl sonu operasyon

- Kalan izinler hesapla
- Devir mi, nakde mi çevirme?
- Yasal tercih: devir (iş akdi devamı), zorunlu nakit: çıkışta
- Raporlama: yıl sonu tüm çalışanlar için kullanılmayan izin raporu

===PAGE id=bordro-hesaplama title=Bordro hesaplama pos=5===
# Bordro hesaplama

Türkiye ücret bordrosu hesaplama motoru.

## Temel hesap adımları

1. **Brüt maaş** (sözleşmeye göre)
2. **SGK primi kesintisi** (işçi payı %14)
3. **İşsizlik sigortası** (%1)
4. **Damga vergisi** (%0.759)
5. **Gelir vergisi** (dilim bazlı)
6. **AGİ (Asgari Geçim İndirimi)** — 193 s.K. md. 32, 2022+ kaldırıldı ama geçmiş hesaplar için mevcut
7. **Net maaş** = brüt - kesintiler + AGİ (varsa)

## Gelir vergisi dilimleri 2026

(2026 yılı için varsayılan tablodur — mevzuat değiştikçe güncellenir)

| Dilim | Tutar (TL) | Oran |
|---|---|---|
| 1 | 0 - 258 000 | %15 |
| 2 | 258 000 - 570 000 | %20 |
| 3 | 570 000 - 2 700 000 | %27 |
| 4 | 2 700 000 - 5 500 000 | %35 |
| 5 | 5 500 000+ | %40 |

## SGK prim taban/tavan

- Taban: asgari ücret (2026: 33 000 TL brüt)
- Tavan: asgari ücretin 7.5 katı (2026: 247 500 TL)

Tavanı aşan maaşta SGK sadece tavan üzerinden hesaplanır.

## Özel kesintiler

- **Sendika aidatı** (opsiyonel, %1-2)
- **BES (Bireysel Emeklilik)** — %3 otomatik dahil, opt-out mümkün
- **İcra kesintisi** — mahkeme kararı (maksimum %25)
- **Nafaka** — kanun kararı

## Ek ödemeler

- **Fazla mesai** = saatlik × 1.5 (normal), × 2 (hafta tatili), × 2 (resmi tatil)
- **Gece zammı** = saatlik × 1.5 (20:00 - 06:00 arası)
- **Prim ve ikramiye**
- **Yol, yemek** (belirli sınır altında gelir vergisi muaf)
- **BES işveren payı** (çalışan brüt üzerinden hesaplanmaz)

## Minimum ücret koruması

- Asgari ücret altında net maaş olamaz
- Prim-ikramiye ile yükseltme
- Asgari ücret destek (2022-2026 geçici) — hesap otomatik

## Bordro çıktısı

- **Bordro** (İş Kanunu md. 37) — çalışana aylık verilir
- Format: PDF, dijital imza, zaman damgası
- Kanunda gereken 15 alan dolu olmalı

## Hata kontrolü

UpCore otomatik:
- Net maaş < asgari ücret → alarm
- Gelir vergisi dilim atlaması → kontrol
- SGK taban/tavan sınır kontrolü
- Kesinti toplam > brüt → kritik

## Yıllık ücret bildirgesi

- Her yıl Şubat — yıllık ödenen ücret bildirim (form 1001/1003)
- Gelir İdaresi Başkanlığı'na gönderim (SGK e-beyanname portal)
- Çalışanın yıllık gelir vergisi beyannamesi için girdidir

===PAGE id=sgk-e-bildirge title=SGK e-Bildirge pos=6===
# SGK e-Bildirge

Sosyal Güvenlik Kurumu'na aylık bildirge üretimi.

## Bildirge türleri

### APB (Aylık Prim ve Hizmet Belgesi)

- Zorunluluk: her ay, en geç ayın 23'üne kadar
- İçerik: her sigortalı için çalışılan gün + prim matrahı
- Format: XML (SGK şema)

### İGB (İşe Giriş Bildirgesi)

- Zorunluluk: işe girişten en geç 1 gün önce
- İçerik: yeni çalışan kimlik + işe giriş tarihi + meslek kodu

### İAB (İşten Ayrılış Bildirgesi)

- Zorunluluk: ayrılışın 10 gün içinde
- İçerik: ayrılış tarihi + sebep kodu + ihbar/kıdem detayı

## XML üretimi

UpCore otomatik:

1. **Ay sonu pencere:** 28. günde hesap önizleme
2. **İK onay:** Hesap inceleme
3. **XML oluştur:** Butona basma
4. **Dijital imza:** Şirket mali müşavir e-imzası
5. **Yükleme:** SGK e-Bildirge portalına (manuel veya API)
6. **Onay:** SGK sistem geri bildirim
7. **Kayıt:** PDF + JSON arşive

## Prim oranları 2026

| Tür | İşveren | İşçi | Toplam |
|---|---|---|---|
| SGK emeklilik | %11 | %9 | %20 |
| Genel sağlık sigortası | %7.5 | %5 | %12.5 |
| İşsizlik | %2 | %1 | %3 |
| **Toplam** | **%20.5** | **%15** | **%35.5** |

Kısa vadeli sigorta (iş kazası): sektör bazlı %0.5-3.

## İşveren teşvikleri

- **5510 5. md teşviği:** 5 puan indirim (%20.5 → %15.5)
- **6111 teşvik:** Genç istihdam (18-29 yaş)
- **İlave istihdam:** yeni işçi — ilk yıl SGK primi devlet karşılar
- **ARGE çalışanları:** %90 stopaj iadesi

UpCore otomatik uygun teşvik hesabı önerir.

## Yanlış bildirim — düzeltme

- **Düzeltme bildirgesi:** APB'nin tekrarı
- **Ek bildirim:** Eksik prim
- **İade:** Fazla ödenen prim geri
- SGK e-Bildirge portal üzerinden

## Erken ayrılış bildirimi (İAB)

İşten ayrılış sebep kodları (aktarım için):
- 1: İstifa
- 2: İşveren fesih (bildirimli)
- 3: İşveren fesih (bildirimsiz)
- 4: İşçinin çıkması (haklı)
- 5: Karşılıklı anlaşma
- 6: Süresi dolma (belirli süreli)
- 7: Ölüm
- 8: Emeklilik
- 9: Askerlik
- 10: Gebe/lohusa izin sonu ayrılma

Her sebep için farklı kıdem tazminatı hakkı!

===PAGE id=kiyafet-mesai title=Mesai ve fazla çalışma pos=7===
# Mesai ve fazla çalışma

Çalışma saatleri ve fazla mesai yönetimi.

## Haftalık çalışma süresi

- **Normal:** haftada 45 saat (4857 md. 63)
- **Günlük max:** 11 saat
- **Fazla çalışma max:** yılda 270 saat
- **Sektör istisnaları:** gece çalışması 7.5 saat, yer altı işleri 37.5 saat

## Mesai kategorileri

### Normal mesai
Sözleşme + hukuki çerçeve içinde — ek ücret yok, normal brüt ücret

### Fazla mesai (4857 md. 41)

- Saat başına **brüt × 1.5**
- Yazılı onay zorunlu (telegram, slack onay sayılır)
- Haftalık 45 saati aşan kısım
- Günde 11 saat, yılda 270 saat sınırı

### Hafta tatili çalışması

- Normal çalışma günü haricinde
- Saat başına **brüt × 2**
- Ek izin günü (opsiyon, çalışan tercihi)

### Resmi tatil çalışması

- Saat başına **brüt × 2**
- Hafta tatili ile birleşirse: iki ayrı ek ödeme
- Resmi tatil izin günü (opsiyon)

### Gece çalışması

- 20:00 - 06:00 arası
- Saat başına **brüt × 1.5**
- Günlük 7.5 saat max

## Mesai takip sistemi

- **Giriş-çıkış kayıtları:** kart okuma, biometric, IP adresi (remote)
- **Onay akışı:** Yönetici onayı otomatik
- **Aylık rapor:** Çalışan + yönetici görür
- **Bordro bağlantısı:** Otomatik

## Fazla mesai onayı

Süreç:
1. Çalışan / yönetici fazla mesai talebi
2. İş yükü gerekçesi
3. İK + yönetici onay
4. Çalışan gönüllü rızası (yazılı)
5. Mesai sistemi günceller
6. Bordro dönem sonu hesaplar

## Yıllık limit uyarısı

- 250 saat → uyarı (yıllık %90 limit)
- 270 saat → kritik (yıllık limit)
- Aşarsa: idari para cezası riski + çalışan sağlığı

## Kredi sistemi (opsiyon)

Bazı şirketler:
- Fazla mesai yerine izin günü biriktirme
- "Compensation time" sistem
- Maks 1 ay stok

## Uzaktan çalışma mesai

- "Hep müsait" anti-pattern'i
- Belirli saat aralığı tanımlama (ör. 09:00-18:00)
- Saat dışında mesaj → mesai sayılmaz (çalışan tercih)
- Dosya+ sistem aktivite log (opsiyonel, KVKK uyumlu)

## Hukuki risk

- Fazla mesai yazılı onay yoksa → iş mahkemesi tazminat kararı
- 5 yıllık geriye dönük talep (TBK 146)
- Çalışan ayrılınca tipik dava — bütün fazla mesai tazminat + faiz

===PAGE id=kidem-tazminati title=Kıdem tazminatı pos=8===
# Kıdem tazminatı

İş sözleşmesi sona erdiğinde çalışana ödenen tazminat.

## Kıdem tazminatı hakkı

Çalışan kıdem tazminatı alır eğer:
- İşveren iş sözleşmesini **haksız fesih** ettiyse (4857 md. 17)
- Çalışan **haklı fesih** ettiyse (4857 md. 24)
- Emeklilik
- Erkek: Askerlik
- Kadın: Evlenme (evlenme tarihinden 1 yıl içinde)
- Ölüm (aileye)

Çalışan kıdem tazminatı **alamaz** eğer:
- İstifa (haklı sebep yoksa)
- İşverence haklı nedenle fesih (4857 md. 25)
- 1 yıl hizmet süresi dolmadıysa

## Hesap formülü

```
Kıdem tazminatı = Yıllık ücretin 30 günü × Hizmet yılı
```

Kısmi yıllar orantılı.

Tavan: **en yüksek asgari ücret** × 30 × kıdem yılı

2026 kıdem tavanı: 44 450 TRY × 30 gün × yıl (yaklaşık, her 6 ayda güncellenir)

## Örnek hesap

Çalışan:
- Brüt maaş: 50 000 TRY
- Hizmet: 8 yıl 7 ay

Aylık brüt / 30 = 1 666 TL/gün
Aylık kıdem = 1 666 × 30 = 50 000 TL
Kıdem tazminatı = 50 000 × 8.58 yıl = 429 167 TL

Tavan kontrolü:
- 2026 kıdem tavanı: 44 450 TRY / ay
- Hesap: 44 450 × 8.58 = 381 381 TL

Kıdem tavanı aşılıyor → **381 381 TL** ödenir (tavandan).

## İhbar süresi ve tazminatı

- **Kanuni ihbar süresi** (4857 md. 17):
  - 0-6 ay: 2 hafta
  - 6 ay - 1.5 yıl: 4 hafta
  - 1.5-3 yıl: 6 hafta
  - 3+ yıl: 8 hafta

İşveren ihbar süresi vermediyse → süre karşılığı tazminat.

## Kıdem tazminatı fonu

(Yasa tasarısı 2009'dan beri gündemde ama çıkmadı. 2026 itibariyle mevcut sistem devam.)

- Önerilen fon: her ay prim × brüt × yıl boyunca birikir
- Ayrılık türü fark etmez — çalışan her durumda alır
- İşverene predictability
- Henüz yasalaşmadı

## Vergi ve SGK kesintisi

- Kıdem tazminatı **gelir vergisinden muaftır** (193 s.K. md. 25/6)
- SGK prim yoktur
- Damga vergisi: %0.759

Net = brüt (tazminatın tamamı)

## Çoklu iş yeri

Aynı şirket bünyesinde iş yeri değişimi kıdeme dahil. Ancak bağımsız tüzel kişilik değişimi yeniden başlar (şirket tüzel kişiliği değişti gibi).

## KVKK

- Kıdem tazminatı hesap verileri 10 yıl saklanır (SGK)
- Çalışan ayrıldıktan sonra talep edebilir (Madde 11/a)
- Mahkeme delili olarak sunulabilir

## UpCore hesap motoru

- Otomatik hesap butonu (ayrılış ekranında)
- Hukuki validation (tazminat hakkı var mı?)
- PDF çıktı
- Muhasebe sistemine entegrasyon

===PAGE id=is-kazasi-bildirim title=İş kazası bildirimi pos=9===
# İş kazası bildirimi

SGK ve İSG (İş Sağlığı ve Güvenliği) mevzuatı gereği bildirim yükümlülüğü.

## İş kazası tanımı (5510 md. 13)

Sigortalının:
- İş yerinde
- İşveren tarafından verilen iş görmekteyken
- İşyeri dışında olan servis vb araç içindeyken
- İşi nedeniyle yerinde olduğu sırada

meydana gelen ve hemen / sonradan sigortalının **bedenen ve ruhen** zarar görmesine sebep olan olay.

## Bildirim süresi

- **SGK'ya:** en geç **3 iş günü** içinde
- **İş Sağlığı Genel Müdürlüğü:** kazayı takip eden 3 iş günü
- **Cumhuriyet Savcılığı:** ağır yaralanma/ölüm → derhal

## Bildirim formu

SGK'nın İş Kazası ve Meslek Hastalığı Bildirim Formu (EK-1):
- Kaza tarihi, saati, yeri
- Kazazedenin bilgileri
- Kaza nedeni (açık açıklama)
- Tanıklar
- İlk müdahale
- Hastaneye sevk
- Sonuç

## UpCore iş kazası akışı

1. **Kaza bildirimi:** olay yerindeki yönetici hemen form doldurur
2. **İlk müdahale:** tıbbi yardım, hastane sevk
3. **SGK bildirimi:** 3 iş günü içinde XML otomatik
4. **İSG bildirimi:** aynı 3 iş günü
5. **İSG uzmanı inceleme:** nedeni + düzeltici aksiyon
6. **Benzer kaza önlemi:** risk analizi güncelleme
7. **Tazminat:** SGK geçici iş göremezlik ödeneği başlar

## Sorumluluklar

### İşveren (6331 md. 4)
- Güvenli çalışma ortamı sağlama
- Risk değerlendirmesi
- İş güvenliği eğitimi
- KKD (Kişisel Koruyucu Donanım) sağlama
- Bildirim yükümlülüğü

### İSG uzmanı
- Periyodik denetim
- Risk analizi
- Eğitim düzenleme
- Kaza soruşturma

### İşyeri hekimi
- Periyodik sağlık muayenesi
- Kaza müdahale
- Rehabilitasyon

## Ceza riskler

Bildirim yapılmaması veya geç yapılması:
- İSG mevzuatına göre: 7 000 - 14 000 TRY idari para cezası (kaza başına)
- SGK mevzuatına göre: ayrıca idari para cezası
- Çalışan zarar için tazminat davası

## Kaza kayıtları

- 30 yıl saklama zorunluluğu
- Kaza raporu, soruşturma, tıbbi kayıt
- KVKK özel nitelikli veri (sağlık)
- Sadece yetkili personel erişim

## İstatistik raporu

UpCore otomatik:
- Yıllık kaza sayısı
- Lost time (iş göremezlik günü) toplamı
- Kaza şiddet oranı
- Benzer sektör karşılaştırma
- Kök neden analizi

===PAGE id=sikca-sorulanlar title=İK Ops — sıkça sorulanlar pos=10===
# İK Ops — sıkça sorulanlar

## Asgari ücret üzerinde maaş veren şirketim — en son tarih nedir?

Asgari ücret değişimi sonrası 1 ay içinde yeni bordro, geriye dönük değil. UpCore otomatik hesaplar.

## Çalışan işten ayrıldıktan sonra ne kadar veri saklamalıyım?

- İş sözleşmesi: 5 yıl (TBK 146 zamanaşımı)
- Bordro: 5 yıl (VUK)
- SGK belgeler: 10 yıl
- Kişisel sağlık kayıtları: 20 yıl (MK saklama süreleri yönetmeliği)
- İş kazası: 30 yıl

## Yıllık izin kullanılmadı — ne yapılır?

- Yıl sonunda otomatik devretme (iş akdi devamı ise)
- Ayrılışta nakde çevirme ZORUNLU — aksi tazminat davası sebebi

## e-Bildirge ilk kez — nereden başlarım?

1. **Admin > İK Ops > SGK entegrasyonu**
2. Şirket SGK sicil no + e-imza sertifikasını yükle
3. Test bildirgesi üret (dry-run)
4. Onay → production mod

## Kısmi çalışan için gün hesabı nasıl?

Kısmi süreli çalışan için oransal hesap:
- 30 gün × (haftalık saat / 45) = aylık gün
- SGK prim matrahı oransal
- Yıllık izin oransal

## İşçi istifa etti — kıdem ödemeli miyim?

Genel: **hayır**. İstisnalar:
- Kadın evlenme → 1 yıl içinde
- Emeklilik
- Askerlik
- Çalışanın haklı fesih (4857 md. 24) — yazılı gerekçe ile

## Belirli süreli sözleşmeyi kaç kez yenileyebilirim?

Art arda 2'den fazla belirli süreli **belirsiz süreliye çevrilir** — kanun hilesi engellemek için (Yargıtay içtihat).

## Uzaktan çalışan SGK'ya nasıl bildirilir?

Uzaktan çalışan da standart sigortalıdır:
- İşyeri: şirket merkezi (adres)
- Meslek kodu: aynı (uzak fark etmez)
- Prim + bildirim: normal
- İş kazası: evde meydana gelirse de iş kazasıdır (şartı: iş amaçlı)
