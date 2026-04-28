-- 007_rls_policies.sql
-- Row-level security policies for tenant isolation.

-- Enable RLS on all audit tables.
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE kvkk_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE kvkk_dsr_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_exports ENABLE ROW LEVEL SECURITY;

-- Policy: app.tenant_id GUC must match row tenant_id.
-- The GUC is set per-transaction by db.SetTenantRLS().
--
-- Idempotent: DROP POLICY IF EXISTS + CREATE POLICY pattern (CREATE POLICY
-- IF NOT EXISTS Azure Flexible Server PG 16'da reject ediliyor).

DROP POLICY IF EXISTS tenant_isolation_audit_events ON audit_events;
CREATE POLICY tenant_isolation_audit_events
    ON audit_events
    USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

DROP POLICY IF EXISTS tenant_isolation_kvkk_access_log ON kvkk_access_log;
CREATE POLICY tenant_isolation_kvkk_access_log
    ON kvkk_access_log
    USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

DROP POLICY IF EXISTS tenant_isolation_dsr_requests ON kvkk_dsr_requests;
CREATE POLICY tenant_isolation_dsr_requests
    ON kvkk_dsr_requests
    USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

DROP POLICY IF EXISTS tenant_isolation_exports ON audit_exports;
CREATE POLICY tenant_isolation_exports
    ON audit_exports
    USING (tenant_id = current_setting('app.tenant_id', true)::UUID);

-- Service role bypasses RLS (used by backend services).
-- In production, a separate DB role 'audit_service' is used with BYPASSRLS.
