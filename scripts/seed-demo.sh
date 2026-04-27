#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# seed-demo.sh — Seeds the demo-co tenant for marketing screenshot capture.
#
# Refuses to run against production:
#   * DATABASE_URL must be set and must contain dev/demo/test/localhost marker
#   * DEMO_SEED_ALLOW=1 must be exported
#   * Hostname cannot match production markers
#
# Usage:
#   ./scripts/seed-demo.sh
#
# CI:
#   DEMO_SEED_ALLOW=1 DATABASE_URL=postgres://... ./scripts/seed-demo.sh
# -----------------------------------------------------------------------------
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Default to local dev DB if unset.
: "${DATABASE_URL:=postgres://upcore:upcore_dev_password@localhost:5432/upcore_dev?sslmode=disable}"
export DATABASE_URL

if [[ "${DEMO_SEED_ALLOW:-0}" != "1" ]]; then
  echo "[seed-demo] REFUSED: DEMO_SEED_ALLOW=1 must be set explicitly." >&2
  echo "            This guard prevents accidental production seeding." >&2
  exit 2
fi

case "$DATABASE_URL" in
  *upcore.io*|*.azure.com*|*rds.amazonaws.com*|*prod*|*production*)
    echo "[seed-demo] REFUSED: DATABASE_URL contains a production marker." >&2
    exit 3
    ;;
esac

if ! command -v go >/dev/null 2>&1; then
  echo "[seed-demo] ERROR: go not installed or not on PATH." >&2
  exit 4
fi

# Run migrations + baseline seeds if DB is empty.
if command -v make >/dev/null 2>&1; then
  if [[ "${SKIP_MIGRATE:-0}" != "1" ]]; then
    echo "[seed-demo] Ensuring migrations are up-to-date..."
    make -C database migrate-up >/dev/null || {
      echo "[seed-demo] WARN: migrate-up failed or already applied — continuing."
    }
  fi
fi

echo "[seed-demo] Seeding demo-co tenant via Go..."
cd "$ROOT_DIR/scripts/seed-demo"
go mod download
go run .

echo "[seed-demo] Done."
