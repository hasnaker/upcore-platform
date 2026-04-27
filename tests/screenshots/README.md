# @upcore/screenshots

Playwright-driven marketing screenshot capture + visual regression for UpCore.

## Quick start

```bash
# Full pipeline (from repo root):
make screenshots

# Individual steps:
make screenshots-seed              # Seed demo-co tenant
make screenshots-capture           # Capture all 128+ files
make screenshots-verify            # Verify outputs on disk
make screenshots-regression        # Compare against baselines
make screenshots-update-baseline   # After intentional UI change
```

## What gets produced

- **34 scenes** across 8 modules (sürdürme, koruma, performans, mobility,
  geliştirme, ik-ops, analitik, kvkk)
- Each scene captured at **2 viewports** (desktop 1920×1080, mobile 375×812)
  and **2 themes** (light, dark), at **2× retina**
- Output written as both `.webp` (92% quality) and `.png` fallback to
  `apps/marketing/public/screenshots/`
- `manifest.json` with alt text + timestamp for SEO + accessibility

## Guarantees

- **No PII**: all seed data generated via Turkish faker lists (`firstNamesTR`,
  `lastNamesTR`). Emails use `@demo.upcore.dev`.
- **Idempotent seed**: re-running clears previous `demo-co` data first.
- **Production guard**: `scripts/seed-demo.sh` refuses any DB URL matching
  `upcore.io`, `*.azure.com`, `rds.amazonaws.com`, or containing `prod`.
- **Animations disabled** via `prefers-reduced-motion` + injected stylesheet.
- **Deterministic**: PCG RNG seeded with constants; screenshots reproducible.

## CI

Nightly workflow: `.github/workflows/screenshots.yml` (cron `0 2 * * *`).
Also runs on PRs that touch `tests/screenshots/**`, `scripts/seed-demo*`, or
`apps/web/src/app/**`.
