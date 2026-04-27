# Acceptable Use Policy

**ID:** POL-02 · **Version:** 1.0 · **Effective:** 2026-04-23 · **Owner:** CISO
**Review cadence:** annual · **Frameworks:** SOC 2 CC1 · ISO 27001 A.5.10 · KVKK md. 12

## 1. Purpose
Define acceptable and prohibited use of UpCore information assets, endpoints, and cloud accounts.

## 2. Scope
Every workforce member (FTE, contractor, intern) handling UpCore assets or customer data.

## 3. Acceptable use
- UpCore-managed endpoints only for customer data.
- Strong, unique passwords managed via 1Password team vault.
- Full-disk encryption (FileVault / BitLocker) required and verified by MDM.
- Screen lock ≤ 5 min idle.
- VPN required for admin consoles when off corporate network.
- Report suspicious email / attachment via `phish@upcore.io` within 1 hour.

## 4. Prohibited use
- Storing customer PII on personal devices, personal cloud storage, or USB drives.
- Installing unapproved software on production or endpoint devices.
- Sharing credentials, API keys, or SSO sessions (including with other employees).
- Disabling security agents (MDM, EDR, firewall).
- Using generative AI tools with customer PII unless tool is on the approved list (Claude Team via UpCore workspace, Azure OpenAI private endpoint).
- Circumventing approval workflows (e.g., committing directly to `main`, self-merging PRs).

## 5. Communications and AI tools
- Slack, Gmail, Linear, Notion: UpCore tenant only.
- Generative AI: approved tool list maintained in `compliance/vendors/ai-tools.md`; no PII ever.
- Personal accounts must not be connected to UpCore SaaS.

## 6. Remote and travel
See POL-11 (Remote Access). High-risk travel requires clean device from IT.

## 7. Enforcement
First violation: written warning + mandatory retraining. Repeat: HR action up to termination. Criminal referral for willful data theft.

## 8. Audit and evidence
Annual training completion records (POL-15), signed policy acknowledgement in HRIS on hire and annually.
