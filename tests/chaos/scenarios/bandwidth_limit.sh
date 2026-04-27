#!/usr/bin/env bash
set -euo pipefail
TOXIPROXY_HOST="${TOXIPROXY_HOST:-localhost:8474}"
PROXY="${1:-ml-burnout}"
RATE_KB="${2:-100}"

echo "[chaos] bandwidth limit ${RATE_KB} KB/s on ${PROXY}"
curl -sf -X POST "http://${TOXIPROXY_HOST}/proxies/${PROXY}/toxics" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"${PROXY}-bw\",\"type\":\"bandwidth\",\"attributes\":{\"rate\":${RATE_KB}}}" >/dev/null

trap "curl -sf -X DELETE http://${TOXIPROXY_HOST}/proxies/${PROXY}/toxics/${PROXY}-bw || true" EXIT
sleep 120
