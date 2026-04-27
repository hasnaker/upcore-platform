# Physical and Environmental Security Policy

**ID:** POL-10 · **Version:** 1.0 · **Effective:** 2026-04-23 · **Owner:** Office Manager + CISO
**Review cadence:** annual · **Frameworks:** SOC 2 CC6.4 · ISO 27001 A.7.1–A.7.14

## 1. Purpose
Protect UpCore office(s), endpoints, and cloud facilities against unauthorized physical access and environmental hazards.

## 2. Scope
UpCore HQ (İstanbul, Levent), remote workers' home offices, company-issued endpoints, and sub-processor data centres.

## 3. Cloud and data centres
UpCore does not operate its own data centres. Azure EU-North and EU-West are contractually required to maintain ISO 27001, SOC 2 Type II, and ISO 22301 (business continuity). Annual attestation review (POL-06).

## 4. Office controls
- Badge access to HQ; visitor log + escort.
- Server rooms / network closets locked; access list owned by Office Manager.
- CCTV covers entrances, retained 30 days.
- Fire suppression + smoke detectors; UPS on network equipment.
- Clean-desk policy: no Confidential+ papers left overnight.

## 5. Endpoint controls
- Company-issued laptops enrolled in MDM (Jamf / Intune).
- Full-disk encryption mandatory; TPM-backed where available.
- Cable lock recommended in open spaces.
- Lost-device procedure: report within 4 h; IT remote-wipes; incident opened per POL-03.

## 6. Remote work
See POL-11.

## 7. Media and asset disposal
Laptops: certified cryptographic erase + physical destruction of SSD on retirement. Certificate retained 3 years.

## 8. Environmental
HQ fire drill semi-annual; insurance in place for fire, theft, flood.

## 9. Audit and evidence
- Badge / CCTV logs (Office Manager).
- MDM compliance dashboard (IT).
- Annual physical walkthrough audit by CISO.
