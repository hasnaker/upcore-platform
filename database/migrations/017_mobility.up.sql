-- =============================================================================
-- 017_mobility.up.sql
-- Internal mobility: internal positions + career paths + mobility requests
-- =============================================================================

CREATE TABLE app.internal_positions (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    position_id       uuid REFERENCES app.position_definitions(id) ON DELETE SET NULL,
    open_position_id  uuid REFERENCES app.open_positions(id) ON DELETE SET NULL,
    title_tr          varchar(200) NOT NULL,
    department_id     uuid REFERENCES app.departments(id) ON DELETE SET NULL,
    eligibility_criteria jsonb NOT NULL DEFAULT '{}'::jsonb,   -- min_tenure, required_skills, ...
    visible_to        varchar(30) NOT NULL DEFAULT 'all_employees'
                      CHECK (visible_to IN ('all_employees','department','invite_only')),
    status            varchar(20) NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open','closed','filled','draft')),
    posted_at         timestamptz,
    closes_at         timestamptz,
    filled_by         uuid REFERENCES app.employees(id) ON DELETE SET NULL,
    filled_at         timestamptz,
    created_by        uuid REFERENCES app.users(id) ON DELETE SET NULL,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    deleted_at        timestamptz
);

CREATE INDEX idx_internal_positions_tenant  ON app.internal_positions(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_internal_positions_status  ON app.internal_positions(tenant_id, status);
CREATE INDEX idx_internal_positions_dept    ON app.internal_positions(department_id);

CREATE TRIGGER trg_internal_positions_updated_at
    BEFORE UPDATE ON app.internal_positions
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

-- ===== Career paths (skill-based, per tenant) ================================
CREATE TABLE app.career_paths (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    code               varchar(80) NOT NULL,
    name_tr            varchar(200) NOT NULL,
    name_en            varchar(200),
    description_tr     text,
    from_position_id   uuid REFERENCES app.position_definitions(id) ON DELETE CASCADE,
    to_position_id     uuid NOT NULL REFERENCES app.position_definitions(id) ON DELETE CASCADE,
    avg_tenure_months  int CHECK (avg_tenure_months IS NULL OR avg_tenure_months >= 0),
    required_skills    text[] NOT NULL DEFAULT '{}',
    skill_gaps         jsonb NOT NULL DEFAULT '{}'::jsonb,
    development_actions jsonb NOT NULL DEFAULT '[]'::jsonb,
    active             boolean NOT NULL DEFAULT true,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_career_paths_tenant_code UNIQUE (tenant_id, code)
);

CREATE INDEX idx_career_paths_tenant ON app.career_paths(tenant_id) WHERE active = true;
CREATE INDEX idx_career_paths_from   ON app.career_paths(from_position_id);
CREATE INDEX idx_career_paths_to     ON app.career_paths(to_position_id);

CREATE TRIGGER trg_career_paths_updated_at
    BEFORE UPDATE ON app.career_paths
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

-- ===== Mobility requests (employee-initiated moves) ==========================
CREATE TABLE app.mobility_requests (
    id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    employee_id           uuid NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
    internal_position_id  uuid REFERENCES app.internal_positions(id) ON DELETE SET NULL,
    target_position_id    uuid REFERENCES app.position_definitions(id) ON DELETE SET NULL,
    target_department_id  uuid REFERENCES app.departments(id) ON DELETE SET NULL,
    request_type          varchar(30) NOT NULL DEFAULT 'apply'
                          CHECK (request_type IN ('apply','expression_of_interest','transfer_request')),
    motivation_tr         text,
    status                varchar(20) NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','screening','interviewing','accepted','declined','withdrawn')),
    current_manager_notified boolean NOT NULL DEFAULT false,
    current_manager_approved_at timestamptz,
    hr_reviewer_id        uuid REFERENCES app.users(id) ON DELETE SET NULL,
    decision_at           timestamptz,
    decision_notes        text,
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mobility_requests_tenant    ON app.mobility_requests(tenant_id);
CREATE INDEX idx_mobility_requests_employee  ON app.mobility_requests(employee_id, created_at DESC);
CREATE INDEX idx_mobility_requests_status    ON app.mobility_requests(tenant_id, status);

CREATE TRIGGER trg_mobility_requests_updated_at
    BEFORE UPDATE ON app.mobility_requests
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

COMMENT ON TABLE app.internal_positions IS 'Kurum içi açık pozisyonlar (internal mobility).';
COMMENT ON TABLE app.career_paths IS 'Kariyer yolları (from → to, skill gap analizi ile).';
COMMENT ON TABLE app.mobility_requests IS 'Çalışanların kurum içi başvuru/transfer talepleri.';
