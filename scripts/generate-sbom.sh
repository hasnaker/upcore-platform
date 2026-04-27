#!/usr/bin/env bash
# ============================================================================
# UpCore — SBOM generation (CycloneDX format)
# ----------------------------------------------------------------------------
# Emits:
#   sbom/nodejs.cyclonedx.json     (pnpm workspace)
#   sbom/go-<service>.cyclonedx.json   (per Go module)
#   sbom/python-<service>.cyclonedx.json  (per ml-service)
#   sbom/docker-<image>.cyclonedx.json (if docker images present)
#   sbom/upcore-aggregate.cyclonedx.json (merged, used for release attestation)
#
# Produced on every CI run; release workflow signs + attests with cosign.
# ============================================================================
set -euo pipefail
IFS=$'\n\t'

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

OUT="${REPO_ROOT}/sbom"
mkdir -p "$OUT"
STAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

log() { echo "[sbom] $*"; }

# -- Helper: install tools if missing (idempotent; cached in CI runner) -----
ensure_cyclonedx_npm() {
  if ! command -v cyclonedx-npm >/dev/null 2>&1; then
    npm install -g @cyclonedx/cyclonedx-npm@1.19.3 >/dev/null
  fi
}
ensure_cyclonedx_gomod() {
  if ! command -v cyclonedx-gomod >/dev/null 2>&1; then
    go install github.com/CycloneDX/cyclonedx-gomod/cmd/cyclonedx-gomod@latest
  fi
}
ensure_cyclonedx_py() {
  if ! command -v cyclonedx-py >/dev/null 2>&1; then
    pip install --quiet cyclonedx-bom==4.5.0 >/dev/null
  fi
}

# -- 1. Node / pnpm workspace ----------------------------------------------
log "generating Node / pnpm SBOM …"
if command -v pnpm >/dev/null 2>&1; then
  ensure_cyclonedx_npm
  cyclonedx-npm --output-file "${OUT}/nodejs.cyclonedx.json" --output-format json --short-PURLs \
    || log "WARN: pnpm SBOM generation failed"
fi

# -- 2. Go modules (services + packages) -----------------------------------
log "generating Go SBOMs …"
if command -v go >/dev/null 2>&1; then
  ensure_cyclonedx_gomod
  for modfile in services/*/go.mod packages/go/*/go.mod; do
    [ -f "$modfile" ] || continue
    dir="$(dirname "$modfile")"
    name="$(basename "$dir")"
    (cd "$dir" && cyclonedx-gomod app -json -output "${OUT}/go-${name}.cyclonedx.json") \
      || log "WARN: go SBOM failed for ${name}"
  done
fi

# -- 3. Python ml-services -------------------------------------------------
log "generating Python SBOMs …"
if command -v python3 >/dev/null 2>&1; then
  ensure_cyclonedx_py
  for svc in ml-services/*/; do
    name="$(basename "$svc")"
    if [ -f "${svc}pyproject.toml" ]; then
      cyclonedx-py poetry \
        --output-format json \
        --output-file "${OUT}/python-${name}.cyclonedx.json" \
        --pyproject "${svc}pyproject.toml" 2>/dev/null \
        || cyclonedx-py requirements \
             --output-format json \
             --output-file "${OUT}/python-${name}.cyclonedx.json" \
             "${svc}requirements.txt" 2>/dev/null \
        || log "WARN: Python SBOM failed for ${name}"
    fi
  done
fi

# -- 4. Container images (syft) -------------------------------------------
if command -v syft >/dev/null 2>&1; then
  log "generating container SBOMs via syft …"
  for img in $(docker images --format '{{.Repository}}:{{.Tag}}' 2>/dev/null | grep '^upcore/' || true); do
    name="$(echo "$img" | tr '/:' '__')"
    syft "$img" -o cyclonedx-json="${OUT}/docker-${name}.cyclonedx.json" \
      || log "WARN: syft failed for ${img}"
  done
else
  log "syft not installed — skipping container SBOMs"
fi

# -- 5. Aggregate (manifest of all component SBOMs) ------------------------
log "writing aggregate manifest …"
refs=""
component_files="$(cd "$OUT" && ls | grep -v '^upcore-aggregate' || true)"
total="$(printf '%s\n' "$component_files" | sed '/^$/d' | wc -l | tr -d ' ')"
idx=0
for f in $component_files; do
  idx=$((idx + 1))
  if [ "$idx" -lt "$total" ]; then
    refs="${refs}    { \"type\": \"bom\", \"url\": \"./${f}\" },\n"
  else
    refs="${refs}    { \"type\": \"bom\", \"url\": \"./${f}\" }\n"
  fi
done

{
  echo "{"
  echo "  \"bomFormat\": \"CycloneDX\","
  echo "  \"specVersion\": \"1.5\","
  echo "  \"serialNumber\": \"urn:uuid:upcore-${STAMP}\","
  echo "  \"version\": 1,"
  echo "  \"metadata\": {"
  echo "    \"timestamp\": \"${STAMP}\","
  echo "    \"tools\": [{ \"vendor\": \"UpCore\", \"name\": \"generate-sbom.sh\", \"version\": \"1.0\" }],"
  echo "    \"component\": {"
  echo "      \"type\": \"application\","
  echo "      \"name\": \"upcore-platform\","
  echo "      \"version\": \"${GITHUB_SHA:-local}\","
  echo "      \"description\": \"UpCore platform aggregate SBOM (Node + Go + Python + containers)\""
  echo "    }"
  echo "  },"
  echo "  \"externalReferences\": ["
  printf '%b' "$refs"
  echo "  ]"
  echo "}"
} > "${OUT}/upcore-aggregate.cyclonedx.json"

log "SBOMs written to ${OUT} (aggregate: upcore-aggregate.cyclonedx.json)"
