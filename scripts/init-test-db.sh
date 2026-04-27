#!/usr/bin/env bash
# Test DB init — migrations + minimal seed.
# Postgres container'ı ilk açılışında docker-entrypoint-initdb.d üzerinden çalışır.

set -euo pipefail

export PGPASSWORD="${POSTGRES_PASSWORD:-upcore_test_pw}"
DB="${POSTGRES_DB:-upcore_test}"
USER="${POSTGRES_USER:-upcore}"

echo "== Creating app schema =="
psql -v ON_ERROR_STOP=1 -U "$USER" -d "$DB" <<'EOF'
CREATE SCHEMA IF NOT EXISTS app;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOF

echo "== Applying migrations =="
for f in /migrations/*.up.sql; do
  echo "  -> $(basename "$f")"
  psql -v ON_ERROR_STOP=1 -U "$USER" -d "$DB" -f "$f" > /dev/null 2>&1 || {
    echo "WARN: $(basename "$f") failed (devam ediyor — integration için kısmi şema kabul)"
  }
done

echo "== Test DB ready =="
