# UpCore — KVKK Veri İşleme Envanteri (VERBIS uyumlu)

**Veri Sorumlusu:** UpCore A.Ş.
**VERBIS kayıt no:** (başvuru açıldıktan sonra eklenecek)
**DPO:** hasan.aker@upcore.app · +90 xxx xxx xx xx
**Son güncelleme:** 2026-04-22

> Bu envanter KVKK 6698 sayılı Kanun m.7 ve Veri Sorumluları Sicili Yönetmeliği çerçevesinde
> hazırlanmıştır. VERBIS portalına paralel güncellenir.

## 1. Veri Sahipleri Kategorileri

| Kategori | Örnek |
|---|---|
| Müşteri tenant çalışanları | İK modülü kullanıcıları |
| Müşteri tenant çalışan adayları | ATS pipeline kayıtları |
| Müşteri tenant yöneticileri | admin, hr_admin, cxo rolleri |
| UpCore çalışanları | İç sistem kullanıcıları |
| Web sitesi ziyaretçileri | marketing analytics |

## 2. İşlenen Kişisel Veri Kategorileri

| # | Veri Kategorisi | Özel Nitelikli? | Örnekler |
|---|---|---|---|
| 1 | Kimlik | Evet (TCKN) | Ad, soyad, TCKN, doğum tarihi |
| 2 | İletişim | Hayır | E-posta, telefon, adres |
| 3 | İstihdam | Hayır | İşe alım tarihi, pozisyon, maaş |
| 4 | Finansal | Hayır | Banka IBAN, ücret, bordro kalemleri |
| 5 | Özlük | Hayır | İzin kullanımı, performans skorları |
| 6 | Sağlık-benzeri (psikometrik) | **Evet** | BAT-TR, UWES, UpCap-TR skorları |
| 7 | Biyometrik | Evet | Fotoğraf (profil) |
| 8 | Mesleki deneyim | Hayır | CV, sertifika, eğitim |
| 9 | Hukuki işlem | Hayır | Disiplin kaydı, mahkeme kararı (varsa) |
| 10 | Ceza mahkumiyeti | Evet | Adli sicil kaydı (varsa — özel nitelikli) |
| 11 | Görsel/işitsel | Hayır | Mülakat kaydı (Daily.co) |
| 12 | İşlem güvenliği | Hayır | IP, session, login timestamp |
| 13 | Çerez + tarayıcı | Hayır | Marketing analytics |

## 3. İşleme Amaçları

| # | Amaç | Hukuki Sebep (KVKK m.5/6) |
|---|---|---|
| A1 | İK süreçlerinin yürütülmesi | Sözleşmenin kurulması/ifası |
| A2 | Bordro hesabı ve mali yükümlülükler | Yasal yükümlülük (SGK, Vergi Kanunu) |
| A3 | Tükenmişlik ve çalışan refahı analizi | Açık rıza + Meşru menfaat |
| A4 | Performans değerlendirmesi | Sözleşmenin ifası + Meşru menfaat |
| A5 | İşe alım ve aday değerlendirme | Sözleşme öncesi müzakereler + Açık rıza |
| A6 | Hukuki uyuşmazlıklarda kanıt | Hak tesisi/savunma |
| A7 | Bilgi güvenliği + dolandırıcılık önleme | Meşru menfaat |
| A8 | Ürün geliştirme ve analiz | Meşru menfaat (pseudonymised) |
| A9 | KVKK Kurumu bildirimleri | Yasal yükümlülük |

## 4. Veri Saklama Süreleri

| Veri | Süre | Gerekçe |
|---|---|---|
| Çalışan personel dosyası | İş sözleşmesi + 10 yıl | İş Kanunu, SGK |
| Bordro kayıtları | 10 yıl | Vergi Usul Kanunu m.253 |
| Sağlık raporu | İş sözleşmesi + 15 yıl | İş Sağlığı ve Güvenliği Kanunu |
| Mali işlem (fatura) | 10 yıl | VUK |
| Psikometrik skor (BAT-TR, vs.) | İş sözleşmesi süresi + 2 yıl | Açık rıza + ticari yarar |
| İşe alım — ret edilen aday | 6 ay (veya aday onayıyla 2 yıl) | Açık rıza |
| Audit log | 7 yıl | KVKK + ISO 27001 + SOC 2 |
| Backup | 35 gün PITR + 1 yıl dump | DR + BCP |
| Çerez | Oturum / max 1 yıl | KVKK çerez rehberi |
| Pazarlama e-posta (opt-in) | Onay süresi | Kanun + ETK |

## 5. Aktarılan Üçüncü Taraflar (subprocessors)

| Vendor | Amaç | Lokasyon | KVKK m.9 temeli |
|---|---|---|---|
| **Microsoft Azure** | Hosting | Türkiye (İstanbul), AB (NE warm-standby) | Yeterli koruma (UK adequacy + SCC) |
| **Clerk** | Kimlik yönetimi | ABD | SCC + DPA + açık rıza metni |
| **Iyzico** | Ödeme (TR) | Türkiye | Veri sorumlusu ayrı (hukuki yükümlülük) |
| **Stripe** | Ödeme (global) | ABD/İrlanda | SCC |
| **DocuSign** | E-imza | ABD | SCC |
| **Daily.co** | Video mülakat | ABD | SCC + açık rıza |
| **Proxycurl** | LinkedIn profil | ABD | Açık rıza + veri minimizasyonu |
| **Azure OpenAI** | AI asistan | Türkiye (veri residency) | Meşru menfaat + KVKK m.5/1 (i) |
| **ClamAV** (self-hosted) | Virüs tarama | Türkiye | — |

## 6. Güvenlik Önlemleri (m.12 uyum)

- Teknik: AES-256, TLS 1.3, RLS, bcrypt, MFA, audit log, pseudonymisation (TCKN pgcrypto).
- İdari: NDA, farkındalık eğitimi, access review, incident response plan.

## 7. Veri sahibi hakları (m.11)

Talepler `kvkk@upcore.app` veya `/iletisim/kvkk` form. SLA 30 gün.

| Hak | Nasıl sağlanır |
|---|---|
| Bilgi edinme | KVKK export sayfası |
| Silme | Hard delete + backup silme isteği |
| Düzeltme | Self-service profil + yönetici talep |
| Aktarma (portability) | Export zip (NDJSON + MANIFEST) |
| İtiraz | DPO inceler; 30 gün içinde yanıt |

## 8. Aydınlatma metinleri (konum)

- Çalışan aydınlatma metni: `/kvkk/calisan-aydinlatma`
- Aday aydınlatma: `/kvkk/aday-aydinlatma`
- Ziyaretçi (web): `/kvkk/cerez-politikasi`
- Tenant sözleşmesi EK-4 (B2B veri işleyen sözleşmesi)

## 9. İç denetim + güncel tutma

- Envanter **6 ayda bir** gözden geçirilir (Ocak, Temmuz).
- Yeni vendor eklenince 48 saat içinde güncellenir.
- VERBIS güncelleme 30 gün içinde.
