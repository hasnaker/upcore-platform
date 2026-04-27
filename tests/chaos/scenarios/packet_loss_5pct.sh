#!/usr/bin/env bash
set -euo pipefail
TOXIPROXY_HOST="${TOXIPROXY_HOST:-localhost:8474}"
PROXY="${1:-redis}"

echo "[chaos] injecting 5% packet loss on ${PROXY}"
curl -sf -X POST "http://${TOXIPROXY_HOST}/proxies/${PROXY}/toxics" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"${PROXY}-loss\",\"type\":\"limit_data\",\"attributes\":{\"bytes\":524288}}" >/dev/null

curl -sf -X POST "http://${TOXIPROXY_HOST}/proxies/${PROXY}/toxics" \
  -H 'Content-Type: application/json' \
  -d "{\"name\":\"${PROXY}-timeout\",\"type\":\"timeout\",\"attributes\":{\"timeout\":5000}}" >/dev/null

trap "curl -sf -X DELETE http://${TOXIPROXY_HOST}/proxies/${PROXY}/toxics/${PROXY}-loss || true; curl -sf -X DELETE http://${TOXIPROXY_HOST}/proxies/${PROXY}/toxics/${PROXY}-timeout || true" EXIT
sleep 60
