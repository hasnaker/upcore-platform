#!/usr/bin/env bash
# Inject 2s latency on the postgres proxy to assert the circuit breaker
# opens and the app falls back to read-through cache.
set -euo pipefail

TOXIPROXY_HOST="${TOXIPROXY_HOST:-localhost:8474}"

echo "[chaos] adding 2s latency to postgres proxy"
curl -sf -X POST "http://${TOXIPROXY_HOST}/proxies/postgres/toxics" \
  -H 'Content-Type: application/json' \
  -d '{"name":"pg-latency","type":"latency","stream":"downstream","attributes":{"latency":2000,"jitter":250}}'

echo "[chaos] latency installed — hold 60s then remove"
trap 'curl -sf -X DELETE "http://${TOXIPROXY_HOST}/proxies/postgres/toxics/pg-latency" && echo "[chaos] cleared"' EXIT
sleep 60
