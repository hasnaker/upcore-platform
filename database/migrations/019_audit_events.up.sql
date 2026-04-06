-- =============================================================================
-- 019_audit_events.up.sql
-- Immutable audit log — partitioned by month, append-only
-- =============================================================================

CREATE TABLE audit.events (
    id              bigserial NOT NULL,
    tenant_id       uuid,
    user_id         uuid,
    actor_role      varchar(60),
    action          varchar(80) NOT NULL,
    resource_type   varchar(80) NOT NULL,
    resource_id     uuid,
    resource_key    varchar(200),
    ip              inet,
    user_agent      text,
    request_id      varchar(80),
    status          varchar(20) NOT NULL DEFAULT 'success'
                    CHECK (status IN ('success','failure','denied','error')),
    payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
    diff            jsonb,
    occurred_at     timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);

CREATE INDEX idx_audit_events_tenant_time  ON audit.events (tenant_id, occurred_at DESC);
CREATE INDEX idx_audit_events_user_time    ON audit.events (user_id, occurred_at DESC);
CREATE INDEX idx_audit_events_resource     ON audit.events (resource_type, resource_id);
CREATE INDEX idx_audit_events_action       ON audit.events (action, occurred_at DESC);
CREATE INDEX idx_audit_events_actor_role   ON audit.events (actor_role, action);
CREATE INDEX idx_audit_events_payload_gin  ON audit.events USING gin (payload);

-- Default partition
CREATE TABLE audit.events_default PARTITION OF audit.events DEFAULT;

-- Monthly partitions: current-3 .. current+12
DO $$
DECLARE
    v_start date := date_trunc('month', CURRENT_DATE - interval '3 months')::date;
    v_month date;
    v_next  date;
    v_name  text;
BEGIN
    FOR i IN 0..15 LOOP
        v_month := (v_start + (i || ' months')::interval)::date;
        v_next  := (v_month + interval '1 month')::date;
        v_name  := 'events_' || to_char(v_month, 'YYYY_MM');
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS audit.%I PARTITION OF audit.events FOR VALUES FROM (%L) TO (%L);',
            v_name, v_month::timestamptz, v_next::timestamptz
        );
    END LOOP;
END$$;

-- Immutability triggers (block UPDATE and DELETE) -----------------------------
CREATE TRIGGER trg_audit_events_no_update
    BEFORE UPDATE ON audit.events
    FOR EACH ROW EXECUTE FUNCTION app.immutable_row();

CREATE TRIGGER trg_audit_events_no_delete
    BEFORE DELETE ON audit.events
    FOR EACH ROW EXECUTE FUNCTION app.immutable_row();

-- Generic audit trigger function (SECURITY DEFINER so inserts bypass FORCE RLS on audit.events)
CREATE OR REPLACE FUNCTION audit.log_row_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, app, pg_temp
AS $$
DECLARE
    v_tenant uuid;
    v_resource_id uuid;
    v_payload jsonb;
    v_diff jsonb;
    v_action text;
BEGIN
    v_action := lower(TG_OP);
    v_tenant := app.current_tenant_id();

    IF TG_OP = 'DELETE' THEN
        v_resource_id := (to_jsonb(OLD) ->> 'id')::uuid;
        v_payload := to_jsonb(OLD);
    ELSIF TG_OP = 'UPDATE' THEN
        v_resource_id := (to_jsonb(NEW) ->> 'id')::uuid;
        v_payload := to_jsonb(NEW);
        v_diff := jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW));
    ELSE
        v_resource_id := (to_jsonb(NEW) ->> 'id')::uuid;
        v_payload := to_jsonb(NEW);
    END IF;

    -- Prefer row's tenant_id over session value
    IF v_payload ? 'tenant_id' AND v_payload ->> 'tenant_id' IS NOT NULL THEN
        v_tenant := (v_payload ->> 'tenant_id')::uuid;
    END IF;

    INSERT INTO audit.events (tenant_id, action, resource_type, resource_id, payload, diff, occurred_at)
    VALUES (
        v_tenant,
        v_action || '.' || TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
        TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
        v_resource_id,
        v_payload,
        v_diff,
        now()
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END$$;

-- Attach audit trigger to protected tables ------------------------------------
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'app.tenants',
        'app.users',
        'app.employees',
        'app.assessments',
        'app.intervention_assignments',
        'app.leave_requests',
        'app.documents'
    ]) LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_change ON %s;', t);
        EXECUTE format('CREATE TRIGGER trg_audit_change AFTER INSERT OR UPDATE OR DELETE ON %s FOR EACH ROW EXECUTE FUNCTION audit.log_row_change();', t);
    END LOOP;
END$$;

COMMENT ON TABLE audit.events IS 'Immutable audit log — append-only, partitioned monthly.';
COMMENT ON FUNCTION audit.log_row_change() IS 'Generic trigger that logs INSERT/UPDATE/DELETE into audit.events.';
