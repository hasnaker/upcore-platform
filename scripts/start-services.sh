#!/usr/bin/env bash
# Upcore · Start All Go Services for Local Development
# Usage: cd upcore-platform && bash scripts/start-services.sh
#
# Prerequisites:
#   - PostgreSQL running at localhost:5432 (upcore_dev database)
#   - Redis running at localhost:6379
#   - Go 1.23+ installed
#
# The script skips services that are already running (detected via /health).
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

export DATABASE_URL="postgresql://upcore:upcore_dev_password@localhost:5432/upcore_dev?sslmode=disable"
export REDIS_URL="redis://localhost:6379/0"
export LOG_LEVEL="info"
export ROUTES_CONFIG_PATH="$ROOT/services/api-gateway/config/routes.yaml"

echo "============================================"
echo " Upcore · Starting All Backend Services"
echo "============================================"
echo ""

# Services that use DATABASE_URL (most of them)
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
)

PIDS=()

for svc in "${!SERVICES[@]}"; do
  port="${SERVICES[$svc]}"
  svc_dir="$ROOT/services/$svc"
  if [ -f "$svc_dir/cmd/main.go" ]; then
    # Skip if already running
    if curl -sf "http://localhost:$port/health" >/dev/null 2>&1; then
      echo "  SKIP $svc :$port (already running)"
      continue
    fi
    # Assessment service uses REDIS_URL as addr format (localhost:6379), not URL
    if [ "$svc" = "assessment" ]; then
      PORT=$port \
      DATABASE_URL="$DATABASE_URL" \
      REDIS_URL="localhost:6379" \
      go run "$svc_dir/cmd/main.go" > "/tmp/upcore-$svc.log" 2>&1 &
    else
      PORT=$port \
      DATABASE_URL="$DATABASE_URL" \
      REDIS_URL="$REDIS_URL" \
      go run "$svc_dir/cmd/main.go" > "/tmp/upcore-$svc.log" 2>&1 &
    fi
    PIDS+=($!)
    echo "  START $svc :$port (PID $!)"
  fi
done

# Start api-gateway last (needs Redis for rate limiting)
gw_dir="$ROOT/services/api-gateway"
if [ -f "$gw_dir/cmd/main.go" ]; then
  if curl -sf "http://localhost:8080/health" >/dev/null 2>&1; then
    echo "  SKIP api-gateway :8080 (already running)"
  else
    PORT=8080 \
    DATABASE_URL="$DATABASE_URL" \
    REDIS_URL="$REDIS_URL" \
    ROUTES_CONFIG_PATH="$ROUTES_CONFIG_PATH" \
    go run "$gw_dir/cmd/main.go" > "/tmp/upcore-api-gateway.log" 2>&1 &
    PIDS+=($!)
    echo "  START api-gateway :8080 (PID $!)"
  fi
fi

echo ""
echo "Waiting for services to start (10s)..."
sleep 10

echo ""
echo "=== HEALTH CHECKS ==="
ALL_SERVICES=("auth:8001" "tenant:8002" "employee:8003" "organization:8004" "leave:8005" "document:8006" "survey:8007" "intervention:8008" "audit:8009" "notification:8010" "ats:8011" "assessment:8012" "api-gateway:8080")
OK=0
FAIL=0
for entry in "${ALL_SERVICES[@]}"; do
  svc="${entry%%:*}"
  port="${entry##*:}"
  status=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port/health" 2>/dev/null || echo "000")
  if [ "$status" = "200" ]; then
    echo "  OK   $svc :$port"
    OK=$((OK+1))
  else
    echo "  FAIL $svc :$port (status=$status, check /tmp/upcore-$svc.log)"
    FAIL=$((FAIL+1))
  fi
done

echo ""
echo "Results: $OK healthy, $FAIL failed"
echo "Logs: /tmp/upcore-*.log"
if [ ${#PIDS[@]} -gt 0 ]; then
  echo "Stop all: kill ${PIDS[@]}"
fi
echo ""
echo "Press Ctrl+C to stop all services"

trap "echo 'Stopping...'; kill ${PIDS[@]} 2>/dev/null; exit 0" SIGINT SIGTERM
wait
