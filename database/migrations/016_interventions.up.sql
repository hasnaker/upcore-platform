-- =============================================================================
-- 016_interventions.up.sql
-- Interventions catalog + assignments + outcomes + effectiveness posteriors
-- =============================================================================

CREATE TABLE app.interventions (
    id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                uuid REFERENCES app.tenants(id) ON DELETE CASCADE,  -- NULL = global catalog
    code                     varchar(80) NOT NULL,
    title_tr                 varchar(300) NOT NULL,
    title_en                 varchar(300),
    description_tr           text NOT NULL,
    description_en           text,
    category                 varchar(40) NOT NULL
                             CHECK (category IN ('coaching','workload','flexibility','recognition','skill_dev','wellbeing','social_support','role_design','leadership','environment','other')),
    evidence_tier            char(1) NOT NULL CHECK (evidence_tier IN ('A','B','C')),
    target_drivers           text[] NOT NULL DEFAULT '{}',
    target_burnout_band      text[] NOT NULL DEFAULT '{}',
    delivery_mode            varchar(40) NOT NULL
                             CHECK (delivery_mode IN ('1on1','group','self_service','workshop','policy_change','tool','async')),
    expected_effect_size     numeric(5,3),
    time_to_effect_weeks     int CHECK (time_to_effect_weeks IS NULL OR time_to_effect_weeks >= 0),
    duration_weeks           int CHECK (duration_weeks IS NULL OR duration_weeks >= 0),
    cost_tier                varchar(20) CHECK (cost_tier IS NULL OR cost_tier IN ('low','medium','high','variable')),
    citations                jsonb NOT NULL DEFAULT '[]'::jsonb,
    embedding                vector(1536),           -- semantic embedding (OpenAI / local)
    active                   boolean NOT NULL DEFAULT true,
    created_at               timestamptz NOT NULL DEFAULT now(),
    updated_at               timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_interventions_scope_code UNIQUE (tenant_id, code)
);

CREATE INDEX idx_interventions_tenant          ON app.interventions(tenant_id) WHERE active = true;
CREATE INDEX idx_interventions_category        ON app.interventions(category) WHERE active = true;
CREATE INDEX idx_interventions_evidence        ON app.interventions(evidence_tier);
CREATE INDEX idx_interventions_target_drivers  ON app.interventions USING gin (target_drivers);
CREATE INDEX idx_interventions_target_band     ON app.interventions USING gin (target_burnout_band);
CREATE INDEX idx_interventions_embedding_hnsw  ON app.interventions USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 200);

CREATE TRIGGER trg_interventions_updated_at
    BEFORE UPDATE ON app.interventions
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

-- ===== Intervention assignments ==============================================
CREATE TABLE app.intervention_assignments (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    intervention_id    uuid NOT NULL REFERENCES app.interventions(id) ON DELETE RESTRICT,
    employee_id        uuid NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
    assigned_by        uuid REFERENCES app.users(id) ON DELETE SET NULL,
    assigned_at        timestamptz NOT NULL DEFAULT now(),
    starts_at          timestamptz,
    ends_at            timestamptz,
    status             varchar(20) NOT NULL DEFAULT 'assigned'
                       CHECK (status IN ('assigned','declined','in_progress','completed','cancelled','lapsed')),
    accepted_at        timestamptz,
    completed_at       timestamptz,
    cancelled_at       timestamptz,
    rank               int,
    recommendation_score numeric(6,4),
    rationale_tr       text,
    notes              text,
    metadata           jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_int_assignments_tenant       ON app.intervention_assignments(tenant_id);
CREATE INDEX idx_int_assignments_employee     ON app.intervention_assignments(employee_id, assigned_at DESC);
CREATE INDEX idx_int_assignments_intervention ON app.intervention_assignments(intervention_id);
CREATE INDEX idx_int_assignments_status       ON app.intervention_assignments(tenant_id, status);

CREATE TRIGGER trg_int_assignments_updated_at
    BEFORE UPDATE ON app.intervention_assignments
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

-- ===== Intervention outcomes (pre/post measurement) ==========================
CREATE TABLE app.intervention_outcomes (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    assignment_id     uuid NOT NULL REFERENCES app.intervention_assignments(id) ON DELETE CASCADE,
    intervention_id   uuid NOT NULL REFERENCES app.interventions(id) ON DELETE RESTRICT,
    employee_id       uuid NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
    pre_bat_score     numeric(6,3),
    post_bat_score    numeric(6,3),
    effect_size       numeric(6,4),
    pre_assessment_id uuid REFERENCES app.assessments(id) ON DELETE SET NULL,
    post_assessment_id uuid REFERENCES app.assessments(id) ON DELETE SET NULL,
    success           boolean,
    measured_at       timestamptz NOT NULL DEFAULT now(),
    horizon_weeks     int CHECK (horizon_weeks IS NULL OR horizon_weeks >= 0),
    notes             text,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_int_outcomes_tenant        ON app.intervention_outcomes(tenant_id);
CREATE INDEX idx_int_outcomes_assignment    ON app.intervention_outcomes(assignment_id);
CREATE INDEX idx_int_outcomes_intervention  ON app.intervention_outcomes(intervention_id, success);
CREATE INDEX idx_int_outcomes_employee      ON app.intervention_outcomes(employee_id, measured_at DESC);

CREATE TRIGGER trg_int_outcomes_updated_at
    BEFORE UPDATE ON app.intervention_outcomes
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

-- ===== Effectiveness posteriors (Bayesian Thompson sampling) =================
CREATE TABLE ml.effectiveness_posteriors (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid REFERENCES app.tenants(id) ON DELETE CASCADE,    -- NULL = global
    intervention_id   uuid NOT NULL REFERENCES app.interventions(id) ON DELETE CASCADE,
    segment           varchar(80) NOT NULL DEFAULT 'global',
    alpha             numeric(10,3) NOT NULL DEFAULT 1.0 CHECK (alpha > 0),
    beta              numeric(10,3) NOT NULL DEFAULT 1.0 CHECK (beta > 0),
    n_observations    int NOT NULL DEFAULT 0 CHECK (n_observations >= 0),
    mean_effect       numeric(6,4),
    last_updated_at   timestamptz NOT NULL DEFAULT now(),
    created_at        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_eff_post UNIQUE (tenant_id, intervention_id, segment)
);

CREATE INDEX idx_eff_post_intervention ON ml.effectiveness_posteriors(intervention_id);
CREATE INDEX idx_eff_post_tenant       ON ml.effectiveness_posteriors(tenant_id);

COMMENT ON TABLE app.interventions IS 'Müdahale kataloğu (global + tenant-local).';
COMMENT ON TABLE app.intervention_assignments IS 'Çalışanlara atanan müdahaleler.';
COMMENT ON TABLE app.intervention_outcomes IS 'Müdahale sonrası ölçüm (pre/post BAT, etki büyüklüğü).';
COMMENT ON TABLE ml.effectiveness_posteriors IS 'Bayesian posteriors for Thompson sampling of interventions.';
