# Information Security Policy

**Versiyon:** 1.0 · **Tarih:** 2026-04-22 · **Onay:** CEO, CISO
**Gözden geçirme:** Yıllık · **Sonraki review:** 2027-04-22

## 1. Amaç
UpCore platformunda işlenen tüm bilgi varlıklarının **gizlilik, bütünlük ve erişilebilirliğini**
(CIA) korumak. Bu politika, ISO/IEC 27001:2022 Annex A.5.1'e uygun olarak üst yönetimin
taahhüdünü ifade eder.

## 2. Kapsam
- Tüm UpCore çalışanları, stajyerler, yükleniciler, dışarıdan danışmanlar.
- Tüm müşteri verileri (çalışan PII, maaş, sağlık, performans).
- Tüm sistemler: prod, staging, dev Azure kaynakları; GitHub; Clerk; Azure Monitor.
- Tüm lokasyonlar: merkez ofis (İstanbul), uzaktan çalışanlar.

## 3. İlkeler
1. **Least privilege** — her kullanıcı/servis sadece gerekli minimum erişime sahip olur.
2. **Defense in depth** — tek kontrol yeterli değil; birden fazla katman uygulanır.
3. **Secure by default** — yeni özellik, güvensiz konfigürasyonla shipped edilmez.
4. **Zero trust** — iç ağ güvenli varsayılmaz; her istek kimlik doğrular.
5. **Assume breach** — ihlal olmuş gibi izleme, alarm, post-mortem yürütülür.

## 4. Rol & Sorumluluklar
- **CEO:** Nihai sorumluluk; yılda 1 kez yönetim değerlendirmesini onaylar.
- **CISO:** Politika sahipliği, risk yönetimi, incident command.
- **DPO:** KVKK uyum, veri sahipleri ile iletişim, DPIA.
- **SRE Lead:** Platform availability + disaster recovery.
- **Eng Lead:** Secure SDLC + kod güvenliği.
- **HR:** Çalışan farkındalık + screening + offboarding.
- **Tüm çalışanlar:** Farkındalık eğitimini tamamlama, olay bildirimi, NDA'ya uyma.

## 5. Uyum Çerçevesi
- ISO/IEC 27001:2022 (sertifika hedefi 2027 Q1)
- SOC 2 Type II (Type II rapor hedefi 2027 Q3)
- KVKK 6698 sayılı Kanun + VERBIS kaydı
- GDPR (AB müşterileri için — 2027)

## 6. Yaptırım
İhlal durumunda, işin şiddetine göre uyarı, yazılı uyarı, işten çıkarma, suç duyurusu.

---
İlgili politikalar: `acceptable-use.md`, `access-control.md`, `cryptography.md`,
`incident-response.md`, `bcp-dr.md`, `vendor-management.md`, `data-classification.md`.
