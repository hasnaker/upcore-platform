-- =============================================================================
-- 024_performance.up.sql
-- V3 Dalga 1.3: Performans modülü
--   - performance_cycles         (çeyreklik/yıllık dönem)
--   - performance_goals          (hedefler — SMART)
--   - okrs + okr_key_results     (OKR metodolojisi)
--   - performance_reviews        (yöneticiye değerlendirme)
--   - review_feedback            (360° çok-kaynaklı feedback)
--   - nine_box_assignments       (yetenek × performans matrisi)
--   - calibration_sessions       (İK kalibrasyon toplantıları)
-- =============================================================================

SET search_path TO app, public;

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Performance Cycles
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app.performance_cycles (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID        NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    name_tr          TEXT        NOT NULL,
    cycle_type       TEXT        NOT NULL
                                 CHECK (cycle_type IN ('monthly','quarterly','biannual','annual','custom')),
    period_start     DATE        NOT NULL,
    period_end       DATE        NOT NULL CHECK (period_end >= period_start),
    goal_setting_start DATE,
    goal_setting_end   DATE,
    review_start     DATE,
    review_end       DATE,
    status           TEXT        NOT NULL DEFAULT 'planning'
                                 CHECK (status IN ('planning','goal_setting','active','in_review','calibration','closed','archived')),
    description      TEXT,
    created_by       UUID,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, name_tr, period_start)
);

CREATE INDEX IF NOT EXISTS idx_perf_cycles_tenant_status ON app.performance_cycles (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_perf_cycles_tenant_period ON app.performance_cycles (tenant_id, period_start, period_end);

ALTER TABLE app.performance_cycles ENABLE ROW LEVEL SECURITY;
CREATE POLICY perf_cycles_tenant_isolation ON app.performance_cycles
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Performance Goals (SMART)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app.performance_goals (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID        NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    cycle_id         UUID        NOT NULL REFERENCES app.performance_cycles(id) ON DELETE CASCADE,
    employee_id      UUID        NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
    category         TEXT        NOT NULL
                                 CHECK (category IN ('individual','team','strategic','development','behavioral')),
    title_tr         TEXT        NOT NULL,
    description      TEXT,
    metric_type      TEXT        NOT NULL
                                 CHECK (metric_type IN ('numeric','percentage','boolean','milestone','qualitative')),
    target_value     NUMERIC(12,2),
    current_value    NUMERIC(12,2) NOT NULL DEFAULT 0,
    unit             TEXT,
    weight_pct       INT         NOT NULL DEFAULT 0 CHECK (weight_pct BETWEEN 0 AND 100),
    due_date         DATE,
    status           TEXT        NOT NULL DEFAULT 'draft'
                                 CHECK (status IN ('draft','active','at_risk','on_track','completed','missed','deferred','cancelled')),
    progress_pct     INT         NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
    aligned_with_id  UUID        REFERENCES app.performance_goals(id),
    manager_id       UUID,
    metadata         JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perf_goals_tenant_cycle_employee ON app.performance_goals (tenant_id, cycle_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_perf_goals_tenant_status ON app.performance_goals (tenant_id, status);

ALTER TABLE app.performance_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY perf_goals_tenant_isolation ON app.performance_goals
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

-- ───────────────────────────────────────────────────────────────────────────
-- 3. OKRs + Key Results
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app.okrs (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID        NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    cycle_id         UUID        NOT NULL REFERENCES app.performance_cycles(id) ON DELETE CASCADE,
    owner_type       TEXT        NOT NULL
                                 CHECK (owner_type IN ('company','department','team','individual')),
    owner_id         UUID,  -- employee_id / department_id / null (company)
    parent_okr_id    UUID        REFERENCES app.okrs(id) ON DELETE SET NULL,
    objective_tr     TEXT        NOT NULL,
    description      TEXT,
    quarter_label    TEXT,
    confidence_score INT         CHECK (confidence_score BETWEEN 0 AND 100),
    status           TEXT        NOT NULL DEFAULT 'draft'
                                 CHECK (status IN ('draft','active','on_track','at_risk','off_track','completed','abandoned')),
    progress_pct     INT         NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
    created_by       UUID,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_okrs_tenant_cycle ON app.okrs (tenant_id, cycle_id);
CREATE INDEX IF NOT EXISTS idx_okrs_tenant_owner ON app.okrs (tenant_id, owner_type, owner_id);

ALTER TABLE app.okrs ENABLE ROW LEVEL SECURITY;
CREATE POLICY okrs_tenant_isolation ON app.okrs
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

CREATE TABLE IF NOT EXISTS app.okr_key_results (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    okr_id           UUID        NOT NULL REFERENCES app.okrs(id) ON DELETE CASCADE,
    title_tr         TEXT        NOT NULL,
    metric_type      TEXT        NOT NULL
                                 CHECK (metric_type IN ('numeric','percentage','boolean','milestone')),
    start_value      NUMERIC(12,2) NOT NULL DEFAULT 0,
    target_value     NUMERIC(12,2) NOT NULL,
    current_value    NUMERIC(12,2) NOT NULL DEFAULT 0,
    unit             TEXT,
    owner_id         UUID,
    progress_pct     INT         NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
    confidence_score INT         CHECK (confidence_score BETWEEN 0 AND 100),
    status           TEXT        NOT NULL DEFAULT 'active'
                                 CHECK (status IN ('active','on_track','at_risk','off_track','completed','dropped')),
    order_index      INT         NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_okr_krs_okr ON app.okr_key_results (okr_id);

COMMENT ON TABLE app.okrs IS 'OKR — şirket, departman, bireysel hedefler. parent_okr_id hiyerarşi için.';

-- ───────────────────────────────────────────────────────────────────────────
-- 4. Performance Reviews (manager → employee)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app.performance_reviews (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          UUID        NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    cycle_id           UUID        NOT NULL REFERENCES app.performance_cycles(id) ON DELETE CASCADE,
    employee_id        UUID        NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
    reviewer_id        UUID        NOT NULL,  -- manager employee_id
    review_type        TEXT        NOT NULL DEFAULT 'manager'
                                   CHECK (review_type IN ('self','manager','peer','subordinate','skip_level','external')),
    performance_rating NUMERIC(3,2) CHECK (performance_rating BETWEEN 1 AND 5),
    potential_rating   NUMERIC(3,2) CHECK (potential_rating BETWEEN 1 AND 5),
    overall_comment    TEXT,
    strengths          TEXT,
    growth_areas       TEXT,
    goals_achieved_pct INT         CHECK (goals_achieved_pct BETWEEN 0 AND 100),
    status             TEXT        NOT NULL DEFAULT 'draft'
                                   CHECK (status IN ('draft','submitted','acknowledged','calibrated','final','disputed')),
    submitted_at       TIMESTAMPTZ,
    acknowledged_at    TIMESTAMPTZ,
    finalised_at       TIMESTAMPTZ,
    metadata           JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, cycle_id, employee_id, reviewer_id, review_type)
);

CREATE INDEX IF NOT EXISTS idx_perf_reviews_tenant_cycle ON app.performance_reviews (tenant_id, cycle_id);
CREATE INDEX IF NOT EXISTS idx_perf_reviews_tenant_employee ON app.performance_reviews (tenant_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_perf_reviews_reviewer ON app.performance_reviews (reviewer_id);

ALTER TABLE app.performance_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY perf_reviews_tenant_isolation ON app.performance_reviews
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

-- ───────────────────────────────────────────────────────────────────────────
-- 5. 360° Review Feedback (competency-level)
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app.review_feedback (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID        NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    review_id        UUID        NOT NULL REFERENCES app.performance_reviews(id) ON DELETE CASCADE,
    competency_code  TEXT        NOT NULL,
    competency_name_tr TEXT      NOT NULL,
    rating           NUMERIC(3,2) NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment          TEXT,
    evidence         TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_feedback_review ON app.review_feedback (review_id);

ALTER TABLE app.review_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY review_feedback_tenant_isolation ON app.review_feedback
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

-- ───────────────────────────────────────────────────────────────────────────
-- 6. 9-Box Grid Assignments
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app.nine_box_assignments (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          UUID        NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    cycle_id           UUID        NOT NULL REFERENCES app.performance_cycles(id) ON DELETE CASCADE,
    employee_id        UUID        NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
    performance_band   TEXT        NOT NULL
                                   CHECK (performance_band IN ('low','medium','high')),
    potential_band     TEXT        NOT NULL
                                   CHECK (potential_band IN ('low','medium','high')),
    box_label          TEXT        NOT NULL,  -- örn. "Yetenek Havuzu", "Star", "Risk"
    talent_segment     TEXT
                                   CHECK (talent_segment IN (
                                       'underperformer','inconsistent_player','dilemma',
                                       'reliable_contributor','core_player','high_potential',
                                       'solid_performer','high_performer','star'
                                   )),
    calibration_notes  TEXT,
    recommended_action TEXT,  -- "terfi_aday", "coaching", "PIP", "iç_transfer"...
    set_by             UUID,
    calibrated_at      TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, cycle_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_nine_box_tenant_cycle ON app.nine_box_assignments (tenant_id, cycle_id);
CREATE INDEX IF NOT EXISTS idx_nine_box_tenant_segment ON app.nine_box_assignments (tenant_id, talent_segment);

ALTER TABLE app.nine_box_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY nine_box_tenant_isolation ON app.nine_box_assignments
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

-- ───────────────────────────────────────────────────────────────────────────
-- 7. Calibration Sessions
-- ───────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app.calibration_sessions (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID        NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    cycle_id         UUID        NOT NULL REFERENCES app.performance_cycles(id) ON DELETE CASCADE,
    session_date     DATE        NOT NULL,
    scope            TEXT        NOT NULL DEFAULT 'department'
                                 CHECK (scope IN ('company','business_unit','department','team')),
    scope_ref_id     UUID,
    facilitator_id   UUID,
    participant_ids  UUID[]      NOT NULL DEFAULT ARRAY[]::UUID[],
    status           TEXT        NOT NULL DEFAULT 'scheduled'
                                 CHECK (status IN ('scheduled','in_progress','completed','cancelled')),
    notes            TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calib_tenant_cycle ON app.calibration_sessions (tenant_id, cycle_id);

ALTER TABLE app.calibration_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY calib_tenant_isolation ON app.calibration_sessions
    USING (tenant_id::text = current_setting('app.tenant_id', true))
    WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));

-- ───────────────────────────────────────────────────────────────────────────
-- 8. updated_at triggers
-- ───────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'performance_cycles',
        'performance_goals',
        'okrs',
        'okr_key_results',
        'performance_reviews',
        'review_feedback',
        'nine_box_assignments',
        'calibration_sessions'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON app.%s', t, t);
        EXECUTE format(
            'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON app.%s FOR EACH ROW EXECUTE FUNCTION touch_updated_at()',
            t, t
        );
    END LOOP;
END$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 9. Retention entries (performans verileri 5 yıl saklama — KVKK uyum)
-- ───────────────────────────────────────────────────────────────────────────
INSERT INTO app.retention_policies (name, table_name, retention_days, where_clause)
VALUES
    ('perf_cycles_archived_5y',  'app.performance_cycles',   1825, 'status = ''archived'' AND updated_at < NOW() - INTERVAL ''5 years'''),
    ('perf_reviews_final_5y',    'app.performance_reviews',  1825, 'status = ''final'' AND finalised_at < NOW() - INTERVAL ''5 years'''),
    ('calib_sessions_done_3y',   'app.calibration_sessions', 1095, 'status = ''completed'' AND session_date < NOW() - INTERVAL ''3 years''')
ON CONFLICT (name) DO NOTHING;
