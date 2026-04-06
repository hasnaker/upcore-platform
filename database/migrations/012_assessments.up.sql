-- =============================================================================
-- 012_assessments.up.sql
-- Assessments, sessions, responses, scores
-- =============================================================================

CREATE TABLE app.assessments (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    employee_id         uuid REFERENCES app.employees(id) ON DELETE CASCADE,
    candidate_id        uuid REFERENCES app.candidates(id) ON DELETE CASCADE,
    instrument_code     varchar(40) NOT NULL,            -- FK resolved in app-layer or via 013
    instrument_version  varchar(20) NOT NULL,
    norm_version        varchar(20),
    purpose             varchar(40) NOT NULL DEFAULT 'wellbeing'
                        CHECK (purpose IN ('wellbeing','selection','onboarding','periodic','followup','research')),
    status              varchar(20) NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','in_progress','submitted','scored','archived','invalidated')),
    invited_at          timestamptz,
    started_at          timestamptz,
    submitted_at        timestamptz,
    scored_at           timestamptz,
    archived_at         timestamptz,
    expires_at          timestamptz,
    duration_seconds    int CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
    metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_assessment_target CHECK (
        (employee_id IS NOT NULL AND candidate_id IS NULL)
        OR (employee_id IS NULL AND candidate_id IS NOT NULL)
    )
);

CREATE INDEX idx_assessments_tenant          ON app.assessments(tenant_id);
CREATE INDEX idx_assessments_employee        ON app.assessments(employee_id, submitted_at DESC);
CREATE INDEX idx_assessments_candidate       ON app.assessments(candidate_id, submitted_at DESC);
CREATE INDEX idx_assessments_instrument      ON app.assessments(instrument_code, instrument_version);
CREATE INDEX idx_assessments_status          ON app.assessments(tenant_id, status);
CREATE INDEX idx_assessments_status_scored   ON app.assessments(tenant_id, scored_at DESC) WHERE status = 'scored';

CREATE TRIGGER trg_assessments_updated_at
    BEFORE UPDATE ON app.assessments
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

-- ===== Assessment sessions (per sitting, with device info) ===================
CREATE TABLE app.assessment_sessions (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    assessment_id     uuid NOT NULL REFERENCES app.assessments(id) ON DELETE CASCADE,
    session_token     varchar(120) NOT NULL UNIQUE,
    started_at        timestamptz NOT NULL DEFAULT now(),
    completed_at      timestamptz,
    ip_address        inet,
    user_agent        text,
    device_type       varchar(30),
    browser           varchar(80),
    locale            varchar(10) DEFAULT 'tr-TR',
    progress_pct      numeric(5,2) NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
    last_item_code    varchar(40),
    created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_assessment_sessions_assessment ON app.assessment_sessions(assessment_id);
CREATE INDEX idx_assessment_sessions_tenant     ON app.assessment_sessions(tenant_id);

-- ===== Assessment responses (per item) =======================================
CREATE TABLE app.assessment_responses (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    assessment_id      uuid NOT NULL REFERENCES app.assessments(id) ON DELETE CASCADE,
    session_id         uuid REFERENCES app.assessment_sessions(id) ON DELETE SET NULL,
    item_code          varchar(40) NOT NULL,
    value_numeric      numeric(6,3),
    value_text         text,
    response_time_ms   int CHECK (response_time_ms IS NULL OR response_time_ms >= 0),
    answered_at        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_assessment_responses UNIQUE (assessment_id, item_code)
);

CREATE INDEX idx_assessment_responses_assessment ON app.assessment_responses(assessment_id);
CREATE INDEX idx_assessment_responses_tenant     ON app.assessment_responses(tenant_id);
CREATE INDEX idx_assessment_responses_item       ON app.assessment_responses(item_code);

-- ===== Assessment scores ======================================================
CREATE TABLE app.assessment_scores (
    assessment_id      uuid PRIMARY KEY REFERENCES app.assessments(id) ON DELETE CASCADE,
    tenant_id          uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    scores             jsonb NOT NULL,           -- subscale raw scores
    percentiles        jsonb NOT NULL DEFAULT '{}'::jsonb,
    classifications    jsonb NOT NULL DEFAULT '{}'::jsonb,  -- low/moderate/high/very_high
    reliability        jsonb NOT NULL DEFAULT '{}'::jsonb,  -- Cronbach alpha etc.
    norm_version       varchar(20) NOT NULL,
    scorer_version     varchar(20) NOT NULL,
    scored_at          timestamptz NOT NULL DEFAULT now(),
    created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_assessment_scores_tenant  ON app.assessment_scores(tenant_id);
CREATE INDEX idx_assessment_scores_scores  ON app.assessment_scores USING gin (scores);

COMMENT ON TABLE app.assessments IS 'Envanter/ölçüm oturumları (employee VEYA candidate için).';
COMMENT ON TABLE app.assessment_sessions IS 'Assessment sitting metadata (device, progress).';
COMMENT ON TABLE app.assessment_responses IS 'Item-level responses (Likert numeric or free-text).';
COMMENT ON TABLE app.assessment_scores IS 'Scored subscale values, percentiles, classifications.';
