# Secure Software Development Lifecycle (SDLC) Policy

**ID:** POL-12 · **Version:** 1.0 · **Effective:** 2026-04-23 · **Owner:** CTO + CISO
**Review cadence:** annual · **Frameworks:** SOC 2 CC8.1, CC7.1 · ISO 27001 A.8.25–A.8.29 · OWASP SAMM

## 1. Purpose
Embed security into every phase of the software lifecycle.

## 2. Phases

### 2.1 Design
- Threat modelling (STRIDE + DREAD) for every new service or data flow that touches Restricted+.
- DPIA trigger: new ML model, new data source, new cross-border transfer.
- Architecture Decision Record (ADR) with security section.

### 2.2 Implementation
- Pull requests mandatory; direct push to `main` blocked.
- Pre-commit hooks: gitleaks, trufflehog, semgrep (UpCore ruleset), gosec, bandit, ruff.
- Coding standards per `CLAUDE.md` + OWASP ASVS Level 2.
- Parameterised queries only; no string-built SQL.
- Secrets: Key Vault via managed identity; never committed.

### 2.3 CI / build
- `.github/workflows/security.yml` runs on every PR: Semgrep, gosec, bandit, TruffleHog, gitleaks, Snyk, Trivy (fs + config), FOSSA, SBOM.
- Coverage gates enforced per service.
- Container images signed (cosign) + SBOM attached.

### 2.4 Testing
- Unit coverage ≥ thresholds in `pr.yml`.
- Integration + E2E (Playwright) for customer-facing flows.
- k6 load test monthly for regression.
- Penetration test twice a year (CREST-accredited external).
- Bug bounty (phase 2) via HackerOne private programme.

### 2.5 Deployment
- Blue-green or canary per POL-08.
- Automated rollback on SLO regression.
- Production access requires PIM elevation.

### 2.6 Operations
- Log monitoring: structured logs → Datadog/Sentinel; alerting rules reviewed quarterly.
- Vulnerability response SLA: Critical 7 d, High 30 d, Medium 90 d.

### 2.7 Decommissioning
Service retirement checklist: DNS removal, secret revocation, data export/delete, documentation archive.

## 3. Dependency management
- Dependabot (`.github/dependabot.yml`) weekly; security advisories opened immediately.
- License audit via FOSSA — AGPL and GPL-3.0 banned for service code; MIT/Apache/BSD approved.

## 4. Third-party code
- Vendor / OSS libs go through security review (known CVE, activity, maintenance).
- Pinned versions; reproducible builds (go modules, pnpm lockfile, uv lock).

## 5. Audit and evidence
- CI run artefacts 90 days, SBOM per release signed and archived.
- Quarterly SAMM maturity self-assessment.
- External pentest report filed in `compliance/pentest/YYYY/`.
