-- ============================================================================
-- 021_mobility.up.sql — Mobility service tables
--   internal_rotations, career_paths, career_path_steps,
--   succession_plans, succession_candidates
-- ============================================================================

SET search_path TO app, public;

-- ---- Internal rotations ----------------------------------------------------
CREATE TABLE IF NOT EXISTS internal_rotations (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    employee_id           UUID        NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    from_position_id      UUID        NOT NULL REFERENCES app.position_definitions(id),
    to_position_id        UUID        NOT NULL REFERENCES app.position_definitions(id),
    from_department_id    UUID        NOT NULL REFERENCES departments(id),
    to_department_id      UUID        NOT NULL REFERENCES departments(id),
    status                TEXT        NOT NULL DEFAULT 'proposed'
                                      CHECK (status IN ('proposed','approved','rejected','active','completed','cancelled')),
    reason_tr             TEXT        NOT NULL DEFAULT '',
    start_date            DATE,
    end_date              DATE,
    approved_by_id        UUID        REFERENCES users(id),
    approved_at           TIMESTAMPTZ,
    requested_by_id       UUID        NOT NULL REFERENCES users(id),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rotations_tenant_employee ON internal_rotations (tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_rotations_tenant_status   ON internal_rotations (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_rotations_to_dept         ON internal_rotations (tenant_id, to_department_id);

-- ---- Career paths ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS career_paths (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name_tr          TEXT        NOT NULL,
    description_tr   TEXT        NOT NULL DEFAULT '',
    discipline       TEXT        NOT NULL,
    is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, name_tr)
);

CREATE INDEX IF NOT EXISTS idx_career_paths_tenant_active     ON career_paths (tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_career_paths_tenant_discipline ON career_paths (tenant_id, discipline);

-- ---- Career path steps -----------------------------------------------------
CREATE TABLE IF NOT EXISTS career_path_steps (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    path_id            UUID        NOT NULL REFERENCES career_paths(id) ON DELETE CASCADE,
    step_order         INT         NOT NULL CHECK (step_order >= 0),
    position_id        UUID        NOT NULL REFERENCES app.position_definitions(id),
    title_tr           TEXT        NOT NULL,
    min_tenure_months  INT         NOT NULL DEFAULT 0 CHECK (min_tenure_months >= 0),
    criteria_tr        TEXT        NOT NULL DEFAULT '',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (path_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_career_path_steps_path ON career_path_steps (path_id, step_order);

-- ---- Succession plans ------------------------------------------------------
CREATE TABLE IF NOT EXISTS succession_plans (
    id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id              UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    position_id            UUID        NOT NULL REFERENCES app.position_definitions(id),
    incumbent_employee_id  UUID        NOT NULL REFERENCES employees(id),
    risk_level             TEXT        NOT NULL DEFAULT 'low'
                                        CHECK (risk_level IN ('low','medium','high','critical')),
    criticality_tr         TEXT        NOT NULL DEFAULT '',
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, position_id)
);

CREATE INDEX IF NOT EXISTS idx_succession_plans_tenant_risk ON succession_plans (tenant_id, risk_level);

-- ---- Succession candidates -------------------------------------------------
CREATE TABLE IF NOT EXISTS succession_candidates (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id                 UUID        NOT NULL REFERENCES succession_plans(id) ON DELETE CASCADE,
    candidate_employee_id   UUID        NOT NULL REFERENCES employees(id),
    readiness               TEXT        NOT NULL DEFAULT 'ready_2y'
                                         CHECK (readiness IN ('ready_now','ready_1y','ready_2y')),
    fit_score               DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (fit_score >= 0 AND fit_score <= 100),
    gaps_tr                 TEXT        NOT NULL DEFAULT '',
    rank                    INT         NOT NULL DEFAULT 1 CHECK (rank >= 1),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (plan_id, candidate_employee_id)
);

CREATE INDEX IF NOT EXISTS idx_succession_candidates_plan_rank ON succession_candidates (plan_id, rank);

-- ---- Row-level security ----------------------------------------------------
ALTER TABLE internal_rotations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_paths           ENABLE ROW LEVEL SECURITY;
ALTER TABLE succession_plans       ENABLE ROW LEVEL SECURITY;

CREATE POLICY internal_rotations_tenant_isolation ON internal_rotations
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY career_paths_tenant_isolation ON career_paths
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY succession_plans_tenant_isolation ON succession_plans
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

-- career_path_steps and succession_candidates are scoped via parent FK,
-- so no direct RLS needed (accesed only via joins with RLS-enabled parents).

-- ---- updated_at triggers ---------------------------------------------------
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_internal_rotations_updated_at ON internal_rotations;
CREATE TRIGGER trg_internal_rotations_updated_at
    BEFORE UPDATE ON internal_rotations
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_career_paths_updated_at ON career_paths;
CREATE TRIGGER trg_career_paths_updated_at
    BEFORE UPDATE ON career_paths
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_succession_plans_updated_at ON succession_plans;
CREATE TRIGGER trg_succession_plans_updated_at
    BEFORE UPDATE ON succession_plans
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

DROP TRIGGER IF EXISTS trg_succession_candidates_updated_at ON succession_candidates;
CREATE TRIGGER trg_succession_candidates_updated_at
    BEFORE UPDATE ON succession_candidates
    FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
