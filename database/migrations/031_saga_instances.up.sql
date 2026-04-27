-- 031_saga_instances.up.sql
-- Saga pattern persistence — cross-service orchestration (onboarding, offboarding).
-- Tek bir saga instance bir dizi step (örn. offer.accepted → employee.create
-- → onboarding.start → career.append) çalıştırır; hata durumunda compensation
-- chain ters yönde tetiklenir.

CREATE TABLE IF NOT EXISTS app.saga_instances (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL,
    saga_name           varchar(100) NOT NULL,   -- ör. onboarding_v1, offboarding_v1
    correlation_id      varchar(200),            -- tetikleyen event id (idempotency)
    aggregate_id        uuid,                    -- ilgili ana entity (örn. employee.id)
    current_step        integer NOT NULL DEFAULT 0,
    total_steps         integer NOT NULL,
    status              varchar(32) NOT NULL DEFAULT 'running'
                        CHECK (status IN ('running', 'completed', 'failed', 'compensating', 'compensated')),
    payload             jsonb NOT NULL DEFAULT '{}'::jsonb,
    last_error          text,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    completed_at        timestamptz
);

CREATE INDEX IF NOT EXISTS idx_saga_instances_tenant
    ON app.saga_instances (tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_saga_instances_running
    ON app.saga_instances (updated_at)
    WHERE status IN ('running', 'compensating');

CREATE UNIQUE INDEX IF NOT EXISTS uq_saga_correlation
    ON app.saga_instances (tenant_id, saga_name, correlation_id)
    WHERE correlation_id IS NOT NULL;

ALTER TABLE app.saga_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY saga_instances_rls ON app.saga_instances
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- Step log — her adımın durumu (yürütüldü, hata, compensate edildi).
CREATE TABLE IF NOT EXISTS app.saga_steps (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    saga_instance_id    uuid NOT NULL REFERENCES app.saga_instances(id) ON DELETE CASCADE,
    step_index          integer NOT NULL,
    step_name           varchar(100) NOT NULL,
    direction           varchar(16) NOT NULL CHECK (direction IN ('execute', 'compensate')),
    status              varchar(32) NOT NULL
                        CHECK (status IN ('pending', 'success', 'failed')),
    attempts            integer NOT NULL DEFAULT 0,
    request_payload     jsonb,
    response_payload    jsonb,
    error_message       text,
    started_at          timestamptz,
    finished_at         timestamptz,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saga_steps_instance
    ON app.saga_steps (saga_instance_id, step_index);

COMMENT ON TABLE app.saga_instances IS 'Saga pattern orchestration — cross-service tx. Hata durumunda compensation chain.';
COMMENT ON TABLE app.saga_steps IS 'Individual saga step execution log (audit trail for observability).';
