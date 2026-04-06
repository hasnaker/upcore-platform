-- =============================================================================
-- 011_positions_candidates.up.sql
-- ATS: open positions (job postings) + candidates + applications
-- =============================================================================

-- ===== Open positions (job postings) =========================================
CREATE TABLE app.open_positions (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    position_id          uuid REFERENCES app.position_definitions(id) ON DELETE SET NULL,
    department_id        uuid REFERENCES app.departments(id) ON DELETE SET NULL,
    hiring_manager_id    uuid REFERENCES app.employees(id) ON DELETE SET NULL,
    recruiter_id         uuid REFERENCES app.users(id) ON DELETE SET NULL,
    title_tr             varchar(200) NOT NULL,
    title_en             varchar(200),
    slug                 varchar(120) NOT NULL,
    description_tr       text NOT NULL,
    description_en       text,
    requirements_tr      text,
    headcount            int NOT NULL DEFAULT 1 CHECK (headcount >= 1),
    employment_type      varchar(30) NOT NULL DEFAULT 'full_time'
                         CHECK (employment_type IN ('full_time','part_time','contract','intern','freelance')),
    remote_policy        varchar(20) NOT NULL DEFAULT 'hybrid'
                         CHECK (remote_policy IN ('onsite','hybrid','remote')),
    work_location        varchar(120),
    salary_min           numeric(12,2),
    salary_max           numeric(12,2),
    salary_currency      char(3) NOT NULL DEFAULT 'TRY',
    salary_visible       boolean NOT NULL DEFAULT false,
    status               varchar(20) NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','published','paused','closed','filled','cancelled')),
    published_at         timestamptz,
    closes_at            timestamptz,
    filled_at            timestamptz,
    external_post_urls   jsonb NOT NULL DEFAULT '{}'::jsonb,    -- linkedin, kariyer.net, ...
    tags                 text[] NOT NULL DEFAULT '{}',
    created_by           uuid REFERENCES app.users(id) ON DELETE SET NULL,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now(),
    deleted_at           timestamptz,
    CONSTRAINT uq_open_positions_tenant_slug UNIQUE (tenant_id, slug),
    CONSTRAINT chk_open_positions_salary CHECK (salary_min IS NULL OR salary_max IS NULL OR salary_max >= salary_min)
);

CREATE INDEX idx_open_positions_tenant   ON app.open_positions(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_open_positions_status   ON app.open_positions(tenant_id, status);
CREATE INDEX idx_open_positions_dept     ON app.open_positions(department_id);
CREATE INDEX idx_open_positions_manager  ON app.open_positions(hiring_manager_id);
CREATE INDEX idx_open_positions_tags     ON app.open_positions USING gin (tags);
CREATE INDEX idx_open_positions_title_trgm ON app.open_positions USING gin (title_tr gin_trgm_ops);

CREATE TRIGGER trg_open_positions_updated_at
    BEFORE UPDATE ON app.open_positions
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

-- ===== Candidates ============================================================
CREATE TABLE app.candidates (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    external_id          varchar(80),
    first_name           varchar(100) NOT NULL,
    last_name            varchar(100) NOT NULL,
    email                citext NOT NULL,
    phone                varchar(40),
    linkedin_url         text,
    github_url           text,
    portfolio_url        text,
    current_title        varchar(200),
    current_company      varchar(200),
    years_experience     numeric(4,1) CHECK (years_experience IS NULL OR years_experience >= 0),
    location_city        varchar(80),
    location_country     char(2) DEFAULT 'TR',
    salary_expectation   numeric(12,2),
    salary_currency      char(3) DEFAULT 'TRY',
    availability         varchar(40)
                         CHECK (availability IS NULL OR availability IN ('hemen','1_ay','2_ay','3_ay','ihbar_süresi','belirtilmedi')),
    source               varchar(60),           -- linkedin, kariyer.net, referral, ...
    referred_by          uuid REFERENCES app.employees(id) ON DELETE SET NULL,
    cv_document_id       uuid REFERENCES app.documents(id) ON DELETE SET NULL,
    resume_text          text,                  -- parsed CV text for search
    skills               text[] NOT NULL DEFAULT '{}',
    languages            jsonb NOT NULL DEFAULT '[]'::jsonb,
    education            jsonb NOT NULL DEFAULT '[]'::jsonb,
    work_experience      jsonb NOT NULL DEFAULT '[]'::jsonb,
    kvkk_consent_at      timestamptz,
    kvkk_consent_version varchar(20),
    notes                text,
    metadata             jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now(),
    deleted_at           timestamptz,
    CONSTRAINT uq_candidates_tenant_email UNIQUE (tenant_id, email)
);

CREATE INDEX idx_candidates_tenant       ON app.candidates(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_candidates_email        ON app.candidates(tenant_id, email);
CREATE INDEX idx_candidates_skills       ON app.candidates USING gin (skills);
CREATE INDEX idx_candidates_name_trgm    ON app.candidates USING gin ((first_name || ' ' || last_name) gin_trgm_ops);
CREATE INDEX idx_candidates_resume_trgm  ON app.candidates USING gin (resume_text gin_trgm_ops);

CREATE TRIGGER trg_candidates_updated_at
    BEFORE UPDATE ON app.candidates
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

-- ===== Applications (candidate × open_position) ==============================
CREATE TABLE app.applications (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    open_position_id    uuid NOT NULL REFERENCES app.open_positions(id) ON DELETE CASCADE,
    candidate_id        uuid NOT NULL REFERENCES app.candidates(id) ON DELETE CASCADE,
    stage               varchar(40) NOT NULL DEFAULT 'applied'
                        CHECK (stage IN ('applied','screening','phone_screen','assessment','interview_1','interview_2','interview_final','offer','hired','rejected','withdrawn')),
    status              varchar(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','on_hold','closed')),
    fit_score           numeric(5,2) CHECK (fit_score IS NULL OR (fit_score BETWEEN 0 AND 100)),
    rating              smallint CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
    rejection_reason    varchar(60),
    offer_salary        numeric(12,2),
    offer_currency      char(3) DEFAULT 'TRY',
    offer_sent_at       timestamptz,
    offer_accepted_at   timestamptz,
    hired_at            timestamptz,
    source              varchar(60),
    applied_at          timestamptz NOT NULL DEFAULT now(),
    last_activity_at    timestamptz NOT NULL DEFAULT now(),
    notes               text,
    metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_applications UNIQUE (open_position_id, candidate_id)
);

CREATE INDEX idx_applications_tenant      ON app.applications(tenant_id);
CREATE INDEX idx_applications_position    ON app.applications(open_position_id, stage);
CREATE INDEX idx_applications_candidate   ON app.applications(candidate_id);
CREATE INDEX idx_applications_stage       ON app.applications(tenant_id, stage, status);
CREATE INDEX idx_applications_applied_at  ON app.applications(tenant_id, applied_at DESC);

CREATE TRIGGER trg_applications_updated_at
    BEFORE UPDATE ON app.applications
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

COMMENT ON TABLE app.open_positions IS 'Açık pozisyonlar (iş ilanları).';
COMMENT ON TABLE app.candidates IS 'Aday havuzu — CV, beceri, tercih bilgileri.';
COMMENT ON TABLE app.applications IS 'Başvurular (pozisyon × aday) — pipeline stage tracking.';
