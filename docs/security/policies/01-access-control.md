# Access Control Policy

**ID:** POL-01 · **Version:** 1.0 · **Effective:** 2026-04-23 · **Owner:** CISO
**Review cadence:** annual · **Frameworks:** SOC 2 CC6 · ISO 27001 A.5.15–A.5.18, A.8.2–A.8.5 · KVKK md. 12

## 1. Purpose
Define how UpCore grants, reviews, and revokes access to production systems, source code, customer data, and administrative tooling.

## 2. Scope
All employees, contractors, and third parties with logical or physical access to UpCore assets. Includes Azure, GitHub, Clerk, Stripe, Postmark, Datadog, and any system storing UpCore or customer data.

## 3. Roles and responsibilities
- **CISO** — owns this policy; approves exceptions.
- **Engineering Manager** — approves role changes for direct reports.
- **IT / People Ops** — provisions and de-provisions accounts; owns joiner/mover/leaver (JML) checklist.
- **System owner** — reviews quarterly access recerts for their system.
- **DPO** — validates KVKK alignment for personal-data systems.

## 4. Principles
- **Least privilege + need-to-know.** Default deny; grant minimum scope, time-boxed.
- **Segregation of duties.** No single actor can both author and merge to `main`; no single actor can both request and approve a production secret rotation.
- **Strong auth.** MFA enforced for every privileged account (admin, DB, cloud, source). Passkeys preferred, TOTP acceptable, SMS banned.
- **Identity lifecycle tied to HR.** Access provisioned on signed offer; revoked within 4 business hours of termination trigger.

## 5. Procedures
### 5.1 Provisioning (Joiner)
1. HR system raises `onboarding.started` event.
2. IT applies RBAC template by job family (eng, ops, support, finance, exec).
3. Clerk SSO group membership added; MFA enrollment mandatory within 24 h.
4. First login produces signed audit record `user.provisioned`.

### 5.2 Changes (Mover)
Role change requires written approval from both current and target manager. Access delta applied within 1 business day; prior access revoked same day.

### 5.3 Revocation (Leaver)
Termination triggers immediate:
- SSO / Clerk session revocation.
- SSH / VPN / bastion key revocation.
- GitHub removal from UpCore org.
- Cloud console role removal.
- Laptop wipe scheduled within 7 days.
Target RTO for full revocation: 4 hours from trigger.

### 5.4 Privileged access (prod, DB, key vault)
- Time-bound (max 8 h) via Azure PIM just-in-time elevation.
- Ticket with business justification required.
- All actions recorded to `audit.events` + Azure Monitor.
- Break-glass accounts: 2 sealed, stored physically, quarterly test.

### 5.5 Recertification
- Quarterly recert of privileged access (system owner attests in Drata).
- Semi-annual recert of customer-data access.
- Auto-disable after 60 days of inactivity.

## 6. Enforcement and exceptions
Exceptions must be logged in `compliance/exceptions/` with CISO approval, compensating controls, and expiry.

## 7. Audit and evidence
- `audit.events` rows: `user.provisioned`, `user.revoked`, `role.changed`, `privileged.elevation`.
- Drata continuous monitoring connector on Azure AD and GitHub.
- Audit frequency: **continuous automated + quarterly manual recert + annual external audit.**

## 8. Non-compliance
Violations trigger incident response (IR-01). Intentional abuse is grounds for termination and KVKK/TCK md. 243 referral.
