#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

export DATABASE_URL="postgresql://upcore:upcore_dev_password@localhost:5432/upcore_dev?sslmode=disable"
export REDIS_URL="redis://localhost:6379/0"

echo "🚀 Starting Upcore V1..."

# Docker infra
echo "  [1/4] Docker infrastructure..."
cd infrastructure && docker compose up -d 2>/dev/null && cd "$ROOT"
sleep 5

# Go services
echo "  [2/4] Go backend services (13)..."
for pair in "auth 8001" "tenant 8002" "employee 8003" "organization 8004" "leave 8005" "document 8006" "survey 8007" "intervention 8008" "audit 8009" "notification 8010" "ats 8011" "assessment 8012"; do
  svc=$(echo $pair | awk '{print $1}'); port=$(echo $pair | awk '{print $2}')
  cd "services/$svc" && PORT=$port REDIS_URL="localhost:6379" go run cmd/main.go > "/tmp/upcore-$svc.log" 2>&1 & cd "$ROOT"
done
cd services/api-gateway && PORT=8080 ROUTES_CONFIG_PATH=config/routes.yaml go run cmd/main.go > /tmp/upcore-gateway.log 2>&1 & cd "$ROOT"

# Python ML
echo "  [3/4] Python ML services (4)..."
VENV="/tmp/upcore-venv/bin/python3"
for pair in "psychometric-scoring 8025" "burnout-prediction 8022" "recommendation 8023" "action-center 8024"; do
  svc=$(echo $pair | awk '{print $1}'); port=$(echo $pair | awk '{print $2}')
  cd "ml-services/$svc" && PYTHONPATH=. $VENV -m uvicorn app.main:app --port $port > "/tmp/upcore-$svc.log" 2>&1 & cd "$ROOT"
done

# Frontend
echo "  [4/4] Next.js frontend..."
cd apps/web && npx next dev --port 3000 > /tmp/upcore-web.log 2>&1 & cd "$ROOT"

echo ""
sleep 10
echo "✅ Upcore V1 Running!"
echo "   Frontend:  http://localhost:3000"
echo "   API:       http://localhost:8080"
echo "   Services:  13 Go + 4 Python ML"
echo "   Logs:      /tmp/upcore-*.log"
echo ""
echo "   Press Ctrl+C to stop"
trap "pkill -f upcore; pkill -f uvicorn; pkill -f 'next dev'; docker compose -f infrastructure/docker-compose.yml stop; exit 0" SIGINT SIGTERM
wait
