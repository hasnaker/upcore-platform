-- =============================================================================
-- 019_audit_events.down.sql
-- =============================================================================
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'app.tenants','app.users','app.employees','app.assessments',
        'app.intervention_assignments','app.leave_requests','app.documents'
    ]) LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_change ON %s;', t);
    END LOOP;
END$$;

DROP FUNCTION IF EXISTS audit.log_row_change();
DROP TABLE IF EXISTS audit.events CASCADE;
