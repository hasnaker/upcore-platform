#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ALLOWLIST="$ROOT/apps/web/.direct-db-allowlist.txt"

if [[ ! -f "$ALLOWLIST" ]]; then
  echo "missing allowlist: $ALLOWLIST"
  exit 1
fi

TMP_CURRENT="$(mktemp)"
TMP_NEW="$(mktemp)"
trap 'rm -f "$TMP_CURRENT" "$TMP_NEW"' EXIT

(
  cd "$ROOT"
  rg -l "new Pool\\(|DB_URL" apps/web/src/app/api --glob '**/route.ts' | sort > "$TMP_CURRENT"
)

comm -13 "$ALLOWLIST" "$TMP_CURRENT" > "$TMP_NEW"

CURRENT_COUNT="$(wc -l < "$TMP_CURRENT" | tr -d ' ')"
ALLOW_COUNT="$(wc -l < "$ALLOWLIST" | tr -d ' ')"

if [[ -s "$TMP_NEW" ]]; then
  echo "Direct DB usage expanded in apps/web API routes (blocked):"
  cat "$TMP_NEW"
  echo
  echo "Current count: $CURRENT_COUNT (allowlist: $ALLOW_COUNT)"
  exit 1
fi

echo "Direct DB guard passed. Current count: $CURRENT_COUNT (allowlist: $ALLOW_COUNT)"
