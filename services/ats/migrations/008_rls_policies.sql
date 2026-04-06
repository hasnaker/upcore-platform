-- 008_rls_policies.sql
-- Row-Level Security policies for the ATS service.
-- Tenant isolation via app.tenant_id GUC set per-session/transaction.

-- Enable RLS on all tables.
ALTER TABLE app.requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.application_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.pipeline_stages ENABLE ROW LEVEL SECURITY;

-- Requisitions
CREATE POLICY requisitions_tenant_isolation ON app.requisitions
    USING (tenant_id = current_setting('app.tenant_id')::UUID)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);

-- Candidates
CREATE POLICY candidates_tenant_isolation ON app.candidates
    USING (tenant_id = current_setting('app.tenant_id')::UUID)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);

-- Applications
CREATE POLICY applications_tenant_isolation ON app.applications
    USING (tenant_id = current_setting('app.tenant_id')::UUID)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);

-- Application Events
CREATE POLICY app_events_tenant_isolation ON app.application_events
    USING (tenant_id = current_setting('app.tenant_id')::UUID)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);

-- Interviews
CREATE POLICY interviews_tenant_isolation ON app.interviews
    USING (tenant_id = current_setting('app.tenant_id')::UUID)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);

-- Offers
CREATE POLICY offers_tenant_isolation ON app.offers
    USING (tenant_id = current_setting('app.tenant_id')::UUID)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);

-- Pipeline Stages
CREATE POLICY stages_tenant_isolation ON app.pipeline_stages
    USING (tenant_id = current_setting('app.tenant_id')::UUID)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::UUID);
