-- =============================================================================
-- 025_bordro.down.sql
-- Rollback: Bordro motoru
-- =============================================================================

SET search_path TO app, public;

DELETE FROM app.retention_policies WHERE name IN ('payroll_slips_10y','sgk_bildirge_10y');

DO $$
DECLARE
    t text;
    tables text[] := ARRAY['payroll_periods','payroll_runs','payroll_slips','sgk_bildirgeleri'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON app.%s', t, t);
    END LOOP;
END$$;

DROP TABLE IF EXISTS app.sgk_bildirgeleri       CASCADE;
DROP TABLE IF EXISTS app.payroll_tax_brackets   CASCADE;
DROP TABLE IF EXISTS app.payroll_slip_items     CASCADE;
DROP TABLE IF EXISTS app.payroll_slips          CASCADE;
DROP TABLE IF EXISTS app.payroll_runs           CASCADE;
DROP TABLE IF EXISTS app.payroll_periods        CASCADE;
