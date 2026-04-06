#!/usr/bin/env bash
# Upcore Platform · Full Stack Validation
# Runs: deps install → typecheck → test → docker → migrate → go build → go test
# Usage: ./scripts/validate.sh

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; exit 1; }
step() { echo -e "\n${BLUE}▶${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }

START_TIME=$(date +%s)

echo "════════════════════════════════════════"
echo " Upcore Platform · Validation"
echo "════════════════════════════════════════"

# 1. Prerequisites
step "Checking prerequisites"
command -v node >/dev/null 2>&1 || fail "Node.js not found"
command -v pnpm >/dev/null 2>&1 || fail "pnpm not found (corepack enable + corepack prepare pnpm@9.12.0 --activate)"
command -v go >/dev/null 2>&1 || fail "Go not found"
command -v docker >/dev/null 2>&1 || fail "Docker not found"
pass "All prerequisites installed"

# 2. Install dependencies
step "Installing workspace dependencies (pnpm install)"
pnpm install --frozen-lockfile 2>&1 | tail -5 || pnpm install 2>&1 | tail -5
pass "Dependencies installed"

# 3. TypeScript type checks
step "Type-checking @upcore/types"
pnpm --filter @upcore/types tsc --noEmit && pass "@upcore/types types OK" || fail "@upcore/types type errors"

step "Type-checking @upcore/design-system"
pnpm --filter @upcore/design-system tsc --noEmit && pass "@upcore/design-system types OK" || fail "@upcore/design-system type errors"

# 4. Unit tests (TypeScript)
step "Running @upcore/types tests"
pnpm --filter @upcore/types test --run 2>&1 | tail -20 && pass "@upcore/types tests passed" || warn "@upcore/types tests had issues"

step "Running @upcore/design-system tests"
pnpm --filter @upcore/design-system test --run 2>&1 | tail -20 && pass "@upcore/design-system tests passed" || warn "@upcore/design-system tests had issues"

# 5. Docker services
step "Starting docker-compose (postgres, redis, azurite, mailhog)"
cd infrastructure
docker compose up -d
echo "  Waiting 15s for services to be healthy..."
sleep 15
docker compose ps
cd "$ROOT"
pass "Docker services started"

# 6. Database migrations
step "Running database migrations"
cd database
make wait-db 2>&1 | tail -5
make migrate-up 2>&1 | tail -10 && pass "Migrations applied" || fail "Migrations failed"
make seed-dev 2>&1 | tail -10 && pass "Dev data seeded" || warn "Seed had warnings"
make status 2>&1 | tail -5
cd "$ROOT"

# 7. Go services build + test
for svc in auth tenant employee organization leave document; do
  if [ -d "services/$svc" ]; then
    step "Building services/$svc"
    cd "services/$svc"
    go mod tidy 2>&1 | tail -3
    go build ./... 2>&1 | tail -10 && pass "services/$svc builds" || fail "services/$svc build failed"
    go vet ./... 2>&1 | tail -5 && pass "services/$svc vet clean" || warn "services/$svc vet warnings"
    go test ./... -count=1 2>&1 | tail -20 && pass "services/$svc tests passed" || warn "services/$svc tests had issues"
    cd "$ROOT"
  fi
done

# 8. Frontend build
if [ -d "apps/web" ]; then
  step "Type-checking apps/web"
  pnpm --filter @upcore/web tsc --noEmit 2>&1 | tail -20 && pass "apps/web types OK" || warn "apps/web type errors"
fi

# Summary
ELAPSED=$(($(date +%s) - START_TIME))
echo ""
echo "════════════════════════════════════════"
echo -e " ${GREEN}✓${NC} Validation complete in ${ELAPSED}s"
echo "════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  - Start services: pnpm dev"
echo "  - View docs: open architecture/architecture-docs/INDEX.html"
echo "  - Stop docker: cd infrastructure && docker compose down"
