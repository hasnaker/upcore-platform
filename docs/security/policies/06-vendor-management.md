# Vendor Management Policy

**ID:** POL-06 · **Version:** 1.0 · **Effective:** 2026-04-23 · **Owner:** Procurement + CISO
**Review cadence:** annual + on onboarding · **Frameworks:** SOC 2 CC9.2 · ISO 27001 A.5.19–A.5.23

## 1. Purpose
Govern third-party risk across the vendor lifecycle: selection, onboarding, monitoring, off-boarding.

## 2. Scope
Every vendor with access to UpCore systems, customer data, or operations. Includes sub-processors, SaaS tools, contractors, and consultants.

## 3. Tiers
- **Tier 1 (critical)** — holds customer data or is in the request path. Examples: Azure, Clerk, Postmark, Stripe, Datadog. **SOC 2 Type II or ISO 27001 required; DPA mandatory.**
- **Tier 2 (important)** — internal data or workflow dependency. Example: Linear, Notion. SOC 2 Type II preferred; DPA on PII.
- **Tier 3 (low)** — no data access. Due-diligence questionnaire only.

## 4. Onboarding procedure
1. Requester opens vendor intake form (business case, data classes involved).
2. Security review: collect SOC 2 / ISO, penetration test summary, pen-test date, incident history, sub-processor list.
3. Legal review: DPA, SCC if cross-border, MSA.
4. DPIA if personal data processed.
5. CISO signs off Tier 1; Procurement signs off Tier 2/3.
6. Vendor entered into `docs/security/vendors/inventory.md` with renewal date.

## 5. Monitoring
- Continuous: security.io / Drata connector for attestation status, breach alerts.
- Annual questionnaire + evidence refresh for Tier 1.
- Quarterly financial health check for critical vendors.

## 6. Off-boarding
- Account termination tracked via IT ticket.
- Data return / deletion certificate obtained from vendor.
- Access revoked within 24 h.

## 7. Exceptions
Any vendor lacking SOC 2/ISO requires CISO approval, compensating controls (network segmentation, data scrubbing), and 12-month remediation plan.

## 8. Audit and evidence
- Vendor inventory maintained continuously.
- Annual Tier 1 attestation review (evidence in `compliance/vendors/YYYY/`).
- SBOM per release (POL-12).
