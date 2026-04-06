#!/usr/bin/env bash
# Upcore · Dev Environment Launcher
# Starts: Docker infra + Go services + Python ML + Next.js
# Usage: ./scripts/dev.sh

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'
step() { echo -e "\n${BLUE}▶${NC} $1"; }
pass() { echo -e "${GREEN}✓${NC} $1"; }

echo "════════════════════════════════════════"
echo " Upcore Dev · Full Stack Launcher"
echo "════════════════════════════════════════"

# 1. Docker infra
step "Starting Docker infrastructure (postgres, redis, azurite, mailhog)"
cd infrastructure
docker compose up -d 2>&1 | tail -3
cd "$ROOT"

echo "  Waiting for postgres..."
until docker exec upcore-postgres pg_isready -U upcore -d upcore_dev >/dev/null 2>&1; do
  sleep 1
done
pass "PostgreSQL ready"

# 2. Run DB migrations if needed
step "Checking database migrations"
TABLE_COUNT=$(docker exec upcore-postgres psql -U upcore -d upcore_dev -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname='app'" 2>/dev/null | tr -d ' ')
if [ "$TABLE_COUNT" -lt "10" ]; then
  echo "  Running migrations..."
  cd database
  for f in $(ls migrations/*.up.sql | sort); do
    docker exec -i upcore-postgres psql -U upcore -d upcore_dev < "$f" >/dev/null 2>&1
  done
  for f in $(ls seeds/*.sql | sort); do
    docker exec -i upcore-postgres psql -U upcore -d upcore_dev < "$f" >/dev/null 2>&1
  done
  cd "$ROOT"
  pass "Migrations + seeds applied"
else
  pass "Database already has $TABLE_COUNT tables"
fi

# 3. Set common env vars for Go services
export DATABASE_URL="postgresql://upcore:upcore@localhost:5432/upcore_dev?sslmode=disable"
export REDIS_URL="redis://localhost:6379/0"
export LOG_LEVEL="info"
export NODE_ENV="development"

# 4. Start Go services
step "Starting Go backend services"

declare -A SERVICES=(
  ["auth"]="8001"
  ["tenant"]="8002"
  ["employee"]="8003"
  ["organization"]="8004"
  ["leave"]="8005"
  ["document"]="8006"
  ["survey"]="8007"
  ["intervention"]="8008"
  ["audit"]="8009"
  ["notification"]="8010"
  ["ats"]="8011"
  ["assessment"]="8012"
  ["api-gateway"]="8080"
)

PIDS=()
for svc in "${!SERVICES[@]}"; do
  port="${SERVICES[$svc]}"
  svc_dir="$ROOT/services/$svc"
  if [ -f "$svc_dir/cmd/main.go" ]; then
    PORT=$port \
    HTTP_PORT=$port \
    DATABASE_URL="$DATABASE_URL" \
    REDIS_URL="$REDIS_URL" \
    go run "$svc_dir/cmd/main.go" > "/tmp/upcore-$svc.log" 2>&1 &
    PIDS+=($!)
    echo "  $svc → :$port (PID $!)"
  fi
done
pass "Go services starting (check /tmp/upcore-*.log for errors)"

# 5. Start Python ML services
step "Starting Python ML services"
for ml_svc in psychometric-scoring burnout-prediction recommendation action-center; do
  ml_dir="$ROOT/ml-services/$ml_svc"
  if [ -f "$ml_dir/app/main.py" ]; then
    case $ml_svc in
      psychometric-scoring) ml_port=8021 ;;
      burnout-prediction) ml_port=8022 ;;
      recommendation) ml_port=8023 ;;
      action-center) ml_port=8024 ;;
    esac
    cd "$ml_dir"
    DATABASE_URL="$DATABASE_URL" \
    REDIS_URL="$REDIS_URL" \
    python3 -m uvicorn app.main:app --port $ml_port --host 0.0.0.0 > "/tmp/upcore-$ml_svc.log" 2>&1 &
    PIDS+=($!)
    echo "  $ml_svc → :$ml_port (PID $!)"
    cd "$ROOT"
  fi
done
pass "ML services starting"

# 6. Wait for services to be ready
step "Waiting for services to start (5s)"
sleep 5

# 7. Health checks
step "Health checks"
for svc in auth tenant employee organization; do
  port="${SERVICES[$svc]}"
  status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port/health" 2>/dev/null || echo "000")
  if [ "$status" = "200" ]; then
    pass "$svc :$port → healthy"
  else
    echo "  ⚠ $svc :$port → $status (check /tmp/upcore-$svc.log)"
  fi
done

# 8. Start Next.js frontend
step "Starting Next.js frontend"
cd "$ROOT/apps/web"
NEXT_PUBLIC_API_URL=http://localhost:8080 \
npx next dev --port 3000 > "/tmp/upcore-web.log" 2>&1 &
WEB_PID=$!
cd "$ROOT"
pass "Next.js → :3000 (PID $WEB_PID)"

echo ""
echo "════════════════════════════════════════"
echo " Upcore Dev Environment Running"
echo "════════════════════════════════════════"
echo ""
echo " Frontend:  http://localhost:3000"
echo " API:       http://localhost:8080"
echo " Postgres:  localhost:5432"
echo " Redis:     localhost:6379"
echo " Mailhog:   http://localhost:8025"
echo ""
echo " Logs: /tmp/upcore-*.log"
echo " Stop: kill ${PIDS[@]} $WEB_PID"
echo ""
echo " Press Ctrl+C to stop all services"

# Trap Ctrl+C to kill all background processes
trap "echo 'Stopping all services...'; kill ${PIDS[@]} $WEB_PID 2>/dev/null; docker compose -f infrastructure/docker-compose.yml stop; exit 0" SIGINT SIGTERM

# Wait for all background processes
wait
