# Playbook 01 — Data Breach (PII / SPI)

**Severity default:** SEV-1
**Regulatory clock:** KVKK Kurumu 72 h · GDPR 72 h · customer contract SLA (usually 24 h)

## Pre-requisites
- Confirm this is a breach (unauthorised access / exfiltration / disclosure of Restricted or SPI).
- Do not contain before preserving evidence if exfiltration path is unclear.

## Immediate (0–30 min)
1. IC opens `#inc-<date>-breach`; pages DPO + Legal + CTO.
2. Snapshot affected DB rows, logs, network flows. Apply Azure legal hold on relevant storage.
3. Revoke suspected credentials (Clerk session-revocation API, API keys, PATs).
4. Apply NSG deny-all to compromised hosts.
5. Lock the audit log WORM partition for the period; compute Merkle root and sign with CISO + DPO keys.

## Contain (30 min – 2 h)
1. Identify scope: `SELECT tenant_id, COUNT(*) FROM app.<affected_table> WHERE ...`.
2. Determine data classes touched (POL-05).
3. Determine affected individuals — record in `compliance/kvkk/breach/<id>.md`.
4. Block exfiltration path (WAF rule, egress deny, sub-processor API key rotation).

## Eradicate (2–8 h)
1. Apply hotfix for root cause (CVE patch, RBAC bug, mis-config).
2. Rotate all secrets touched: DB password, Clerk signing key, Stripe restricted keys, Azure SAS tokens.
3. Scan for lateral movement (IOCs in `docs/security/ir/iocs/`).

## Communicate
| Audience | When | How | Owner |
|----------|------|-----|-------|
| Executive (CEO/CTO/DPO) | T+0 | Slack + call | IC |
| Customers (affected) | T+24 h of confirmation | Email + in-app banner | Comms |
| KVKK Kurumu | ≤ 72 h of confirmation | Official form + written | DPO |
| GDPR DPAs (if EU data) | ≤ 72 h | Per member-state form | DPO |
| Affected individuals | Without undue delay | Email, Turkish + English | Comms |
| Press / public | Only if broad / media inquiry | Prepared statement | CEO |

### Customer email template
```
Konu: Güvenlik bildirimi — UpCore

Sayın [İsim],

[Tarih] saat [UTC]'de UpCore sistemlerinde [veri türü] içeren [X adet] kayda izinsiz erişim tespit ettik. Olay saat [kapanma saati] itibarıyla kontrol altına alındı.

Sizi etkileyen spesifik bilgiler: [....]

Yaptığımız adımlar:
- [containment]
- [eradication]
- [monitoring]

Yapmanızı önerdiğimiz adımlar: [....]

Detaylı post-mortem 7 iş günü içinde paylaşılacak. Sorularınız için: dpo@upcore.io

UpCore Güvenlik Ekibi
```

## Recover
- Restore from pre-incident backup if integrity compromised (check RPO).
- Verify smoke + integrity checks.
- Monitor 7 days for related IOCs.

## Learn
- Blameless post-mortem within 5 business days.
- Publish sanitised version on `/trust` after customer notification.
- Update DPIA if the incident revealed a previously-unmodeled risk.

## Evidence checklist
- [ ] Timeline.md (Scribe)
- [ ] Affected-rows export (signed)
- [ ] Audit log Merkle root at T0
- [ ] KVKK submission receipt
- [ ] Customer notification log
- [ ] Rotation attestation (`scripts/rotate-secrets.sh --report`)
