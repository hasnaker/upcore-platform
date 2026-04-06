-- =============================================================================
-- rls_policies.sql
-- Row-Level Security policies for all tenant-scoped tables
-- Run AFTER all table migrations (001 - 020).
-- Policy: every row must match current_setting('app.tenant_id')::uuid
-- Exception: tables where tenant_id can be NULL (global catalog) allow NULL match.
-- =============================================================================

-- Helper: apply standard tenant isolation policy -----------------------------
CREATE OR REPLACE FUNCTION app._apply_tenant_rls(p_schema text, p_table text, p_allow_global boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_qual text;
BEGIN
    EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY;', p_schema, p_table);
    EXECUTE format('ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY;', p_schema, p_table);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I.%I;', p_schema, p_table);

    IF p_allow_global THEN
        v_qual := '(tenant_id IS NULL OR tenant_id = app.current_tenant_id())';
    ELSE
        v_qual := '(tenant_id = app.current_tenant_id())';
    END IF;

    EXECUTE format(
        'CREATE POLICY tenant_isolation ON %I.%I AS PERMISSIVE FOR ALL USING (%s) WITH CHECK (%s);',
        p_schema, p_table, v_qual,
        CASE WHEN p_allow_global
             THEN '(tenant_id IS NULL OR tenant_id = app.current_tenant_id())'
             ELSE '(tenant_id = app.current_tenant_id())' END
    );
END$$;

-- app.* tables ----------------------------------------------------------------
-- NOTE: app.tenants is special: row's PK = id matches app.current_tenant_id().
ALTER TABLE app.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.tenants FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON app.tenants;
CREATE POLICY tenant_isolation ON app.tenants AS PERMISSIVE FOR ALL
    USING (id = app.current_tenant_id())
    WITH CHECK (id = app.current_tenant_id());

SELECT app._apply_tenant_rls('app','users');
SELECT app._apply_tenant_rls('app','roles', true);             -- global roles allowed
SELECT app._apply_tenant_rls('app','user_role_assignments');
SELECT app._apply_tenant_rls('app','departments');
SELECT app._apply_tenant_rls('app','position_definitions');
SELECT app._apply_tenant_rls('app','employees');
SELECT app._apply_tenant_rls('app','employment_history');
SELECT app._apply_tenant_rls('app','employee_contacts');
SELECT app._apply_tenant_rls('app','employee_dependents');
SELECT app._apply_tenant_rls('app','leave_types', true);       -- global leave types allowed
SELECT app._apply_tenant_rls('app','leave_requests');
SELECT app._apply_tenant_rls('app','leave_balances');
SELECT app._apply_tenant_rls('app','documents');
SELECT app._apply_tenant_rls('app','document_versions');
SELECT app._apply_tenant_rls('app','open_positions');
SELECT app._apply_tenant_rls('app','candidates');
SELECT app._apply_tenant_rls('app','applications');
SELECT app._apply_tenant_rls('app','assessments');
SELECT app._apply_tenant_rls('app','assessment_sessions');
SELECT app._apply_tenant_rls('app','assessment_responses');
SELECT app._apply_tenant_rls('app','assessment_scores');
SELECT app._apply_tenant_rls('app','surveys');
SELECT app._apply_tenant_rls('app','survey_invitations');
SELECT app._apply_tenant_rls('app','survey_responses');
SELECT app._apply_tenant_rls('app','burnout_signals');
SELECT app._apply_tenant_rls('app','interventions', true);     -- global catalog allowed
SELECT app._apply_tenant_rls('app','intervention_assignments');
SELECT app._apply_tenant_rls('app','intervention_outcomes');
SELECT app._apply_tenant_rls('app','internal_positions');
SELECT app._apply_tenant_rls('app','career_paths');
SELECT app._apply_tenant_rls('app','mobility_requests');
SELECT app._apply_tenant_rls('app','notification_templates', true); -- global templates allowed
SELECT app._apply_tenant_rls('app','notification_channels');
SELECT app._apply_tenant_rls('app','notifications');
SELECT app._apply_tenant_rls('app','notification_preferences');

-- ml.* tables -----------------------------------------------------------------
SELECT app._apply_tenant_rls('ml','effectiveness_posteriors', true);

-- Public instruments / items / norm_tables are non-tenant scoped: skip RLS.

-- audit.events — read-only via RLS for app; inserts only via trigger ----------
ALTER TABLE audit.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_events_select ON audit.events;
DROP POLICY IF EXISTS audit_events_insert ON audit.events;
CREATE POLICY audit_events_select ON audit.events AS PERMISSIVE FOR SELECT
    USING (tenant_id IS NULL OR tenant_id = app.current_tenant_id());
-- INSERT allowed (via trigger). tenant_id must match current or be NULL; trigger supplies row's tenant_id.
CREATE POLICY audit_events_insert ON audit.events AS PERMISSIVE FOR INSERT
    WITH CHECK (true);
-- No UPDATE/DELETE policy; FORCE RLS + immutable_row() trigger blocks modifications.

-- Grant SELECT on audit.events to upcore_app (RLS still filters rows)
GRANT SELECT ON audit.events TO upcore_app;
GRANT INSERT ON audit.events TO upcore_app;  -- trigger inserts via user session

-- Grant usage on schemas to application role ----------------------------------
GRANT USAGE ON SCHEMA app, ml, audit TO upcore_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA app TO upcore_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ml TO upcore_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO upcore_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ml TO upcore_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA audit TO upcore_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO upcore_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA ml  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO upcore_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT USAGE, SELECT ON SEQUENCES TO upcore_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA ml  GRANT USAGE, SELECT ON SEQUENCES TO upcore_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA audit GRANT USAGE, SELECT ON SEQUENCES TO upcore_app;

-- upcore_admin (BYPASSRLS) for migrations -------------------------------------
GRANT ALL ON SCHEMA app, ml, audit TO upcore_admin;
GRANT ALL ON ALL TABLES IN SCHEMA app, ml, audit TO upcore_admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA app, ml, audit TO upcore_admin;
