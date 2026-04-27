# Incident Response Plan

**ISO 27001 A.5.24-27 · SOC 2 CC7.3-5**
**Versiyon:** 1.0 · 2026-04-22

## 1. Amaç ve tanım
Bir **güvenlik olayı** = UpCore bilgi varlıklarının CIA (gizlilik/bütünlük/erişilebilirlik) açısından
olumsuz etkilenmiş olduğuna dair kanıt veya makul şüphe.

## 2. Severity matrisi

| Sev | Tanım | RTO | Örnek |
|---|---|---|---|
| **SEV-1** | Aktif ihlal, müşteri verisi etkilendi veya prod down | 15 dk resp. | Tenant RLS bypass exploit, prod DB corruption |
| **SEV-2** | Ciddi risk, henüz kullanıcı etkilenmedi | 1 saat | Auth bypass fix prod'a gitmemiş, dependency 0-day |
| **SEV-3** | Sınırlı etki, tek müşteri/servis | 4 saat | Tek tenant bordro hesap hatası, disk 90% dolu |
| **SEV-4** | Operasyonel gürültü | 1 iş günü | Non-critical log spam, deprecated API uyarısı |

## 3. Roller (Incident Command System)

| Rol | Kim | Sorumluluk |
|---|---|---|
| **IC (Incident Commander)** | On-call SRE (SEV-3/4), CISO (SEV-1/2) | Karar, önceliklendirme, iletişim kontrol |
| **Operations** | On-call eng | Technical remediation |
| **Communications** | CEO/CMO (SEV-1) · CISO (SEV-2) | Müşteri, basın, düzenleyici |
| **Scribe** | Herhangi eng | Timeline kaydı, slack thread |
| **Legal/DPO** | DPO (SEV-1/2) | KVKK/GDPR bildirim zamanlaması |

## 4. Akış — SEV-1

```
Detection  →  Slack #incidents + PagerDuty
 (otomatik alarm veya kullanıcı bildirimi)
   ↓
Triage  (15 dk içinde IC atanır)
   ↓
Containment  (ihlal kaynağı izole)
   ↓
Eradication  (root cause fix)
   ↓
Recovery  (prod servis geri)
   ↓
Notification  (72 saat KVKK, müşteri DPA SLA)
   ↓
Post-mortem  (1 hafta içinde, blameless)
```

## 5. İletişim şablonları
- `templates/ir/slack-initial.md`
- `templates/ir/customer-email-sev1.md`
- `templates/ir/kvkk-bildirim.md`

## 6. Yasal bildirim yükümlülükleri
| Makam | Süre | Tetik |
|---|---|---|
| **KVKK Kurumu** | 72 saat | Kişisel veri ihlali (6698 m.12) |
| **BTK** | 24 saat | Elektronik haberleşme operatörü ihlali (kapsam içi değil — kapsamımızda yok) |
| **Müşteri** | 48 saat | DPA sözleşmesi gereği |
| **Kart şemaları** (PCI-DSS) | Hemen | PAN sızıntısı — **UpCore PAN saklamaz**, bu satır N/A |

## 7. Tatbikat (exercises)
- **Tabletop:** quarterly — CISO'nun sorularıyla Slack senaryo
- **Kırmızı takım:** yıllık — bağımsız firma
- **DR drill:** quarterly — `scripts/dr-drill.sh`
- **Backup restore:** quarterly — sample tenant restore test
