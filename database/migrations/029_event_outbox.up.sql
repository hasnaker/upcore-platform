-- =============================================================================
-- 029_event_outbox.up.sql
-- Transactional outbox pattern: iş değişikliği ile event yayını arasındaki
-- consistency'yi garantiler (classic "DB commit + broker down → event kayıp"
-- senaryosunu ortadan kaldırır).
--
-- Akış:
--   1. Service layer aynı tx içinde iş değişikliği + outbox satırı INSERT'ler.
--   2. Arka plan dispatcher unpublished satırları okur, Service Bus'a gönderir,
--      başarılı olanları dispatched=TRUE + dispatched_at=NOW() olarak markalar.
--   3. MessageID = outbox.id → Service Bus duplicate detection idempotent.
--
-- At-least-once semantiği: subscriber tarafta idempotent consumer gerekir.
-- =============================================================================

SET search_path TO app, public;

CREATE TABLE IF NOT EXISTS app.event_outbox (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      UUID        NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    service_name   TEXT        NOT NULL,  -- "bordro", "employee", vb.
    event_type     TEXT        NOT NULL,  -- "bordro.run.calculated.v1"
    aggregate_id   UUID,                  -- ilgili iş nesnesi (run_id, employee_id…)
    payload        JSONB       NOT NULL,
    -- Dispatch durumu
    dispatched     BOOLEAN     NOT NULL DEFAULT FALSE,
    dispatched_at  TIMESTAMPTZ,
    attempts       INT         NOT NULL DEFAULT 0,
    last_error     TEXT,
    -- Zaman damgaları
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Dispatcher hızlı polling için partial index
CREATE INDEX IF NOT EXISTS idx_event_outbox_pending
    ON app.event_outbox (created_at)
    WHERE dispatched = FALSE;

-- Troubleshoot + retention sorguları için
CREATE INDEX IF NOT EXISTS idx_event_outbox_tenant_type
    ON app.event_outbox (tenant_id, event_type);

ALTER TABLE app.event_outbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY event_outbox_tenant_isolation ON app.event_outbox
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

-- Dispatcher worker'ı tenant bypass ile çalıştırmalı → özel rol/policy ileride.
-- Şimdilik dispatcher sqlx.BeginTxx + set_config ile her tenant için çalışıyor.

DROP TRIGGER IF EXISTS trg_event_outbox_updated_at ON app.event_outbox;
CREATE TRIGGER trg_event_outbox_updated_at
    BEFORE UPDATE ON app.event_outbox
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- Retention: dispatched=TRUE + 30 gün sonra silinebilir (retention_policies ile)
INSERT INTO app.retention_policies (name, table_name, retention_days, where_clause)
VALUES
    ('event_outbox_dispatched_30d', 'app.event_outbox', 30,
     'dispatched = TRUE AND dispatched_at < NOW() - INTERVAL ''30 days''')
ON CONFLICT (name) DO NOTHING;

COMMENT ON TABLE app.event_outbox IS
    'Transactional outbox: DB tx'i içinde kaydedilen, background dispatcher'ın broker''a yolladığı event''ler. At-least-once garantisi, idempotent consumer zorunlu.';
