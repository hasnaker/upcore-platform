---
id: coklu-tenant
title: "Çoklu tenant (multi-tenant)"
sidebar_position: 3
---

# Çoklu tenant (multi-tenant) modeli

UpCore **shared database, shared schema** multi-tenancy kullanır.

## Tenant izolasyonu

Her tablo:
- `tenant_id UUID NOT NULL` sütunu
- **Row-Level Security (RLS)** policy: `WHERE tenant_id = current_setting('app.current_tenant_id')`
- Index: `(tenant_id, ...)` leading her sorgu için

## Connection management

Her istek:
1. JWT/API key'den tenant_id çıkarılır
2. Connection pool'dan connection al
3. `SET LOCAL app.current_tenant_id = '...'`
4. Sorgu çalıştır — RLS otomatik filtre
5. Connection geri ver

## Cross-tenant erişim

Çok nadir — sadece:
- Admin panelden super_admin rolü
- Billing rapor
- Anonim agrega analytics

Her cross-tenant sorgu audit log'a yazılır.

## Bypass önleme

- SQL injection: Parameterized queries zorunlu
- RLS bypass: PostgreSQL `FORCE ROW LEVEL SECURITY`
- Admin account: Ayrı database credential
- Audit: Anomali tespiti

## Performans

- Tenant başına table prefix yok (tek shared tablo)
- Partitioning bazı büyük tablolar için (pulse_responses, audit_log)
- Vacuum schedule her tenant için ayrı
