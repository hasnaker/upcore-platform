-- =============================================================================
-- 006_positions.up.sql
-- Position/job definitions with JD-R profile (talepler/kaynaklar)
-- =============================================================================

CREATE TABLE app.position_definitions (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    department_id       uuid REFERENCES app.departments(id) ON DELETE SET NULL,
    code                varchar(60) NOT NULL,
    title_tr            varchar(200) NOT NULL,
    title_en            varchar(200),
    job_family          varchar(80),                 -- ör: engineering, hr, finance
    job_level           varchar(30),                 -- ör: junior, mid, senior, lead
    seniority_min_years int CHECK (seniority_min_years IS NULL OR seniority_min_years >= 0),
    description_tr      text,
    description_en      text,
    responsibilities    jsonb NOT NULL DEFAULT '[]'::jsonb,
    required_skills     jsonb NOT NULL DEFAULT '[]'::jsonb,
    preferred_skills    jsonb NOT NULL DEFAULT '[]'::jsonb,
    jdr_talepler        jsonb NOT NULL DEFAULT '{}'::jsonb,  -- JD-R Model: İş Talepleri (demands)
    jdr_kaynaklar       jsonb NOT NULL DEFAULT '{}'::jsonb,  -- JD-R Model: İş Kaynakları (resources)
    salary_band_min     numeric(12,2),
    salary_band_max     numeric(12,2),
    salary_currency     char(3) NOT NULL DEFAULT 'TRY',
    employment_type     varchar(30) NOT NULL DEFAULT 'full_time'
                        CHECK (employment_type IN ('full_time','part_time','contract','intern','freelance')),
    remote_policy       varchar(20) NOT NULL DEFAULT 'hybrid'
                        CHECK (remote_policy IN ('onsite','hybrid','remote')),
    active              boolean NOT NULL DEFAULT true,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    deleted_at          timestamptz,
    CONSTRAINT uq_positions_tenant_code UNIQUE (tenant_id, code),
    CONSTRAINT chk_salary_band CHECK (salary_band_min IS NULL OR salary_band_max IS NULL OR salary_band_max >= salary_band_min)
);

CREATE INDEX idx_positions_tenant     ON app.position_definitions(tenant_id);
CREATE INDEX idx_positions_department ON app.position_definitions(department_id);
CREATE INDEX idx_positions_active     ON app.position_definitions(tenant_id, active) WHERE deleted_at IS NULL;
CREATE INDEX idx_positions_title_trgm ON app.position_definitions USING gin (title_tr gin_trgm_ops);
CREATE INDEX idx_positions_talepler   ON app.position_definitions USING gin (jdr_talepler);
CREATE INDEX idx_positions_kaynaklar  ON app.position_definitions USING gin (jdr_kaynaklar);

CREATE TRIGGER trg_positions_updated_at
    BEFORE UPDATE ON app.position_definitions
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

COMMENT ON TABLE app.position_definitions IS 'Pozisyon tanımları (iş tanımları) - JD-R profilli.';
COMMENT ON COLUMN app.position_definitions.jdr_talepler IS 'İş Talepleri (demands): workload, time_pressure, emotional_demands, role_conflict, ...';
COMMENT ON COLUMN app.position_definitions.jdr_kaynaklar IS 'İş Kaynakları (resources): autonomy, social_support, feedback, development_opportunities, ...';
