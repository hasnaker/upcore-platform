-- =============================================================================
-- 005_departments.up.sql
-- Organizational hierarchy with ltree paths
-- =============================================================================

CREATE TABLE app.departments (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id      uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    parent_id      uuid REFERENCES app.departments(id) ON DELETE RESTRICT,
    code           varchar(40) NOT NULL,
    name_tr        varchar(200) NOT NULL,
    name_en        varchar(200),
    description    text,
    path           ltree NOT NULL,                 -- materialized hierarchy path
    depth          int NOT NULL DEFAULT 0 CHECK (depth >= 0),
    head_user_id   uuid REFERENCES app.users(id) ON DELETE SET NULL,
    cost_center    varchar(60),
    location       varchar(120),                   -- şehir / ofis
    headcount_cap  int CHECK (headcount_cap IS NULL OR headcount_cap > 0),
    active         boolean NOT NULL DEFAULT true,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now(),
    deleted_at     timestamptz,
    CONSTRAINT uq_departments_tenant_code UNIQUE (tenant_id, code)
);

CREATE INDEX idx_departments_tenant     ON app.departments(tenant_id);
CREATE INDEX idx_departments_parent     ON app.departments(parent_id);
CREATE INDEX idx_departments_path_gist  ON app.departments USING gist (path);
CREATE INDEX idx_departments_path_btree ON app.departments USING btree (path);
CREATE INDEX idx_departments_active     ON app.departments(tenant_id, active) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_departments_updated_at
    BEFORE UPDATE ON app.departments
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

COMMENT ON TABLE app.departments IS 'Organizasyon birimleri (departman/bölüm/takım) - ltree ile hiyerarşi.';
COMMENT ON COLUMN app.departments.path IS 'Materialized ltree path (ör: root.tech.backend).';
