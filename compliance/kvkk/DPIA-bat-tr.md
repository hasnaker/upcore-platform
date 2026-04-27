# DPIA — Veri Koruma Etki Değerlendirmesi
# BAT-TR Tükenmişlik Ölçümü ve Psikometrik Skorlama

**Modül:** Tükenmişlik (Burnout) + Psikometrik Değerlendirmeler
**İşleme tipi:** Ölçek bazlı psikometrik veri işleme + ML tabanlı risk tahmini
**Veri Sorumlusu:** UpCore A.Ş. (B2B — tenant çalışanı için veri işleyen; tenant da sorumlu)
**Hazırlayan:** DPO (hasan.aker@upcore.app)
**Tarih:** 2026-04-22
**Gözden geçirme:** Her yıl + önemli model/özellik değişikliklerinde.

---

## 1. Zorunluluk Testi (Necessity)

**KVKK Madde 10** ve **EDPB DPIA Guideline** kriterleri:

| Kriter | UpCore BAT-TR | Risk |
|---|---|---|
| Özel nitelikli veri | **EVET** — psikolojik/sağlık-benzeri | Yüksek |
| Otomatik karar verme | **Kısmi** — risk skoru öneri sunar; karar insan verir | Orta |
| Çalışan değerlendirmesi | **EVET** | Yüksek |
| Büyük ölçekli işleme | **EVET** (>10k çalışan potansiyeli) | Yüksek |
| Haklar üzerinde etki | Yüksek (istihdam sürecini etkileyebilir) | Yüksek |

**Sonuç:** DPIA **zorunludur**. Bu doküman formal DPIA yerine geçer.

---

## 2. İşleme Tanımı

### Veri akışı

```
Çalışan → (Anket BAT-TR/COPSOQ/UWES) → survey service
                                              ↓
                                     scoring engine (Python)
                                              ↓
                          intervention service  (Thompson bandit)
                                              ↓
                                     bildirim servisi → yönetici + çalışan
```

### Veri kategorileri
- **Kimlik:** çalışan UUID (pseudonymised — TCKN doğrudan skora bağlı değil)
- **Skor veri:** BAT-TR 5 alt ölçek (Exhaustion, Mental Distance, Cognitive Impairment, Emotional Impairment, Overall) + UWES 9 + UpCap-TR 12
- **Meta:** departman, pozisyon, yaş bandı (hassas değil), işveren
- **Zaman serisi:** 12 aylık trend

### Toplanış sıklığı
- Pulse survey: 2 haftada bir
- Tam BAT-TR: 3 ayda bir
- COPSOQ organizasyonel: 6 ayda bir

---

## 3. Hukuki Sebep

- **Tenant çalışanı** için: tenant'ın açık rızası + meşru menfaati.
- **UpCore** için (işleyen sıfatıyla): veri işleyen sözleşmesi (B2B sözleşme m.6).
- **Reddetme:** Çalışan anketi kısmi/tam reddedebilir; reddin istihdam ilişkisine olumsuz etkisi
  yasaktır (iç politika).

---

## 4. Proportionality

| Amaç | Veri minimize mi? |
|---|---|
| Tükenmişlik takip | Evet — yalnız Beck Anxiety vs. değil; spesifik BAT-TR |
| Departman heatmap | Evet — individual view yok, en az 5 kişi bucket (k-anonymity) |
| Aksiyon öneri | Evet — sadece pseudonymised ID üzerinden |
| Yıllık benchmarking | Evet — sektör agregesi paylaşılırsa anonymised |

---

## 5. Riskler ve Azaltıcılar

| # | Risk | Olasılık | Etki | Azaltıcı |
|---|---|---|---|---|
| R1 | Yönetici çalışanın skorunu bireysel görür + terfi/işten çıkarma için kullanır | Orta | Yüksek | • Yönetici UI sadece ≥5 kişilik bucket<br>• Audit log her bakma<br>• ToS: bireysel skor istihdam kararında kullanılamaz<br>• DPIA, sözleşme EK'i |
| R2 | Skor skoru çalışan ret edince sistem pasifize etmez | Düşük | Yüksek | • Consent UI: revoke anında soft-delete flag; scoring pipeline dışlar |
| R3 | ML model bias (demografik) | Orta | Orta | • Fairness metrics quarterly (`ml-services/retraining/fairness_check.py`)<br>• Model card publish |
| R4 | TCKN + skor birleştirilip sızarsa | Düşük | **Kritik** | • Pseudonymisation (TCKN ayrı tabloda + AES-256 pgcrypto)<br>• RLS tenant boundary<br>• Audit + alerting |
| R5 | Yıllık yeniden eğitimde eski skor overfitting | Düşük | Düşük | • Hold-out test set + monthly drift monitoring |
| R6 | Aday adayına skor talep edilip istihdam | Yok | Yok | UpCore psikometrik veriyi **aday** için **kullanmaz**; yalnız işe alındıktan sonra |
| R7 | KVKK Kurumu audit | Orta | Yüksek | Bu DPIA + envanter + log + evidence dosyası hazır |

---

## 6. Teknik Güvenlik

- **Depolama:** AES-256 at rest (Azure Storage SSE)
- **Transport:** TLS 1.3 minimum
- **Erişim:** RLS + rol bazlı (employee kendi verisi, hr_admin tenant bucket'ları, UpCore
  süper-admin yalnız destek ticket'ında + audit log)
- **Loglama:** tüm skor erişimi `audit_events` WORM; 7 yıl
- **Pseudonymisation:** TCKN AES-256 column; scoring'de yalnızca employee UUID

---

## 7. Çalışan Hakları

- **Bilgi talebi:** 30 gün içinde kendi skor geçmişi indirilebilir (portal /portal/degerlendirme).
- **Düzeltme:** Yanlış cevap verildiyse yeniden doldurma; skor iptali.
- **Silme:** İş sözleşmesi sonunda + 2 yıl geçtikten sonra otomatik soft-delete; hard-delete
  talep dilekçeli.
- **İtiraz:** Çalışan model skorunu itirazla reddedebilir; manuel değerlendirmeye geçer.

---

## 8. Değerlendirme

**Sonuç:** Kalan risk **Kabul edilebilir** — azaltıcılar uygulandığında. Yüksek riskli
kontroller (R1, R4) için CISO + DPO quarterly audit.

**Onay:** DPO · CISO · CEO (imzalar `compliance/kvkk/DPIA-bat-tr-imza.pdf`)

## 9. İzleme

- Quarterly: fairness metrics review (model bias)
- Yıllık: DPIA tam revize
- Incident olunca: derhal gözden geçir + güncelle
