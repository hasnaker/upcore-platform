-- 004_scores.up.sql
-- Assessment scores table.

CREATE TABLE IF NOT EXISTS app.assessment_scores (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id   UUID NOT NULL REFERENCES app.assessments(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL,
    scale_code      TEXT NOT NULL,
    scale_name      TEXT NOT NULL,
    raw_score       DOUBLE PRECISION NOT NULL DEFAULT 0,
    t_score         DOUBLE PRECISION,
    percentile      DOUBLE PRECISION,
    risk_level      TEXT,
    norm_group      TEXT,
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
    scored_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scores_assessment
    ON app.assessment_scores (assessment_id);

CREATE INDEX IF NOT EXISTS idx_scores_tenant
    ON app.assessment_scores (tenant_id);

-- One score per scale per assessment.
CREATE UNIQUE INDEX IF NOT EXISTS ux_scores_assessment_scale
    ON app.assessment_scores (assessment_id, scale_code);
