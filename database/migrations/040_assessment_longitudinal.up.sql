-- 040_assessment_longitudinal.up.sql
-- Longitudinal assessment tracking: aynı çalışanın 6/12 ay boyunca BAT/
-- COPSOQ skorlarını karşılaştırma için ek snapshot tablosu.

CREATE TABLE IF NOT EXISTS app.assessment_snapshots (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL,
    employee_id     uuid NOT NULL,
    instrument      varchar(40) NOT NULL,  -- BAT-12-TR, COPSOQ-III-TR, ...
    snapshot_date   date NOT NULL,
    overall_score   numeric(6, 2),
    percentile      integer,
    t_score         numeric(5, 2),
    risk_band       varchar(20),           -- low/medium/high/critical
    sub_scores      jsonb NOT NULL DEFAULT '{}'::jsonb,
    assessment_id   uuid,                  -- kaynak assessment (varsa)
    created_at      timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, employee_id, instrument, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_assessment_snapshots_employee_date
    ON app.assessment_snapshots (tenant_id, employee_id, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_assessment_snapshots_instrument
    ON app.assessment_snapshots (tenant_id, instrument, snapshot_date DESC);

ALTER TABLE app.assessment_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY assessment_snapshots_rls ON app.assessment_snapshots
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- Bulk assessment invitation: IK tek seferde bir cohort'a atama yapar.
CREATE TABLE IF NOT EXISTS app.assessment_bulk_invitations (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      uuid NOT NULL,
    instrument     varchar(40) NOT NULL,
    audience_filter jsonb NOT NULL,  -- {"status":"active","department_id":"..."}
    invited_count  integer NOT NULL DEFAULT 0,
    completed_count integer NOT NULL DEFAULT 0,
    expires_at     timestamptz,
    created_by     uuid NOT NULL,
    created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app.assessment_bulk_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY assessment_bulk_invitations_rls ON app.assessment_bulk_invitations
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

COMMENT ON TABLE app.assessment_snapshots IS 'Longitudinal — aynı kişinin farklı tarihlerdeki skorlarının snapshotu (trend için)';
COMMENT ON TABLE app.assessment_bulk_invitations IS 'IK toplu envanter davet — cohort-based; background job tek tek assessment oluşturur';
