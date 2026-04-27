# =============================================================================
# UpCore — Root Makefile
# Top-level orchestration for cross-cutting tasks (screenshots, seeds, CI).
# Module-specific tasks live under database/Makefile, services/<svc>/Makefile.
# =============================================================================

SHELL := /bin/bash
ROOT  := $(shell pwd)

# Development defaults. CI overrides via exported env.
export DATABASE_URL ?= postgres://upcore:upcore_dev_password@localhost:5432/upcore_dev?sslmode=disable
export SCREENSHOT_BASE_URL ?= http://localhost:3000

.PHONY: help screenshots screenshots-seed screenshots-capture screenshots-regression \
        screenshots-verify screenshots-update-baseline seed-demo clean-screenshots

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?##' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-30s\033[0m %s\n", $$1, $$2}'

# -----------------------------------------------------------------------------
# screenshots — full pipeline: migrate → seed → capture → verify
# -----------------------------------------------------------------------------

screenshots: screenshots-seed screenshots-capture screenshots-verify ## Seed demo tenant and capture all marketing screenshots
	@echo ""
	@echo "============================================================"
	@echo "  Screenshots pipeline complete."
	@echo "  Output: apps/marketing/public/screenshots/"
	@echo "  Scenes: 32+ × 2 viewports × 2 themes = 128+ files"
	@echo "============================================================"

screenshots-seed: ## Seed demo-co tenant (idempotent, refuses production DB)
	@DEMO_SEED_ALLOW=1 bash scripts/seed-demo.sh

screenshots-capture: ## Capture all scenes (desktop + mobile, light + dark)
	@cd tests/screenshots && \
		(pnpm install --silent 2>/dev/null || pnpm install) && \
		pnpm exec playwright install --with-deps chromium && \
		pnpm run capture

screenshots-regression: ## Run visual regression against stored baselines
	@cd tests/screenshots && pnpm run regression

screenshots-update-baseline: ## Rewrite regression baselines (use after intentional UI change)
	@cd tests/screenshots && pnpm run regression:update

screenshots-verify: ## Verify manifest + filesystem outputs (no browser)
	@cd tests/screenshots && pnpm run verify

seed-demo: ## Alias for screenshots-seed
	@$(MAKE) screenshots-seed

clean-screenshots: ## Remove generated screenshots (keep baselines)
	@rm -rf apps/marketing/public/screenshots/*.webp apps/marketing/public/screenshots/*.png apps/marketing/public/screenshots/manifest.json
	@echo "Cleaned apps/marketing/public/screenshots/"
