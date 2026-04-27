-- 042_matrix_manager.up.sql
-- Matrix organizasyon: line manager (primary) + project manager (secondary)
-- ayrımı. Mevcut app.employees.manager_id = line manager olarak kalır;
-- matrix için ayrı tablo.

CREATE TABLE IF NOT EXISTS app.matrix_assignments (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id          uuid NOT NULL,
    employee_id        uuid NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
    matrix_manager_id  uuid NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
    relationship       varchar(40) NOT NULL DEFAULT 'project',
        -- project|functional|dotted_line|mentor
    allocation_pct     integer NOT NULL DEFAULT 100
        CHECK (allocation_pct BETWEEN 0 AND 100),
    start_date         date NOT NULL,
    end_date           date,
    project_name       varchar(200),
    notes              text,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, employee_id, matrix_manager_id, relationship, start_date)
);

CREATE INDEX IF NOT EXISTS idx_matrix_assignments_employee
    ON app.matrix_assignments (tenant_id, employee_id)
    WHERE end_date IS NULL;

CREATE INDEX IF NOT EXISTS idx_matrix_assignments_manager
    ON app.matrix_assignments (tenant_id, matrix_manager_id)
    WHERE end_date IS NULL;

ALTER TABLE app.matrix_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY matrix_assignments_rls ON app.matrix_assignments
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

COMMENT ON TABLE app.matrix_assignments IS 'Matrix org: employee''nin line manager dışındaki dotted-line/project/functional manager bağlantıları';
