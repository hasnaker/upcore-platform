# Security Awareness and Training Policy

**ID:** POL-15 · **Version:** 1.0 · **Effective:** 2026-04-23 · **Owner:** CISO + People Ops
**Review cadence:** annual · **Frameworks:** SOC 2 CC2.2 · ISO 27001 A.6.3

## 1. Purpose
Ensure every UpCore workforce member understands security risks and their responsibilities.

## 2. Scope
Employees, contractors, interns, long-term consultants.

## 3. Curriculum
### 3.1 Onboarding (within 7 days of start)
- UpCore information security foundations.
- Acceptable use (POL-02).
- KVKK 101 + data handling.
- Phishing recognition.
- Incident reporting (phish@, sec@).
Completion tracked in HRIS with quiz ≥ 80%.

### 3.2 Annual refresher (all staff)
- Policy updates.
- New threats recap (ransomware, BEC, supply chain).
- Live phishing simulation (monthly) — click-through tracked.
- KVKK refresh + data subject rights.

### 3.3 Role-specific
- **Developers:** OWASP Top 10 + ASVS Level 2 secure coding (annual, 4 h).
- **Ops / SRE:** incident commander drills; cryptography refresh.
- **Support / Success:** social-engineering defence; PII-in-tickets redaction.
- **Finance:** wire-transfer fraud, invoice impersonation.
- **Leadership:** tabletop exercises; board briefing.

## 4. Phishing simulation
- Tool: Knowbe4 / Hoxhunt.
- Monthly campaign with varied difficulty.
- Metrics: click rate, report rate, repeat offenders.
- Remediation: one-to-one follow-up training after click; disciplinary path after 3 repeats.

## 5. Tracking and enforcement
- HRIS records completion with timestamp.
- < 80% quiz or missed deadline: remediation + manager notification; repeated non-completion blocks access per POL-01.

## 6. Audit and evidence
- Annual completion report (target: 100% within deadline).
- Phishing click-rate trend (target: < 5%).
- Drata connector pulls completion automatically.
