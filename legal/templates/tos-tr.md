> ⚠️ **DRAFT — Avukat onayı öncesi üretim sözleşmesi için KULLANMAYIN.**
> Public yayın kopyası: `apps/web/src/app/(marketing)/sartlar/page.tsx` altında.

# UpCore Kullanım Şartları (Terms of Service)

**Sürüm:** Draft v1 · **Tarih:** 2026-04-24
**UpCore Teknoloji A.Ş.** — Maslak, Sarıyer / İstanbul

---

## 1. Taraflar ve Kabul

UpCore SaaS platformunu ("Hizmet") kullanarak, UpCore Teknoloji Anonim Şirketi
("UpCore") ile aşağıdaki şartları kabul etmiş sayılırsınız.

Hizmet'i bir şirket veya kurum adına kullanıyorsanız, söz konusu tüzel kişiyi
bu şartlara bağlama yetkisine sahip olduğunuzu beyan edersiniz.

---

## 2. Hesap Oluşturma ve Güvenlik

2.1 Minimum yaş: 16.

2.2 Hesap bilgilerinin gizliliğinden kullanıcı sorumludur (2FA önerilir).

2.3 Yetkisiz erişim derhal `guvenlik@upcore.io` adresine bildirilir.

2.4 UpCore, şüpheli aktiviteyi bildirmeksizin engelleme hakkını saklı tutar.

---

## 3. Abonelik ve Ücretlendirme

3.1 Plan seçenekleri: Free, Starter, Growth, Platform, Enterprise.

3.2 Ücretlendirme aylık veya yıllık; TRY veya USD. Yıllık ödemede %15 indirim.

3.3 Otomatik yenileme varsayılan olarak açıktır; hesap ayarından kapatılabilir.

3.4 İptal, cari dönem sonunda etkili olur. Kullanılmamış süre iade edilmez.

3.5 Ödemeler Iyzico (TR) veya Stripe (global) üzerinden güvenli şekilde alınır.

3.6 KDV: Belirtilen bedeller KDV hariçtir; Türkiye faturaları için %20 KDV
eklenir.

---

## 4. Kullanım Kuralları

4.1 Yasal Kullanım: Yasadışı, taciz edici, ırkçı, ayrımcı veya telif hakkını
ihlal eden içerik yüklemek yasaktır.

4.2 Rate Limit: API rate limit'lerine uymak zorunludur. Aşan isteklere 429
Too Many Requests veya 402 Payment Required yanıtı döner.

4.3 Çalışan Veri Etiği: Çalışan pulse anket yanıtlarını yasal amaç dışında
(örn. izinsiz performans değerlendirme, işten çıkarma kararı) kullanmak KVKK
ihlali sayılır ve sorumluluk doğurur.

4.4 Tersine Mühendislik Yasağı: Hizmet'in kod çözümleme, tersine mühendislik
veya rakip bir ürün geliştirme amacıyla kullanılması yasaktır.

4.5 Paylaşım: Hesap kimlik bilgileri üçüncü kişilerle paylaşılamaz.

---

## 5. Fikri Mülkiyet

5.1 UpCore'un kod, tasarım, logo, ölçek item'ları (BAT-12-TR, UpCap-TR, JCS
uyarlaması) UpCore'un veya lisans verenlerin mülkiyetindedir.

5.2 Müşteri Verisi Müşteri'nin mülkiyetindedir. UpCore yalnızca veri işleyen
sıfatıyla erişir — MSA Ek-3 DPA'ya tabidir.

5.3 UpCore, anonim ve agregat verileri (tenant bazlı değil) ürün geliştirme
için kullanma hakkını saklı tutar.

---

## 6. Sorumluluk Sınırlaması

6.1 Hizmet "olduğu gibi" ("as-is") sunulur. UpCore, Hizmet'in kesintisiz veya
hatasız olacağını garanti etmez.

6.2 Toplam sorumluluk, son 12 ayda ödenen abonelik ücretini aşamaz (bkz
`legal/templates/limitation-of-liability.md`).

6.3 Dolaylı zararlar (kar kaybı, iş fırsatı kaybı) sorumluluk dışındadır.

---

## 7. Hizmet Kesintisi ve SLA

7.1 KOBİ/Growth/Platform planları: %99.5 uptime (bkz `sla-99.5.md`).

7.2 Enterprise planı: %99.9 uptime (bkz `sla-99.9.md`).

7.3 Planlı bakım 72 saat (Enterprise için 7 gün) önceden `status.upcore.io`'da
duyurulur.

---

## 8. Fesih

8.1 UpCore aşağıdaki hallerde hesabı askıya alabilir veya feshedebilir:
- 30 günden fazla ödeme gecikmesi
- Bu Şartlar'ın veya KVKK'nın açık ihlali
- Adli makamdan gelen yasal talep
- Platform güvenliğini tehdit eden davranış

8.2 Müşteri 30 gün önceden yazılı bildirimle feshedebilir.

8.3 Fesih sonrası 90 gün veri export hakkı (`GET /api/v1/export/full`).

---

## 9. KVKK ve Gizlilik

Kişisel veri işleme süreçleri için `apps/web/src/app/(marketing)/gizlilik/page.tsx`
veya `https://upcore.io/gizlilik` adresindeki KVKK Aydınlatma Metni geçerlidir.

---

## 10. Değişiklikler

UpCore bu Şartları değiştirme hakkını saklı tutar. Önemli değişiklikler 30 gün
önceden e-posta ile bildirilir; kullanıcı bildirim tarihinden itibaren Hizmet'i
kullanmaya devam ederse yeni şartları kabul etmiş sayılır.

---

## 11. Uygulanacak Hukuk ve Yetkili Mahkeme

Bu şartlar Türkiye Cumhuriyeti kanunlarına tabidir. İhtilaflar İstanbul Merkez
(Çağlayan) Mahkemeleri ve İcra Daireleri'nde çözülür.

---

## 12. İletişim

- Genel destek: `destek@upcore.io`
- Hukuk: `hukuk@upcore.io`
- KVKK: `kvkk@upcore.io`
- Güvenlik: `guvenlik@upcore.io`
