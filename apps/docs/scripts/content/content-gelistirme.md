===PAGE id=genel-bakis title=Geliştirme modülü — genel bakış pos=1===
# Geliştirme modülü — genel bakış

Geliştirme modülü çalışan **yetkinlik haritası + öğrenme yolu + sertifika takibi** sağlar.

## Bileşenler

- **Yetkinlik modeli** — rol-bazlı yetkinlik kütüphanesi
- **Öğrenme yolu** — kişiselleştirilmiş kurs/kaynak önerisi
- **Sertifika takibi** — dış + iç sertifikaların merkezi kaydı
- **Koçluk programı** — iç koçluk eşleştirme
- **Mentorluk** — mentor ↔ mentee yapısı
- **Kaynak kütüphanesi** — kurs, kitap, makale, podcast
- **Bütçe yönetimi** — eğitim bütçesi dağılımı
- **Etki değerlendirme** — öğrenmenin iş sonuçlarına etkisi

===PAGE id=yetkinlik-modeli title=Yetkinlik modeli pos=2===
# Yetkinlik modeli

## Yetkinlik tanımı

Yetkinlik = bir rolü başarıyla yerine getirmek için gereken **bilgi, beceri, davranış** bütünü.

## 3 boyutlu model

1. **Core yetkinlikler** — şirket geneli (ör. dürüstlük, müşteri odaklılık)
2. **Role-spesifik teknik** — iş alanına özel (ör. SQL, proje yönetimi, satış)
3. **Leadership** — yönetici rolleri için (ör. koçluk, vizyon, karar verme)

## Seviye sistemi

Her yetkinlik 5 seviyede tanımlanır:

| Seviye | Tanım | Örnek (SQL) |
|---|---|---|
| L1 — Farkında | Kavramı bilir | "SELECT vs JOIN ne işe yarar biliyor" |
| L2 — Temel | Basit işler yapar | "Basit sorgu yazabilir" |
| L3 — Uygulayıcı | Rutin işler yapar | "Çoklu tablo JOIN + GROUP BY rutin" |
| L4 — İleri | Karmaşık işler | "Pencere fonksiyonları, performans tuning" |
| L5 — Uzman | Başkalarına öğretir | "Standart koyar, mimari karar" |

## Rol → yetkinlik haritası

Her rol için gereken yetkinlikler + minimum seviye:

Örneğin **Senior Backend Developer**:
- SQL: L4
- Go: L4
- Distributed systems: L3
- Code review: L3
- Mentorluk: L2
- İletişim: L3

## Çalışan seviye belirleme

Yöntemler:
1. **Öz değerlendirme** — çalışan kendi seviyesi işaretler
2. **Yönetici değerlendirme** — yıllık review'da
3. **Peer review** — akranlardan (360 içinde)
4. **Test** — teknik roller için (LeetCode / HackerRank / kendi test)
5. **Sertifika** — otomatik L eklenir

## Gap analizi

Çalışanın mevcut rolü + hedef rolü arasındaki yetkinlik farkı:
- Hangi yetkinlik eksik?
- Her gap için hangi öğrenme kaynağı?
- Tahmini gelişim süresi?
- Mentor öneri?

## Görselleştirme

- Örümcek grafiği (radar chart): mevcut vs hedef
- Yetkinlik ısı haritası (ekip geneli)
- Gelişim trend grafiği (zaman içinde)

===PAGE id=ogrenme-yolu title=Öğrenme yolu (learning path) pos=3===
# Öğrenme yolu (learning path)

Kişiselleştirilmiş öğrenme programları.

## Yol oluşturma tetikleyiciler

1. **Yetkinlik gap'i** — gap analizi tetikler otomatik öneri
2. **Kariyer hedefi** — çalışan "X rolüne ilerlemek istiyorum" deyince
3. **Performans önerisi** — yönetici 1-1'da önerir
4. **Sertifika hedefi** — çalışan sertifika almak ister

## İçerik türleri

| Tür | Örnek | Süre |
|---|---|---|
| Online kurs | LinkedIn Learning, Udemy, Coursera | 1-40 saat |
| Kitap | Amazon / internal kütüphane | 5-20 saat |
| Makale / blog | Harvard Business Review, internal | 5-30 dk |
| Podcast | WorkLife, HBR IdeaCast | 30-60 dk |
| Video | YouTube eğitim kanalları | 10-120 dk |
| Workshop | İç + dış atölye | 2-16 saat |
| Sertifika programı | AWS, PMP, ICF | 20-100 saat |
| Konferans | Dış etkinlik | 1-3 gün |
| Stretch proje | İç proje ile pratik | 1-6 ay |

## Öğrenme yolu şablonu

Örnek: **Junior → Mid Backend Developer (12 ay)**

- **Ay 1-2:** Go ileri konular (concurrency, context) — 20 saat
- **Ay 3:** Distributed systems temelleri (MIT 6.824 playlist) — 15 saat
- **Ay 4-5:** PostgreSQL performans tuning — 10 saat + hands-on
- **Ay 6:** Code review kültürü — 5 saat (iç workshop)
- **Ay 7-8:** Mentor eşliğinde real-world proje
- **Ay 9:** Teknik yazı yazma (blog post veya iç doc) — 1 yazı
- **Ay 10:** Topluluk katılım (conference talk veya open source PR)
- **Ay 11-12:** Sertifika (opsiyonel — Go Academy)

## Takvim

- Haftalık hedef çalışma süresi (ör. 3 saat/hafta)
- Calendar'a blok yerleştirme (Google / Outlook sync)
- Yönetici onayı (iş saatinde çalışma)

## İlerleme takibi

- Her kaynak için "başlandı / devam ediyor / tamamlandı" durumu
- % tamamlama
- Haftalık reminder
- Ayda 1 kez yönetici-çalışan ilerleme görüşmesi

## Sosyal öğrenme

- **Learning circle** — 3-5 kişilik grup aynı yolu takip
- **Buddy system** — ikili destek
- **Expert hour** — Cuma 1 saat, konu uzmanı sunum

## Gamification

Kısıtlı kullanılır (aşırıya kaçarsa motivasyon bozar):
- Tamamlama rozetleri (sadece anlamlı hedefler)
- Öğrenme lider tablosu (opsiyonel)
- Takım bazında yarış (sadece kültürel uygunsa)

===PAGE id=sertifika-takibi title=Sertifika takibi pos=4===
# Sertifika takibi

Dış + iç sertifikaların merkezi kayıt sistemi.

## Sertifika kategorileri

### Dış sertifikalar
- AWS (Solutions Architect, DevOps, Developer, vb.)
- Azure (Fundamentals, Administrator, Architect)
- Google Cloud (Associate, Professional)
- PMP / PRINCE2 / ScrumMaster
- ICF (ACC, PCC, MCC)
- Six Sigma (Yellow, Green, Black Belt)
- MBA / MS derecesi
- Kurumsal (Salesforce, HubSpot, SAP)

### İç sertifikalar
- Şirket özel programlar
- "Leadership Academy" mezuniyet
- Teknik review panel
- İç mentor sertifikası

## Kayıt akışı

1. Çalışan sertifika alır
2. UpCore'a yükler:
   - PDF belge
   - Sertifika numarası
   - Veren kurum
   - Alış tarihi
   - Son geçerlilik (varsa)
3. İK otomatik doğrulama (AWS/Azure için API)
4. Onay → yetkinlik modeline otomatik seviye artışı

## Süre yönetimi

Bazı sertifikalar yenilenmeyi gerektirir:
- AWS: 3 yıl
- PMP: 3 yıl + 60 PDU
- Kurumsal: değişken

Sistem:
- Son 6 ayda hatırlatıcı
- Son 1 ayda kritik uyarı
- Süre geçerse otomatik "expired" işaretleme
- Yetkinlik modeli seviye kaydı değişmez (deneyim kalır)

## Bütçe entegrasyonu

Sertifika bedelinin şirket karşılaması için:
1. Çalışan **sertifika talep formu** doldurur
2. Yönetici + İK onayı
3. Bütçe ayrılır (eğitim bütçesi kaleminde)
4. Satın alma
5. Alış sonrası geri ödeme (receipt gerekli)

## Kurumsal sözleşme

Popüler sertifikalar için kurumsal paket:
- AWS Training kit
- Udemy Business
- LinkedIn Learning
- Coursera for Business

Bu paketlerin sertifika bedelini ayrıca ödemek gerekmez.

## Zorunlu sertifikalar

Bazı rollerde zorunlu:
- Yeminli mali müşavir (CPA) — finans departmanı
- İş güvenliği uzmanı sertifikası — İSG
- KVKK danışman sertifikası — compliance

Otomatik takip + hatırlatıcı + rol değişim engelleme.

## Performans ile ilişki

- Sertifika alma → yetkinlik seviye artışı → 9-kutu potansiyel ekseninde etki
- Zam/terfi kararında "recent learning investment" kanıtı
- Gelişim yönelimi pozitif sinyal

## Publicity

Çalışan onayıyla LinkedIn post — "X sertifikasını aldı". Şirket hesabı paylaşım.

===PAGE id=koçluk-programi title=Koçluk programı pos=5===
# Koçluk programı

İç + dış profesyonel koçluk eşleştirme.

## Koçluk türleri

### 1. Yönetici koçluğu
- Hedef: yönetim becerilerini geliştirmek
- Süre: 3-6 ay, ikili ya da grup
- Sağlayıcı: ICF PCC+ iç / dış koç

### 2. Kariyer koçluğu
- Hedef: kariyer yolu netleşmesi
- Süre: 3-4 oturum
- Sağlayıcı: ICF ACC+ iç / dış koç

### 3. Performans koçluğu
- Hedef: spesifik performans gap'i
- Süre: 1-3 ay
- Sağlayıcı: iç manager / dış iç koç

### 4. Takım koçluğu
- Hedef: ekip dinamiği iyileştirme
- Süre: 2-4 oturum
- Sağlayıcı: grup koçluk akreditasyonu

## Eşleştirme algoritması

1. **Uygunluk:** Koçun uzmanlık alanı (teknik, liderlik, satış)
2. **Kimya:** İlk 30 dk chemistry call — feel right değilse yeniden eşleştirme
3. **Zaman dilimi:** Saat uygunluğu
4. **Dil:** Türkçe / İngilizce
5. **Cinsiyet tercihi:** Çalışan tercih ediyorsa

## Kontrakt

Koç-danışan arası sözlü sözleşme:
- Hedef (SMART)
- Seans sıklığı (2 haftada 1 tipik)
- İletişim kuralları (arada WhatsApp yok)
- Gizlilik sınırları
- Ölçüm (başlangıç + bitiş)

## Gizlilik

Seans içeriği **gizli** (ICF etik ilkeleri). İK sadece:
- Seans sayısı
- Tarihler
- Genel ilerleme (koç onaylı 1-2 cümle)

Detay içerik: yok.

## Ödeme

- İç koç: çalışma saati içinde, ek ücret yok
- Dış koç: şirket faturası ödüyor (Enterprise plan limiti içinde)
- Seans başı 1500-3000 TL (kıdeme göre)

## Etki ölçümü

- Ön-son değerlendirme (koçluk memnuniyeti)
- Hedef ilerleme (kendi değerlendirme)
- 360 değerlendirme farkı (6 ay sonra)
- Yönetici gözlem değişimi

Yıllık rapor: "Koçluk yatırımı × performans" analizi.

## Koç havuzu

UpCore ile kontratlı koçlar:
- 50+ Türkiye'de
- ICF PCC+ seviye zorunlu
- Yıllık rotasyon (1 yıl aynı koç max 3 danışan)
- Çalışan feedback → koç değerlendirme

## Kendi iç koç programı

Enterprise müşteriler kendi iç koç programı kurabilir:
- 20+ yöneticiye ICF ACC eğitimi
- Yıllık maliyet: 300 000 – 800 000 TRY
- 3-5 yılda ROI (dış koçluk harcamasının yerini alır)

===PAGE id=mentorluk title=Mentorluk programı pos=6===
# Mentorluk programı

Deneyimli çalışan ↔ junior çalışan eşleştirme.

## Koçluk vs mentorluk farkı

| Özellik | Koçluk | Mentorluk |
|---|---|---|
| Amaç | Özgüven + keşif | Alan bilgisi + ağ |
| Kim sorar? | Danışan | Mentee |
| Kim cevap verir? | Koç sorar, danışan bulur | Mentor tecrübesini paylaşır |
| Alan | Her şey | Spesifik (kariyer, teknik, sektör) |
| Süre | 3-6 ay | 1-3 yıl |
| Formal/informal | Formal kontraktlı | Genelde informal |

## Mentor profili

- Kendi alanında L4-L5 yetkinlik
- 5+ yıl deneyim
- Mentorluk motivasyonu (gönüllü)
- Temel mentor eğitimi tamamlamış (4 saatlik iç eğitim)

## Mentee profili

- Aktif öğrenmeye açık
- Net soru geliştirmiş
- Takip yapabilir
- Zamanlaması net

## Eşleştirme

- **Algoritma:** yetkinlik hedefleri + deneyim alan + kariyer yolu örtüşmesi
- **İlk tanışma:** 30 dk chemistry call
- **Kontrakt:** Yazılı mentor anlaşma (Mentorship canvas)

## Ritim

- Aylık 1 saat (min)
- Quarterly milestone
- Yıllık tam değerlendirme

## Gündem formatı

Her görüşme için:
1. **Check-in** (5 dk) — genel durum
2. **İlerleme** (15 dk) — son aydan beri ne oldu?
3. **Zorluklar** (20 dk) — şu an nerede takıldın?
4. **Pratik tavsiye** (15 dk) — mentor deneyim aktarımı
5. **Sonraki adımlar** (5 dk) — 3 aksiyon

## Grup mentorluk

Bir mentor + 3-5 mentee format:
- Ayda 1 kez grup toplantısı
- Peer-to-peer öğrenme de dahil
- Mentor iş yükü daha az

## Tersine mentorluk (reverse mentoring)

Junior çalışan → senior yöneticiye alan rehberliği:
- Teknik trend (AI, social media, Gen Z kültür)
- Yeni çalışma şekilleri (remote, hybrid)
- Çeşitlilik ve kapsayıcılık

Popüler: Cross-generation yönetim için güçlü araç.

## Ölçüm

- Mentor ve mentee memnuniyet
- Hedef ulaşma oranı (başlangıç + 6 ay sonra)
- Mentee kariyer ilerleme (1 yıl sonra)
- Mentor programından ayrılma oranı

===PAGE id=ilk-kaynak-kutuphanesi title=Kaynak kütüphanesi pos=7===
# Kaynak kütüphanesi

Curated öğrenme kaynakları — herkes için erişilebilir.

## Kategoriler

### Teknik
- Backend: Go, Python, Node.js, Java, C#
- Frontend: React, Vue, Next.js, CSS
- Data: PostgreSQL, MongoDB, Kafka, Spark
- DevOps: Kubernetes, Terraform, AWS/Azure/GCP
- AI/ML: TensorFlow, PyTorch, LangChain

### İş / yönetim
- Liderlik (First Break All The Rules)
- Ekip yönetimi (High Output Management)
- Stratejik düşünme (Blue Ocean Strategy)
- Zaman yönetimi (Deep Work)
- Karar verme (Thinking Fast and Slow)

### İletişim
- Yazma (On Writing Well, Bird by Bird)
- Sunum (Made to Stick, Talk Like TED)
- Müzakere (Never Split The Difference)
- Zor konuşmalar (Crucial Conversations)

### Kişisel gelişim
- Mindfulness (Wherever You Go There You Are)
- Dayanıklılık (Grit)
- Alışkanlık (Atomic Habits)
- Finans (The Psychology of Money)

## Format

Her kaynak için kayıt:
- Başlık + yazar
- Format (kitap, podcast, kurs, makale)
- Süre
- Seviye (başlangıç / orta / ileri)
- Dil
- Şirket içi review (yıldız + yorum)
- Kime önerilir (rol, kıdem)
- Yazarın özeti (3 cümle)

## Kurumsal abonelikler

Şirket tarafından finanse edilen:
- LinkedIn Learning — 10 000 kurs
- Udemy Business — 20 000 kurs
- Coursera for Business — 5 000 kurs
- O'Reilly Safari — teknik kitap
- Blinkist — kitap özetleri
- Harvard Business Review abone

## İç kütüphane

Fiziksel + dijital kitaplar:
- Fiziksel: ofis kitaplık, ödünç alma sistemi
- Dijital: PDF / EPUB, DRM'lı

## Okuma kulüpleri

- 4-8 kişilik grup
- Ayda 1 kitap / makale
- 1 saat tartışma
- UpCore'da kayıt + takvim

## Ödül sistemi

Öğrenme aktivitesi:
- 1 kurs tamamlama → 100 puan
- Sertifika → 500 puan
- Blog post → 300 puan
- Konferans konuşması → 1000 puan

Puan → yıllık eğitim bütçesi bonus (%10 ek).

## İçerik katkısı

Çalışanlar kendi kaynaklarını da ekleyebilir:
- Okuduğu kitap review
- Yazdığı teknik yazı
- Konuştuğu konferans

Onay sonrası kütüphaneye girer.

===PAGE id=butce-yonetimi title=Bütçe yönetimi pos=8===
# Bütçe yönetimi

Eğitim bütçesinin dağılımı, harcaması, izlemesi.

## Bütçe modeli

### Model 1: Çalışan başı

Her çalışana yıllık sabit bütçe:
- Junior: 5 000 TRY
- Mid: 10 000 TRY
- Senior: 20 000 TRY
- Lead: 30 000 TRY

Kullanılmayan 30 Aralık'ta sıfırlanır (use-it-or-lose-it).

### Model 2: Departman bazlı

Departman yıllık toplam bütçe. Yönetici dağılımı kontrol eder.

### Model 3: Hibrit

%50 sabit çalışan başı + %50 departman ortak havuzu.

## Harcama kategorileri

| Kategori | % pay | Yönetici onayı |
|---|---|---|
| Online kurs | 40 | Yok, otomatik |
| Sertifika | 20 | Gerekli |
| Kitap | 5 | Yok |
| Konferans | 15 | Gerekli |
| Fiziksel atölye | 10 | Gerekli |
| Koçluk (ek bütçe) | 5 | Yönetici + İK |
| Sertifikasız eğitim (MOOC vb.) | 5 | Yok |

## Onay süreci

1. Çalışan → **Talep formu** doldurur
2. **Otomatik:** Kategori + tutar eşiği altında direkt onaylanır
3. **Yönetici onay:** Kategori/tutar eşiği aşar — max 2 iş günü yanıt
4. **İK onay:** Koçluk veya 10 000 TL üstü
5. Onay → satın alma veya geri ödeme

## Reimbursement akışı

1. Çalışan harcama yapar (önceden onay alınmış)
2. Receipt yükler
3. Otomatik muhasebe sistemine entegre
4. Maaş ile ödenir (maksimum sonraki ay)
5. Vergi durumu: gelir vergisi etkisi yok (iş amaçlı)

## İzleme

- **Çalışan:** Kendi bütçe kullanımı (çeyreklik)
- **Yönetici:** Ekip toplam kullanım
- **İK:** Şirket geneli harcama
- **CFO:** Bütçe projeksiyonu + gerçekleşen

## Dengesizlik

İK alarm:
- %30 kullanımda 6. ay → "kimse eğitim almıyor, kültür problemi"
- %95 kullanımda 3. ay → "bütçe az, artırma gerek"
- Çalışanlar arası dengesizlik (cinsiyet, yaş, departman) — bias denetim

## Geri dönüşüm

Kullanılmayan bütçe:
- Yıl sonu iade (şirketin genel kültürüne bağlı)
- Sonraki yıla taşıma (bazı şirketler)
- Ortak havuzda kullanıma açma (çok kullanan diğerlerine)

## Kurumsal yatırım

Eğitim bütçesi (yıllık) ideal: **çalışan başına 10 000 – 30 000 TRY**. Sektör lideri şirketlerde daha yüksek (bazı tech şirketleri 50 000+).

ROI: Her 1 TL eğitim yatırımı → 3-5 TL üretkenlik kazancı (McKinsey 2019 raporu).

===PAGE id=etki-degerlendirme title=Etki değerlendirme pos=9===
# Etki değerlendirme

Öğrenme yatırımının iş sonuçlarına etkisini ölçme.

## Kirkpatrick modeli (4 seviye)

### Seviye 1 — Tepki (Reaction)
- Katılımcı memnun mu? (1-5 skor)
- Tavsiye eder mi? (NPS)
- Anket 1-2 hafta içinde

### Seviye 2 — Öğrenme (Learning)
- Önce-sonra bilgi testi
- Yetkinlik seviye değişim
- Pratik uygulama gözlem

### Seviye 3 — Davranış (Behavior)
- İşyerinde uygulama gözlem (90 gün sonra)
- Yönetici 360 değerlendirme farkı
- Peer gözlem (mesleki davranış değişimi)

### Seviye 4 — Sonuç (Results)
- İş KPI üzerinde etki
- Maliyet / kazanç
- Müşteri memnuniyeti
- Çalışan bağlılığı skorunda değişim

## UpCore'da otomatik izleme

Her öğrenme yolu sonrası:
- Seviye 1 anket otomatik
- Seviye 2 — yetkinlik seviye güncelleme
- Seviye 3 — 90 gün sonra kontrol
- Seviye 4 — departman metrikleriyle ilişkilendirme

## Spesifik ölçümler

### Satış eğitimi
- Önce: ortalama satış / ay
- Sonra: 3 ay ortalama
- İyileşme %

### Kodlama eğitimi
- Code review kalitesi (10 üzerinden)
- Bug rate
- Deployment frekansı

### Liderlik eğitimi
- Ekip bağlılık skoru
- Ekip performans
- Ekip içi 360 skorları

## ROI hesabı

ROI = (Eğitim kazancı - Eğitim maliyeti) / Eğitim maliyeti

Kazanç hesabı:
- Direkt: Satış artışı, maliyet azalması
- Endirekt: Bağlılık artışı → ayrılma oranı düşmesi → işe alım maliyeti tasarrufu

## Meta-analiz

UpCore platformunda binlerce tenant'ın öğrenme verisi:
- Hangi eğitim türü en yüksek ROI?
- Hangi süre optimum?
- Hangi kombinasyon (kurs + mentorluk) işe yarar?

Anonim agrega üzerinden yıllık benchmark raporu.

## Başarısız eğitim

ROI negatif eğitim:
- Kataloga devam etmez
- Gerekçe araştırılır (yanlış kitle, kötü tasarım, yanlış zaman)
- Alternatif araçlar

## Yıllık rapor

CFO'ya gidecek rapor:
- Toplam eğitim bütçesi harcaması
- Kategori dağılımı
- ROI özeti
- Gelecek yıl öneri

===PAGE id=sikca-sorulanlar title=Geliştirme — sıkça sorulanlar pos=10===
# Geliştirme — sıkça sorulanlar

## Mesai saati içinde öğrenme yapabilir miyim?

Evet — UpCore'da öneri: haftada 3 saat öğrenme calendar'da blok. Yönetici onayı gerekli değil (pre-approved).

## Şirket dışı konferans gideceğim, bütçe yeter mi?

Kategori + tutar eşiği altında otomatik onay. Uluslararası konferans tipik: 20 000 – 40 000 TRY (ücret + uçak + otel). Yönetici + İK onayı.

## Sertifika aldım ama şirket fiyatını ödemedi — sonra ödeyebilir mi?

Önceden onay almadıysanız reimbursement **yok**. Her zaman önce talep formu.

## Mentor program zorunlu mu?

Hayır — gönüllü. Ama Leadership Academy gibi yapılandırılmış programlara katıldıysanız ilgili mentor atanır.

## Kursu tamamladım ama ne öğrendiğimi unuttum.

Spaced repetition kurulumu:
- Sistem 1 ay, 3 ay, 6 ay sonra kısa sorular sorar
- Anki / RemNote alternatifi iç tool
- Katılım %60+ ise öğrenme kalıcılığı 2× artar

## Öğrenmeye ayıracak zaman yok — iş yoğun.

İş yoğunluğu sürekli mazeret oluyorsa:
- Yönetici 1-1'da gündem
- Gerçek iş yükü analizi (2-3 hafta)
- Önceliklendirme — öğrenme bütçesinin %30-50 kullanımı beklenti
- Sistematik → ekip yeni FTE ihtiyacı sinyali

## Kendi alanım dışında bir şey öğrenebilir miyim?

Evet — hatta T-shape gelişim için teşvik ediliyor. Örnek: backend developer UX/UI öğreniyor. İK onayı gerekmez.
