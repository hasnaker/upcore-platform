-- =============================================================================
-- 014_surveys.up.sql
-- Pulse surveys, invitations, responses
-- =============================================================================

CREATE TABLE app.surveys (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    instrument_id      uuid REFERENCES app.instruments(id) ON DELETE SET NULL,
    title_tr           varchar(200) NOT NULL,
    title_en           varchar(200),
    description_tr     text,
    survey_type        varchar(30) NOT NULL DEFAULT 'pulse'
                       CHECK (survey_type IN ('pulse','enps','engagement','wellbeing','onboarding','exit','custom')),
    audience           jsonb NOT NULL DEFAULT '{}'::jsonb,     -- filters: departments, roles, tenure_gt, ...
    is_anonymous       boolean NOT NULL DEFAULT true,
    cadence            varchar(30)
                       CHECK (cadence IS NULL OR cadence IN ('one_time','weekly','biweekly','monthly','quarterly','semiannual','annual','ad_hoc')),
    starts_at          timestamptz,
    ends_at            timestamptz,
    reminder_days      int[] NOT NULL DEFAULT '{3,7}',
    status             varchar(20) NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft','scheduled','active','paused','completed','archived')),
    created_by         uuid REFERENCES app.users(id) ON DELETE SET NULL,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    deleted_at         timestamptz,
    CONSTRAINT chk_survey_dates CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at >= starts_at)
);

CREATE INDEX idx_surveys_tenant   ON app.surveys(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_surveys_status   ON app.surveys(tenant_id, status);
CREATE INDEX idx_surveys_dates    ON app.surveys(tenant_id, starts_at, ends_at);

CREATE TRIGGER trg_surveys_updated_at
    BEFORE UPDATE ON app.surveys
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

-- ===== Survey invitations =====================================================
CREATE TABLE app.survey_invitations (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    survey_id       uuid NOT NULL REFERENCES app.surveys(id) ON DELETE CASCADE,
    employee_id     uuid NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
    token           varchar(120) NOT NULL UNIQUE,
    sent_at         timestamptz,
    opened_at       timestamptz,
    completed_at    timestamptz,
    reminders_sent  int NOT NULL DEFAULT 0 CHECK (reminders_sent >= 0),
    last_reminder_at timestamptz,
    status          varchar(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','sent','opened','completed','expired','bounced')),
    expires_at      timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_survey_invitations UNIQUE (survey_id, employee_id)
);

CREATE INDEX idx_survey_invitations_tenant   ON app.survey_invitations(tenant_id);
CREATE INDEX idx_survey_invitations_survey   ON app.survey_invitations(survey_id, status);
CREATE INDEX idx_survey_invitations_employee ON app.survey_invitations(employee_id);

CREATE TRIGGER trg_survey_invitations_updated_at
    BEFORE UPDATE ON app.survey_invitations
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

-- ===== Survey responses =======================================================
CREATE TABLE app.survey_responses (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    survey_id       uuid NOT NULL REFERENCES app.surveys(id) ON DELETE CASCADE,
    invitation_id   uuid REFERENCES app.survey_invitations(id) ON DELETE SET NULL,
    employee_id     uuid REFERENCES app.employees(id) ON DELETE SET NULL,  -- NULL if anonymous
    assessment_id   uuid REFERENCES app.assessments(id) ON DELETE SET NULL,
    responses       jsonb NOT NULL DEFAULT '{}'::jsonb,
    comment_tr      text,
    completed_at    timestamptz NOT NULL DEFAULT now(),
    duration_seconds int,
    locale          varchar(10) DEFAULT 'tr-TR',
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_survey_responses_tenant    ON app.survey_responses(tenant_id);
CREATE INDEX idx_survey_responses_survey    ON app.survey_responses(survey_id, completed_at DESC);
CREATE INDEX idx_survey_responses_employee  ON app.survey_responses(employee_id);

COMMENT ON TABLE app.surveys IS 'Pulse anketleri — eNPS, angaje, iyilik durumu.';
COMMENT ON TABLE app.survey_invitations IS 'Anket davetleri + token + reminder tracking.';
COMMENT ON TABLE app.survey_responses IS 'Anket cevapları (anonim/kimlikli).';
