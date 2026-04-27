# Privacy Policy (Internal)

**ID:** POL-14 · **Version:** 1.0 · **Effective:** 2026-04-23 · **Owner:** DPO
**Review cadence:** annual + on regulation change · **Frameworks:** KVKK · GDPR · ISO 27701 · SOC 2 Privacy

This is the internal operational privacy policy. The public privacy notice lives at `apps/web/src/app/(marketing)/kvkk/`.

## 1. Purpose
Govern UpCore's processing of personal data in line with KVKK (6698), GDPR, and customer contractual commitments.

## 2. Roles
- **DPO (Data Protection Officer)** — accountable for KVKK/GDPR compliance; direct line to CEO; contact `dpo@upcore.io`.
- **VERBIS Controller** — DPO; manages Kurum registration.
- **Product / Engineering** — implement privacy-by-design under DPO guidance.

## 3. Legal bases (KVKK md. 5/6)
UpCore, as processor for customer tenants and controller for its own employees:
- Explicit consent (burnout intervention participation).
- Contract necessity (HR records for employer).
- Legal obligation (SGK, VUK, İş Kanunu).
- Legitimate interest (platform security, fraud prevention).

## 4. Principles
- Purpose limitation, data minimisation, accuracy, storage limitation, integrity, accountability.
- Privacy-by-default: new features ship with least-PII, opt-in sensitive collection.
- Every ML model touching personal data requires a DPIA (`compliance/kvkk/DPIA-*.md`).

## 5. Data subject rights (KVKK md. 11, GDPR art. 15–22)
- Portal: `portal.upcore.io/kvkk` (self-service for access, rectification, erasure, objection).
- SLA: 30 days (KVKK); 7 days acknowledgement.
- Automated decision (burnout prediction): explainability (SHAP) + human review option.

## 6. Cross-border transfer
- Default: EU-North (Stockholm). TR data residency available for Enterprise.
- Standard Contractual Clauses signed with every non-EU sub-processor.
- BCR roadmap post-Series A.

## 7. Breach notification
- KVKK Kurumu: 72 h via DPO (POL-03).
- Affected individuals: without undue delay, in plain Turkish + English.
- Customers (as controllers): contractual SLA, default 24 h of confirmation.

## 8. RoPA and VERBIS
Maintained in `compliance/kvkk/veri-envanteri.md` — updated on every new data flow; DPO quarterly audit.

## 9. Training
Annual KVKK training for all staff; role-specific modules for engineering (POL-15).

## 10. Audit and evidence
- Consent ledger (`app.consent_history`) with hash chain.
- DPIA register.
- DPO quarterly report to CEO and board.
