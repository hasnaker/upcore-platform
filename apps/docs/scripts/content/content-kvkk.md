===PAGE id=genel-bakis title=KVKK / GRC modülü — genel bakış pos=1===
# KVKK / GRC modülü — genel bakış

KVKK (Kişisel Verilerin Korunması Kanunu) ve GRC (Governance, Risk, Compliance) modülü şirketinizin yasal uyum süreçlerini yönetir.

## Yasal çerçeve

- **6698 sayılı KVKK** (2016)
- **KVK Kurulu kararları** (güncellenmiş ikincil mevzuat)
- **GDPR** (AB vatandaşı verileri — EU'daki iş için)
- **ISO 27001** (bilgi güvenliği yönetim sistemi)
- **SOC 2 Type II** (operasyon güvenlik denetimi)
- **ISO 27701** (privacy information management)

## Bileşenler

- Madde 11 hak yönetimi (veri sahibi talepleri)
- VERBIS kayıt
- Aydınlatma metni şablonları
- Açık rıza şablonları + kayıtları
- DPIA (Data Protection Impact Assessment)
- İhlal bildirim 72 saat akışı
- Saklama politikası
- Yurt dışı aktarım dokümantasyonu
- Alt işleyici (data processor) yönetimi
- Audit log erişim + raporlama

## Rol matrisi

- **Veri sorumlusu (data controller):** Şirket — genel sorumluluk
- **Veri işleyen (data processor):** UpCore (kontrat gereği)
- **DPO (Data Protection Officer):** Şirkette atanan kişi — dış denetimde iletişim
- **Veri sahibi (data subject):** Çalışan — hakları korunur

## UpCore'un rolü

UpCore veri işleyen sıfatıyla:
- KVKK md. 12'ye göre teknik + idari tedbirler
- Veri sorumlusunun talimatlarına uymak
- Gizlilik anlaşması (DPA) imzalamak
- İhlal durumunda sorumluya haber vermek (72 saat)
- Alt işleyici kullanımı öncesinde sorumlu onayı

===PAGE id=madde-11-talep-yonetimi title=KVKK Madde 11 talep yönetimi pos=2===
# KVKK Madde 11 talep yönetimi

Çalışanlardan gelen veri sahibi taleplerinin İK tarafı.

## 8 hak (özet)

Detay: [Çalışan perspektifinden Madde 11](/docs/calisan/kvkk/madde-11-haklar).

İK olarak gelen talepler:
1. Veri işleniyor mu? (a)
2. İşleniyorsa bilgi iste (b)
3. Amacı öğren (c)
4. Aktarım öğren (ç)
5. Düzeltme talebi (d)
6. Silme talebi (e)
7. Düzeltmelerin 3. taraflara bildirim (f)
8. Otomatik karar itirazı (g)
9. Tazminat talebi (ğ)

## Süre yönetimi

- **Yanıt süresi:** 30 gün (md. 13/2)
- **Karmaşık talepler için:** 60 gün uzatma, **yazılı gerekçe ile**
- **Ücret:** Madde 13/2 — **ücretsiz** (10 sayfadan fazla çoğaltma için sayfa başı maliyet)

Süre geçerse: KVK Kurulu şikayeti + potansiyel idari para cezası.

## Talep kanalları

UpCore otomatik:
- **Self-servis portal:** `app.upcore.io/kvkk`
- **E-posta:** `kvkk@upcore.io` (auto-ticket)
- **KEP:** kayıtlı elektronik posta
- **Posta / elden:** manuel sisteme girme

## İş akışı

1. **Talep gelir** → otomatik ticket oluşur
2. **Kimlik doğrulama** → TCKN + MFA (kendi hesabıysa)
3. **Sınıflandırma** → İK uzmanı türüne ayırır
4. **Araştırma** → İlgili veriler toplanır
5. **Karar** → Onay / kısmi onay / red
6. **Yanıt** → Yazılı cevap + (onay ise) veri / aksiyon
7. **Kayıt** → Audit log'a yaz

## Sistem otomasyonları

- Veri indirme talebi → arka planda arşiv üretir, şifrelenmiş link
- Düzeltme → değişiklik sonrası 3. taraflara otomatik bildirim
- Silme → saklama süresi biten verileri siler (yasal sebeple koruması gerekenler dışında)
- Otomatik karar itirazı → human review queue

## Red gerekçeleri

Talep reddedilebilir durumlar:
- Yasal saklama süresi doldu yok (bordro 5 yıl)
- Suç soruşturması (yetkili makam talebi)
- Hukuki iddia (devam eden dava kanıtı)
- Açık rıza ile işleniyor ve çalışan rızayı geri almadı
- Hakkın kötüye kullanımı (sık tekrarlanan, zahmet ver)

Red mutlaka **yazılı ve gerekçeli**.

## İtiraz süreç

Red kararına çalışan:
1. KVK Kurulu'na şikayet
2. İş Mahkemesi'ne tazminat davası
3. 30 gün içinde itiraz (md. 14)

## Raporlama

Aylık/yıllık:
- Gelen talep sayısı
- Talep türü dağılımı
- Ortalama yanıt süresi
- Red oranı
- Red nedenleri

Bu rapor **VERBIS yıllık beyanında** zorunlu.

===PAGE id=verbis-kayit-sureci title=VERBIS kayıt süreci pos=3===
# VERBIS kayıt süreci

Veri Sorumluları Sicil Bilgi Sistemi'ne kayıt.

## Zorunluluk

Aşağıdaki şirketlerin VERBIS'e kaydı zorunlu:
- Yıllık çalışan sayısı **50**'den fazla
- Yıllık mali bilanço toplamı **100 milyon TL**'den fazla (2026 eşiği)
- Özel nitelikli kişisel veri işleyen şirketler (herhangi büyüklükte)
- Kamu kurum/kuruluşları
- STK'lar (dernekler, vakıflar) — bazı durumlarda

## Kayıt süreci

1. **verbis.kvkk.gov.tr** adresine girin
2. **e-Devlet** ile giriş (yetkili kişi — DPO veya İK müdürü)
3. **Veri Sorumlusu bilgileri:**
   - Şirket tam ünvanı
   - Vergi no
   - MERSİS no
   - Adres
   - İletişim bilgileri
4. **İrtibat kişisi atama:**
   - Ad-soyad
   - TCKN
   - E-posta
   - Telefon
5. **Veri kategorileri beyan** (bkz. aşağıda)
6. **Aktarım beyan** (yurt içi/yurt dışı)
7. **Güvenlik tedbirleri beyan**
8. **Saklama süreleri beyan**

## Veri kategorileri (UpCore örneği)

| Kategori | İşleme amacı |
|---|---|
| Kimlik (TCKN, ad) | İş akdi, bordro, SGK |
| İletişim | İş akdi, iletişim |
| Özlük | İş akdi yönetimi |
| Hukuki işlem | Uyuşmazlıklar |
| Müşteri işlem | Çalışan × müşteri ilişkisi |
| Fiziksel mekan güvenliği | Kamera kayıtları |
| İşlem güvenliği | Log kayıtları |
| Finans | Bordro, ödeme |
| Mesleki deneyim | Özlük, performans |
| Pazarlama | Yok (çalışan için) |
| Sağlık bilgileri | İş kazası, rapor |
| Ceza mahkumiyeti | İşe giriş belgesi |
| Biyometrik | PDS giriş-çıkış |

## Tescil ücreti

2026 yılı VERBIS tescil ücretleri:
- Yıllık: Ücretsiz
- Kayıt güncelleme: Ücretsiz
- Süresinde kayıt yapılmazsa: **para cezası** (10 000 - 100 000 TRY)

## Değişiklik bildirimi

VERBIS'te ne kayıtlıysa değişirse:
- Yeni veri türü eklediyseniz
- Yeni amaç
- Yeni alt işleyici
- Saklama süresi değişti

→ **30 gün içinde** güncelleyin.

## UpCore VERBIS asistan

UpCore otomatik:
- Şirketiniz için VERBIS beyan taslağı üretir
- 15 kategori veri envanter
- Aktarım listesi (UpCore dahil)
- Güvenlik tedbirleri listesi (ISO 27001 uyumlu)
- Saklama süreleri matrisi

Taslağı inceleyin, eksikleri tamamlayın, VERBIS'e elle kayıt edin (VERBIS API yok — manual portal).

## Denetim

KVK Kurulu periyodik denetim:
- Belgesel denetim (VERBIS beyan vs gerçek)
- Yerinde denetim (ofiste)
- Uyum eksiklik → düzeltme + idari para cezası

Hazırlık: VERBIS'e beyan ettiğinizle **gerçek uygulama** eş olmalı.

===PAGE id=aydınlatma-metni title=Aydınlatma metni şablonu pos=4===
# Aydınlatma metni şablonu

KVKK Madde 10 — aydınlatma yükümlülüğü.

## Zorunlu bilgiler

Her aydınlatma metninde olmalı:
1. Veri sorumlusunun kimliği
2. Kişisel veri kategorisi
3. Kişisel verinin işlenme amacı
4. İşlemenin hukuki sebebi (md. 5)
5. Aktarım alıcıları + sebebi
6. Yöntem (otomatik / manuel)
7. Madde 11 hakları

## UpCore şablonları (12 adet)

1. **İşe alım başvurusu** — aday verileri
2. **İşe giriş** — kabul sonrası özlük
3. **Pulse anketi** — çalışan bağlılık
4. **Performans değerlendirme** — 360, OKR
5. **Müdahale programı** — özel nitelikli veri
6. **Bordro işleme** — mali veri
7. **SGK bildirim** — 3. taraf aktarım
8. **Ziyaretçi / müşteri** — ofis girişi
9. **Kamera kayıt** — fiziksel güvenlik
10. **Pazarlama iletişimi** — potansiyel müşteri
11. **Web sitesi çerez** — dijital izleme
12. **İş kazası** — sağlık verisi

## Şablon yapısı

```
[Şirket Logo]
[Şirket Tam Ünvan]

KİŞİSEL VERİLERİN KORUNMASI HAKKINDA AYDINLATMA METNİ

Sayın [Veri Sahibi],

Bu aydınlatma metni, [açıklama amacı] kapsamında, 6698 sayılı KVKK
Madde 10 uyarınca kişisel verilerinizin işlenmesi hakkında sizi
bilgilendirmek amacıyla hazırlanmıştır.

### 1. Veri Sorumlusunun Kimliği
[Şirket Ünvanı]
[Adres]
[KVKK İletişim: kvkk@domain.com]

### 2. Kişisel Veri Kategorileri
...

### 3. Amaçlar ve Hukuki Sebep
...

### 4. Aktarımlar
...

### 5. Saklama Süreleri
...

### 6. Madde 11 Hakları
Kişisel verileriniz hakkında aşağıdaki haklara sahipsiniz: ...

### 7. İletişim ve Başvuru
[KVKK başvuru adresi]
```

## Yasal dil

- **Basit Türkçe** kullanın (yargıtay kararları okunabilirliği vurguluyor)
- Yabancı kelime + teknik jargon minimal
- Her kategoriye somut örnek

## UI/UX iyi uygulama

- Aydınlatma metni **her seferinde** gösterilmez (ilk kez + değişiklik)
- Ayrı sayfa / modal
- Okumadan geçme engellenmeli (scroll-to-bottom + onay checkbox)
- Metin PDF indirilebilir (saklama)
- Çalışan kendisine gönderilmiş versiyon arşiv

## Değişiklik senaryosu

Aydınlatma metninde değişim (yeni amaç, yeni 3. taraf):
- Yeni metin hazırla
- Çalışanlara **yeniden sunum** + onay
- Eski metin arşiv (audit için)
- Değişiklik tarihi kayıt

## Çok dilli destek

- Türkçe (zorunlu)
- İngilizce (Enterprise müşteriler, uluslararası çalışan)
- Gerekirse diğer diller (Arapça, Rusça)

## Yargıtay içtihat

Aydınlatma zayıflığı gerekçesiyle:
- Veri işleme **baştan geçersiz** olabilir
- Çalışan tazminat alabilir
- KVK Kurulu idari para cezası
- "Bulanık aydınlatma" = aydınlatma yok

===PAGE id=acik-riza title=Açık rıza şablonu pos=5===
# Açık rıza şablonu

KVKK Madde 6/2 — özel nitelikli kişisel veriler için açık rıza zorunlu.

## Özel nitelikli kişisel veriler (md. 6/1)

- Irk, etnik köken
- Siyasi düşünce
- Felsefi inanç
- Din, mezhep
- Dernek / vakıf / sendika üyeliği
- Sağlık verileri
- Cinsel hayat
- Ceza mahkumiyeti + güvenlik tedbirleri
- Biyometrik
- Genetik

## Açık rıza = **açık + özgür + bilgilendirilmiş + spesifik**

1. **Açık:** Örtülü, varsayılan, sessiz rıza geçersiz
2. **Özgür:** Ret hakkı olmalı — işten çıkarma tehdidi ile rıza olmaz
3. **Bilgilendirilmiş:** Aydınlatma metni + spesifik amaç
4. **Spesifik:** Her farklı amaç için ayrı rıza

## UpCore'da açık rıza gerektiren işlemler

1. **Müdahale programı** (sağlık verisi üretir)
2. **Referral psikolog programı** (sağlık)
3. **Biyometrik PDS** (giriş-çıkış sistemi)
4. **LinkedIn profil izleme** (retention tahmini için, opt-in)
5. **Fotoğraf pazarlama kullanımı** (website, LinkedIn)

## Şablon

```
AÇIK RIZA METNİ

[Spesifik amaç, örn. "Tükenmişlik müdahale programı — 8 haftalık koçluk"]

Bu rıza metni, [amaç] için kişisel verilerimin işlenmesine ilişkindir.

### İşlenecek veriler
- [spesifik liste]

### Amaç
- [spesifik amaç]

### Hukuki sebep
- KVKK Madde 6/2 — açık rıza

### Süre
- [spesifik süre, örn. "Müdahale bitimine kadar + 7 yıl arşiv"]

### Ret hakkı
- Bu rızayı vermezsem [sonuç — olmamalı ki "işten çıkarılma"]. Rızam
  yalnızca [spesifik amaç] için geçerli. İstediğim zaman geri çekebilirim.
  Geri çekme tarihinden sonraki işlemeyi durdurur.

### Madde 11 hakları
- [özet]

Açıkça beyan ediyorum ki yukarıda belirtilen şartlar altında
kişisel verilerimin işlenmesine RIZA GÖSTERİYORUM.

[Ad-Soyad]
[İmza / e-imza]
[Tarih]
```

## Rıza kaydı

UpCore her rıza için:
- Rıza metni hash'i (tamperproof)
- Çalışan dijital imza hash'i
- Timestamp (TSE)
- IP + device
- Audit log'a WORM kayıt

## Geri çekme

Her açık rıza **geri çekilebilir** (md. 11/e ve 7/1):
- Portal üzerinden self-servis
- Geri çekme tarihi → o noktadan sonraki işleme durur
- Eski veriler saklama politikasına göre

## Yanlış uygulama örnekleri

**Kabul edilemez** rıza:
- "Bu formu imzalamadan işe başlayamazsınız" → özgür değil
- Tek tik tüm amaçlara onay → spesifik değil
- Aydınlatma metni ile birleşik "Yukarıdakiler okundu, kabul ediyorum" → açık değil
- Çalışan pdf indirir, imzalar, teslim eder — sonra iptal edemez → geri çekme hakkı ihlali

## Denetim

KVK Kurulu denetiminde:
- Rıza metni örneği
- Rıza kayıt süreci (nasıl alındı, nasıl saklanıyor)
- Geri çekme süreç
- İhlal durumunda çalışana bilgilendirme

===PAGE id=dpia-sablon title=DPIA (Veri Koruma Etki Değerlendirmesi) pos=6===
# DPIA (Veri Koruma Etki Değerlendirmesi)

Yüksek riskli veri işleme faaliyetleri için **öncesinde** zorunlu değerlendirme.

## Ne zaman DPIA gerekli?

KVK Kurulu kararları ve GDPR'de yer alan senaryolar:
- Sistematik ve kapsamlı otomatik değerlendirme (ML modelleri)
- Özel nitelikli verilerin büyük ölçekte işlenmesi
- Sistematik izleme (biyometrik, video)
- Savunmasız veri sahipleri (çocuklar, hastalar, çalışanlar)
- Yeni teknoloji kullanımı (AI, IoT, blockchain)
- Yurt dışı aktarım

## UpCore'da DPIA gereken 3 kategori

### 1. Tükenmişlik tahmin modeli (ML)

- **Veri:** Pulse cevapları + özlük + performans + iletişim agregası
- **Amaç:** 90 gün içinde yüksek risk çalışan tahmin
- **Risk:** Çalışan üzerinde olumsuz etki (ayrımcılık riski)
- **Önlem:** Bias denetim, insan onay zorunlu, itiraz hakkı

### 2. Biyometrik giriş-çıkış (PDS)

- **Veri:** Parmak izi veya yüz tanıma
- **Amaç:** Fiziksel güvenlik + mesai takibi
- **Risk:** Veri sızıntısı → sahtecilik (biyometrik değiştirilemez)
- **Önlem:** Template değil hash, local processing, çalışan iznine göre alternatif

### 3. Sağlık verisi işleme (müdahale)

- **Veri:** BAT-TR skorları, psikolog referansları
- **Amaç:** Müdahale önerisi + etki ölçümü
- **Risk:** Stigma, KVKK ihlal
- **Önlem:** Açık rıza, sağlayıcı gizliliği, k-anonimlik

## DPIA içeriği (md. 6/4'e uygun)

1. **İşlemenin tanımı** — veriler, amaç, akışlar
2. **Hukuki sebep** — md. 5 veya 6
3. **Orantılılık + gereklilik değerlendirmesi**
4. **Risk analizi** — potansiyel zararlar
5. **Önlemler** — risk azaltıcı teknik + idari
6. **Artık risk** — önlemler sonrası
7. **Kararlar ve gerekçe**

## UpCore DPIA şablonları

Her 3 kategori için önceden hazırlanmış DPIA şablonu:
- Örnek değerlendirmeler
- Yaygın risk listesi
- Önerilen önlemler
- Tescil süreci (KVK Kurulu'na bildirim)

## Güncelleme

DPIA yapılan işleme değişirse:
- Yeni amaç, yeni veri türü → yeniden değerlendirme
- Yıllık gözden geçirme (zorunlu değil, iyi uygulama)
- Major sürüm değişiklikleri

## Dokümantasyon

Her DPIA için:
- PDF belge (imzalı, tarihli)
- Audit log'a kayıt
- VERBIS'e bağlantı (kategorilerle)
- İK + DPO + üst yönetim onay imzası

===PAGE id=ihlal-bildirim-72-saat title=İhlal bildirim (72 saat) pos=7===
# İhlal bildirim (72 saat)

KVKK Madde 12/5 — kişisel veri ihlali halinde bildirim yükümlülüğü.

## İhlal tanımı

Kişisel verilerin:
- Kazara veya hukuka aykırı yok edilmesi
- Kaybolması
- Değiştirilmesi
- İzinsiz ifşa edilmesi
- Erişilmesi

**GDPR uyumlu Türkçe tanım** — her türlü gizlilik, bütünlük, erişilebilirlik ihlali.

## 72 saat kuralı

KVK Kurulu'na bildirim **en geç 72 saat** içinde. Sürenin başlangıcı:
- Veri sorumlusunun ihlalden **farkındalık** zamanı (not: meydana gelme zamanı değil)

## İhlal kategorileri

### Düşük risk
- Şirket içi yanlışlık — veri dış sızmadı
- Otomatik olarak tespit edilen ve düzeltilen
- Etkilenen kişi sayısı az
- Özel nitelikli veri yok

**Bildirim:** Genelde bildirilmez (risk-based approach), iç kayıt şart.

### Orta risk
- Şirket içinde yanlış erişim
- Veri dışa sızdı ama izinsiz kullanım kanıtı yok
- Özel nitelikli veri orta ölçek

**Bildirim:** KVK Kurulu'na zorunlu (72 saat).

### Yüksek risk
- Dış hack, ransomware
- Büyük ölçekli sızıntı
- Özel nitelikli veri sızdı
- Potansiyel kimlik hırsızlığı

**Bildirim:** KVK Kurulu + **etkilenen veri sahiplerine** ayrı ayrı (md. 12/5).

## UpCore ihlal yönetim akışı

1. **Tespit:** SIEM alarmı, çalışan raporu, dış kaynak
2. **Değerlendirme:** DPO + CISO + İK 2 saat içinde senkron
3. **Triage:** Risk kategorisi belirleme
4. **Kontrol alma:** Tehdit durdurma (şifre reset, IP blok)
5. **Kapsam belirleme:** Hangi veriler etkilendi?
6. **Bildirim:** KVK Kurulu formu + (gerekirse) veri sahiplerine
7. **Kök neden:** Teknik + süreç
8. **Düzeltme:** Uzun vadeli önlem
9. **İletişim:** Kamuoyu açıklama (public companies)

## Bildirim formu

KVK Kurulu "Veri İhlali Bildirim Formu":
- İhlal tarihi / tespit tarihi
- İhlal türü (siber saldırı, yetkisiz erişim, kayıp, vb.)
- Etkilenen veri kategorileri
- Etkilenen kişi sayısı
- Olası sonuçlar
- Alınan önlemler
- DPO iletişim

## Bildirim dili

- Net, teknik jargon yok
- Yaşanan gerçek
- Abartı yok, eksiltme yok
- Kural: KVK Kurulu ile şeffaflık + güven

## İdari para cezası

Bildirim yapılmaması / geç yapılması:
- **500 000 TL'ye kadar** idari para cezası
- Ağır ihlal + büyük ölçek → daha yüksek

Bildirim yapılması bile tek başına sorumluluğu kaldırmaz — alınan önlemlerin yeterliliği değerlendirilir.

## İç runbook

UpCore'da hazır runbook:
- Adım adım akış
- Rol matrisi (kim, ne, ne zaman)
- Template bildirim metni
- Basın açıklama draft
- Çalışan bilgilendirme template

Tatbikat (game day) yıllık **zorunlu**.

===PAGE id=saklama-politikasi title=Saklama politikası pos=8===
# Saklama politikası

Her veri kategorisinin saklama süresi + silme prosedürü.

## Zorunlu saklama süreleri

| Veri | Süre | Mevzuat |
|---|---|---|
| İş sözleşmesi | 5 yıl (ayrılış sonrası) | TBK md. 146 |
| Bordro | 5 yıl | VUK md. 253 |
| SGK belgeler | 10 yıl | SGK |
| İş kazası kayıtları | 30 yıl | 6331 İSG |
| Sağlık raporu | 20 yıl | Tıbbi etik |
| Özlük fotokopisi | 5 yıl | SGK |
| Vergi belgesi | 5 yıl | VUK |
| Denetim / soruşturma | Dava süresi + 5 yıl | Hukuki |
| Ticari belgeler | 10 yıl | TTK |

## UpCore'da saklama politikası

| Kategori | UpCore saklama |
|---|---|
| Çalışan aktif | Ayrılıştan 5-10 yıl sonra (yasal minimum) |
| Pulse cevapları | 7 yıl → anonimleştirme |
| 360 değerlendirme | 5 yıl |
| Müdahale kayıtları | 7 yıl (klinik), sonra anonim |
| Kamera kaydı | 30 gün (güvenlik) |
| Log kayıtları | 1 yıl (audit), 10 yıl WORM (KVKK) |
| E-posta yedek | 1 yıl |
| Toplantı kaydı | 90 gün (opsiyonel) |
| LinkedIn profil (opt-in) | 30 gün |
| Pazarlama | Rıza geri çekene kadar |

## Otomatik silme

Süre dolunca UpCore otomatik:
- **Hard delete:** Kategori silme politikasına göre
- **Anonymization:** TCKN hash, isim → "Anonim-ABCD", lokasyon → "İl-X"
- **Archive:** 7 yıl soğuk arşiv, sonra tamamen silme
- **Notification:** DPO'ya silme raporu

## İstisna yönetimi

Bazı durumlarda silme yapılmaz:
- **Legal hold:** Devam eden dava süresince
- **İdari soruşturma:** Sonuçlanana kadar
- **Sözleşme zorunluluğu:** Müşteri kontratı gereği
- **Yasal saklama:** Minimum süre dolmadıysa

## Silme prosedürü

1. **Planla:** Silme kayıtları aylık çıktı
2. **Doğrula:** İstisna kontrolü
3. **Uygula:** Otomatik cron job
4. **Kayıt tutma:** Silme işleminin kanıtı
5. **Rapor:** Aylık DPO'ya

## Fiziksel belge

Bazı belgeler (imzalı sözleşme) fiziksel arşivde:
- Kilitli dolap
- Erişim log
- Yangın + su korunumu
- Yıllık envanter

## Alt işleyici silme

UpCore alt işleyicileri kullanıyorsa (örn. AWS S3):
- Sözleşmede silme yükümlülüğü
- Alt işleyici silme onay kayıtları
- Kısmi silme desteklemeyen hizmet kullanmayın

## Ayrılış sonrası

Çalışan ayrıldıktan sonra:
- 30 gün within: Veri indirme hakkı (Madde 11/a)
- 30 gün sonrası: Saklama politikasına geçer
- 5-10 yıl: Zorunlu saklama
- Sonrası: Anonimleştirme veya silme

===PAGE id=yurtdisi-aktarim title=Yurt dışı aktarım pos=9===
# Yurt dışı aktarım

KVKK Madde 9 — kişisel verinin yurt dışına aktarımı.

## Hukuki temel

Aktarım yapılabilir eğer:
1. **Açık rıza** (md. 5/1)
2. **Yeterlilik kararı** alınmış ülke (KVK Kurulu listesi)
3. **Yeterli önlemler** (BCR, standart sözleşme maddeleri)
4. **İstisna** (md. 9/2 — sınırlı durumlar: hayat kurtarma, önemli kamu menfaati)

## Yeterlilik kararı olan ülkeler (Şubat 2026)

- AB üyeleri (bazı koşullarla, KVK Kurulu son güncellemeye bakın)
- İngiltere (post-Brexit)
- ABD — **Data Privacy Framework** katılımcı şirketler (yeni framework)
- Yeni Zelanda, Japonya, Güney Kore, İsrail, Arjantin (tartışma halinde)

## Önemli: Türkiye'den çıkmayan veri tercihi

UpCore tüm verileri **Türkiye'de** (Azure West Europe - İrlanda, Avrupa bölgesi opt-in) saklar. AWS / GCP kullanılmaz.

## Standart sözleşme maddeleri (SCC)

- AB SCC (2021+) — AB modeline benzer Türkiye versiyonu yok (henüz)
- KVK Kurulu standart sözleşme taslakları (2023 güncel)
- Transfer impact assessment (TIA) önerilen

## UpCore alt işleyici listesi

Veri işleme sürecinde UpCore kullandığı 3. taraflar:

| Alt işleyici | Amaç | Lokasyon | Yasal temel |
|---|---|---|---|
| Microsoft Azure (primary) | Altyapı | Türkiye İstanbul | Türkiye içi |
| Microsoft Azure (DR) | Yedek | Frankfurt / İrlanda | SCC + GDPR uyumlu |
| SendGrid | E-posta | ABD | DPF katılımcı |
| Twilio | SMS | ABD | DPF katılımcı |
| Algolia | Arama | Fransa | GDPR |
| Anthropic | LLM (opsiyonel) | ABD | DPA + SCC |
| OpenAI | LLM (opsiyonel) | ABD | DPA + SCC |

**Not:** LLM entegrasyonları **opt-out** varsayılandır. Tenant açtığında kişisel veri gönderilmez (agrega analizi local).

## DPA (Data Processing Agreement)

UpCore müşterileri için standart DPA:
- KVKK Madde 12 + GDPR Madde 28 uyumlu
- Alt işleyici listesi + güncelleme politikası
- Güvenlik tedbirleri (Annex II)
- Denetim hakları

DPA otomatik PDF indirme: [DPA şablonu](/docs/admin/uyum/dpa-sablon).

## Müşteri veri sovereignty

Enterprise müşteriler:
- **Data residency:** Sadece Türkiye (cost 10-20% higher)
- **Customer-managed keys:** Kendi anahtarınızı kullanın
- **Single-tenant deployment:** Ayrı Azure subscription

## Denetim

Yurt dışı aktarım için:
- Yıllık transfer report
- Alt işleyici değişiklik bildirimi
- VERBIS'te güncel beyan
- Müşteri DPO'ya erişim

===PAGE id=sikca-sorulanlar title=KVKK/GRC — sıkça sorulanlar pos=10===
# KVKK/GRC — sıkça sorulanlar

## DPO atanmak zorunlu mu?

Her şirket için değil. Zorunluluk:
- Büyük ölçekli sistematik veri işleme
- Özel nitelikli veri sistematik işleme
- Kamu kuruluşları

Küçük şirketler (50+ çalışan ama büyük veri işleme yok) için DPO zorunlu değil — "KVKK sorumlusu" atanması yeter. UpCore DPO pozisyonu önerir.

## Türkiye'nin GDPR uyumluluk durumu?

KVKK büyük ölçüde GDPR ile örtüşür ama tam eşit değil:
- Adequacy decision yok (AB tarafından)
- AB'deki şirketler Türkiye'den veri alırken ek sözleşme
- Pratik olarak UpCore her iki rejim için uyumlu çalışır

## Çalışan veri silme istiyor ama bordrom kalmalı mı?

Evet — yasal saklama hükmü. Bordro 5 yıl saklanmak zorunda. Çalışana:
- Pulse cevapları + 360 yorumları silinebilir
- Bordro + SGK + iş sözleşmesi saklanır (bilgi verilir)
- 5 yıl sonra otomatik silme

## İşe alım başvurusu verileri ne kadar saklanır?

İşe alınmayan aday:
- **180 gün** — aday onay verirse (ileriki başvurular için)
- Onay yoksa mülakat sonrası 30 gün → silme

## Kamera kayıtları ne kadar?

- Güvenlik amaçlı: **30 gün** (KVK Kurulu önerisi)
- Hukuki soruşturma olursa: süreç sonuna kadar
- Açık rıza zorunlu? Hayır — meşru menfaat (md. 5/2-f) ama aydınlatma gerekir (giriş tabela)

## Anonim veri KVKK kapsamında mı?

Hayır — gerçekten anonim (hiçbir şekilde tekrar kişiye bağlanmayan) veri KVKK kapsamında değil. Ancak:
- Pseudonymization (örn. hash) KVKK kapsamında
- Yeniden kimliklendirilebilir veri KVKK kapsamında
- Test: "dışarıdan bir uzman ek veri kullanarak kimliği belirleyebilir mi?"

## İhlal oldu — sigortalımız var mı?

UpCore Enterprise plan: **siber güvenlik sigortası** dahil (500 000 USD'ye kadar). Starter planlar: müşteri kendi sigorta.

## İş arkadaşım KVKK ihlali yapıyor (dedikodu yayıyor) — ne yapmalıyım?

- **Whistleblower kanalı:** `app.upcore.io/whistleblower` (anonim)
- İK soruşturur
- Bulgular varsa disiplin + olası KVK Kurulu bildirimi
