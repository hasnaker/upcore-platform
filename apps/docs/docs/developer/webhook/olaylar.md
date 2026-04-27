---
id: olaylar
title: "Webhook olayları"
sidebar_position: 4
---

# Webhook olayları

Platform üzerindeki önemli olayların listesi.

## Employee olayları

- `employee.created` — yeni çalışan eklendi
- `employee.updated` — profil güncellendi
- `employee.terminated` — ayrılış
- `employee.reactivated` — geri dönüş

## Pulse olayları

- `pulse.created` — yeni pulse anketi oluşturuldu
- `pulse.sent` — çalışanlara gönderildi
- `pulse.completed` — yeterli cevap toplandı (yüzde eşik)
- `pulse.response_anomaly` — anlamlı trend değişimi

## Intervention olayları

- `intervention.recommended` — Thompson sampling öneri yapıldı
- `intervention.consent_sent` — çalışana rıza gitti
- `intervention.started` — plan başladı
- `intervention.check_in` — check-in tamamlandı
- `intervention.completed` — süre doldu, etki ölçümü tamamlandı

## Performance olayları

- `okr.created`
- `okr.progress_updated`
- `review.submitted` (360)
- `calibration.completed` (9-kutu)
- `pip.started`

## Bordro olayları

- `payroll.run_started`
- `payroll.run_completed`
- `payroll.payslip_generated`

## Audit olayları

- `audit.anomaly_detected` — olağandışı aktivite
- `audit.impersonation_started`
- `audit.bulk_export_completed`

## KVKK olayları

- `gdpr.request_received` — Madde 11 talebi
- `gdpr.request_completed`
- `gdpr.breach_detected`

## Mobility olayları

- `internal_posting.created`
- `application.submitted`
- `succession.updated`

## Payload örneği

```json
{
  "event": "intervention.completed",
  "event_id": "evt_abc123",
  "tenant_id": "tnt_xyz789",
  "timestamp": "2026-04-23T14:30:00Z",
  "data": {
    "intervention_id": "int_456",
    "plan_id": "plan_789",
    "duration_weeks": 8,
    "cohens_d": 0.42,
    "significance": "medium"
  }
}
```
