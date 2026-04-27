-- =============================================================================
-- 053_intervention_consent_log.up.sql
-- Append-only audit log for every intervention consent action
-- (Koruma P1 — çalışan consent akışı için yasal ispat tablosu).
--
-- Her çalışanın bir müdahale atamasına verdiği yanıt (grant / decline / revoke)
-- bu tabloya yazılır. UPDATE / DELETE yasak (immutable_row).
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS app.intervention_consent_log (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    assignment_id   uuid NOT NULL REFERENCES app.intervention_assignments(id) ON DELETE CASCADE,
    employee_id     uuid NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
    action          varchar(20) NOT NULL
                    CHECK (action IN ('granted','declined','revoked')),
    reason          text,
    actor_ip        varchar(64),
    user_agent      text,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_int_consent_log_assignment
    ON app.intervention_consent_log (assignment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_int_consent_log_employee
    ON app.intervention_consent_log (tenant_id, employee_id, created_at DESC);

-- RLS tenant isolation
ALTER TABLE app.intervention_consent_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS intervention_consent_log_tenant_iso ON app.intervention_consent_log;
CREATE POLICY intervention_consent_log_tenant_iso ON app.intervention_consent_log
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

-- Immutable append-only
DROP TRIGGER IF EXISTS trg_intervention_consent_log_no_update ON app.intervention_consent_log;
CREATE TRIGGER trg_intervention_consent_log_no_update
    BEFORE UPDATE ON app.intervention_consent_log
    FOR EACH ROW EXECUTE FUNCTION app.immutable_row();

DROP TRIGGER IF EXISTS trg_intervention_consent_log_no_delete ON app.intervention_consent_log;
CREATE TRIGGER trg_intervention_consent_log_no_delete
    BEFORE DELETE ON app.intervention_consent_log
    FOR EACH ROW EXECUTE FUNCTION app.immutable_row();

COMMENT ON TABLE app.intervention_consent_log IS
    'Koruma modülü consent akışı — çalışanın bir müdahale atamasına verdiği cevap (append-only, 7 yıl KVKK).';

COMMIT;
