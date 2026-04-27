#!/usr/bin/env bash
# ============================================================================
# UpCore Smoke Test — tam stack sağlık kontrolü
# ----------------------------------------------------------------------------
# Kullanım:
#   ./scripts/smoke-test.sh              # tüm servisler
#   ./scripts/smoke-test.sh core         # sadece altyapı + auth + gateway
# ============================================================================

set -euo pipefail

RED="\033[31m"
GREEN="\033[32m"
YELLOW="\033[33m"
RESET="\033[0m"

PASS=0
FAIL=0

check() {
  local name="$1"
  local url="$2"
  if curl -fsS --max-time 3 "$url" >/dev/null 2>&1; then
    printf "  ${GREEN}✔${RESET}  %-32s %s\n" "$name" "$url"
    PASS=$((PASS + 1))
  else
    printf "  ${RED}✘${RESET}  %-32s %s\n" "$name" "$url"
    FAIL=$((FAIL + 1))
  fi
}

echo
echo "═══ Altyapı ═══"
check "postgres (via docker)"  "http://localhost:5432" 2>/dev/null || printf "  ${YELLOW}?${RESET}  postgres (tcp check, docker ps kontrol)\n"
check "azurite blob"            "http://localhost:10000/devstoreaccount1?comp=list"
check "mailhog ui"              "http://localhost:8025"

echo
echo "═══ Go Servisler ═══"
check "auth              /health"      "http://localhost:8001/health"
check "tenant            /health"      "http://localhost:8002/health"
check "employee          /health"      "http://localhost:8003/health"
check "organization      /health"      "http://localhost:8004/health"
check "leave             /health"      "http://localhost:8005/health"
check "document          /health"      "http://localhost:8006/health"
check "survey            /health"      "http://localhost:8007/health"
check "intervention      /health"      "http://localhost:8008/health"
check "audit             /health"      "http://localhost:8009/health"
check "notification      /health"      "http://localhost:8010/health"
check "ats               /health"      "http://localhost:8011/health"
check "assessment        /health"      "http://localhost:8012/health"
check "mobility          /health"      "http://localhost:8013/health"
check "api-gateway       /health"      "http://localhost:8080/health"

echo
echo "═══ ML Servisler ═══"
check "psychometric-scoring /health" "http://localhost:8021/health"
check "burnout-prediction   /health" "http://localhost:8022/health"
check "recommendation       /health" "http://localhost:8023/health"
check "action-center        /health" "http://localhost:8024/health"

echo
echo "═══ Frontend ═══"
check "web                  /"         "http://localhost:3000"

echo
TOTAL=$((PASS + FAIL))
if [[ $FAIL -eq 0 ]]; then
  echo -e "${GREEN}── ${PASS}/${TOTAL} servis sağlıklı ──${RESET}"
  exit 0
else
  echo -e "${RED}── ${PASS}/${TOTAL} sağlıklı, ${FAIL} başarısız ──${RESET}"
  echo "docker compose logs <servis>  ile detaya bak."
  exit 1
fi
