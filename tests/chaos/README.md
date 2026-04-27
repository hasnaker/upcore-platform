# Chaos Tests

Bu dizin `toxiproxy` aracılığıyla UpCore stack'ine network-layer arızaları enjekte eder ve sistemin circuit breaker + idempotency + retry mekanizmalarının çalıştığını doğrular.

## Çalıştırma

```bash
docker compose -f tests/chaos/docker-compose.chaos.yml up -d
bash tests/chaos/scenarios/db_latency_2s.sh
bash tests/chaos/scenarios/packet_loss_5pct.sh redis
bash tests/chaos/scenarios/bandwidth_limit.sh ml-burnout 100
```

Go tarafı testler `chaos` build tag'i ile:

```bash
CHAOS_API_BASE=http://localhost:8080 CHAOS_TOKEN=... go test -tags chaos ./tests/chaos/...
```

## Ölçüm kriterleri

| Senaryo | Beklenen davranış |
|---------|------------------|
| DB 2s latency | Circuit breaker 5s içinde açılır, 503 yerine cached response döner |
| Redis 5% packet loss | Dispatcher retry ile 3 denemede başarılı olur |
| ML 100KB/s bandwidth | İnference p95 < 2s kalır, timeout ile degrade olur |
| Idempotency replay | İkinci POST 200 OK + aynı response döner |
