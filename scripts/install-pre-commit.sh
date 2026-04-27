#!/usr/bin/env bash
# ============================================================================
# UpCore — install pre-commit hooks (idempotent)
# Run once per developer machine.
# ============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

info()  { printf '\033[36m[pre-commit]\033[0m %s\n' "$*"; }
warn()  { printf '\033[33m[pre-commit]\033[0m %s\n' "$*"; }
error() { printf '\033[31m[pre-commit]\033[0m %s\n' "$*" >&2; }

# --- 1. pre-commit itself --------------------------------------------------
if ! command -v pre-commit >/dev/null 2>&1; then
  info "Installing pre-commit via pipx/pip…"
  if command -v pipx >/dev/null 2>&1; then
    pipx install pre-commit
  elif command -v brew >/dev/null 2>&1; then
    brew install pre-commit
  else
    python3 -m pip install --user pre-commit
  fi
fi

# --- 2. gitleaks -----------------------------------------------------------
if ! command -v gitleaks >/dev/null 2>&1; then
  info "Installing gitleaks…"
  if command -v brew >/dev/null 2>&1; then
    brew install gitleaks
  else
    warn "brew not found — install gitleaks manually: https://github.com/gitleaks/gitleaks"
  fi
fi

# --- 3. trufflehog ---------------------------------------------------------
if ! command -v trufflehog >/dev/null 2>&1; then
  info "Installing trufflehog…"
  if command -v brew >/dev/null 2>&1; then
    brew install trufflehog
  else
    warn "brew not found — install trufflehog manually: https://github.com/trufflesecurity/trufflehog"
  fi
fi

# --- 4. semgrep ------------------------------------------------------------
if ! command -v semgrep >/dev/null 2>&1; then
  info "Installing semgrep…"
  python3 -m pip install --user semgrep==1.82.0
fi

# --- 5. golangci-lint ------------------------------------------------------
if ! command -v golangci-lint >/dev/null 2>&1; then
  info "Installing golangci-lint…"
  go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest || warn "go install failed"
fi

# --- 6. Configure hooks ----------------------------------------------------
info "Installing git hook scripts…"
pre-commit install --install-hooks
pre-commit install --hook-type commit-msg
pre-commit install --hook-type pre-push

# --- 7. Smoke test ---------------------------------------------------------
info "Running initial scan (may take a minute)…"
pre-commit run --all-files || {
  warn "Some hooks found issues — fix them before committing."
  exit 1
}

info "pre-commit installed successfully."
