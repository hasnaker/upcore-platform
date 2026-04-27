-- ============================================================================
-- 050_lms_training.up.sql — Learning Management (eğitim yönetimi)
--
-- Creates the tables the training BFF and /egitim UI already assume:
--   - app.training_programs
--   - app.training_enrollments
--   - app.training_certificates  (new — PDF/Blob-stored certificates)
--   - app.skill_matrix           (per-employee skill gaps)
--
-- All tables are tenant-isolated via RLS. Enrollment status FSM:
--   enrolled → in_progress → completed
--                        ↘ cancelled
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS app.training_programs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  code             TEXT NOT NULL,                 -- "ONBOARD-TECH-01"
  name_tr          TEXT NOT NULL,
  name_en          TEXT,
  description_tr   TEXT,
  category         TEXT NOT NULL DEFAULT 'technical', -- technical|soft_skill|leadership|compliance|safety
  delivery_mode    TEXT NOT NULL DEFAULT 'online',     -- online|onsite|hybrid|self_paced
  duration_hours   NUMERIC(6,2) NOT NULL DEFAULT 0,
  provider         TEXT,
  cost_per_person  NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency         TEXT NOT NULL DEFAULT 'TRY',
  skill_tags       TEXT[] DEFAULT '{}',           -- ['go','postgres']
  passing_score    INT NOT NULL DEFAULT 70,       -- min score to auto-issue certificate
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, code)
);

CREATE INDEX IF NOT EXISTS training_programs_tenant_idx
  ON app.training_programs(tenant_id, active, category);

CREATE TABLE IF NOT EXISTS app.training_enrollments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  program_id      UUID NOT NULL REFERENCES app.training_programs(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'enrolled',  -- enrolled|in_progress|completed|cancelled|failed
  enrolled_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  score           NUMERIC(5,2),                      -- 0..100
  feedback_rating INT CHECK (feedback_rating BETWEEN 1 AND 5),
  feedback_text   TEXT,
  created_by      UUID REFERENCES app.users(id),
  UNIQUE (tenant_id, program_id, employee_id)
);

CREATE INDEX IF NOT EXISTS training_enrollments_program_idx
  ON app.training_enrollments(tenant_id, program_id, status);
CREATE INDEX IF NOT EXISTS training_enrollments_employee_idx
  ON app.training_enrollments(tenant_id, employee_id, status);

CREATE TABLE IF NOT EXISTS app.training_certificates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  enrollment_id   UUID NOT NULL REFERENCES app.training_enrollments(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
  program_id      UUID NOT NULL REFERENCES app.training_programs(id) ON DELETE CASCADE,
  certificate_no  TEXT NOT NULL,                     -- e.g. "UPC-CERT-2026-00042"
  issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until     TIMESTAMPTZ,                       -- NULL = perpetual
  score           NUMERIC(5,2),
  blob_url        TEXT,                              -- Azure Blob SAS URL for PDF
  blob_mime       TEXT DEFAULT 'application/pdf',
  revoked         BOOLEAN NOT NULL DEFAULT FALSE,
  revoked_at      TIMESTAMPTZ,
  revoked_reason  TEXT,
  UNIQUE (tenant_id, certificate_no)
);

CREATE INDEX IF NOT EXISTS training_certificates_employee_idx
  ON app.training_certificates(tenant_id, employee_id);

CREATE TABLE IF NOT EXISTS app.skill_matrix (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
  employee_id    UUID NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
  skill_name     TEXT NOT NULL,
  skill_category TEXT,
  current_level  INT NOT NULL DEFAULT 0 CHECK (current_level BETWEEN 0 AND 5),
  target_level   INT NOT NULL DEFAULT 0 CHECK (target_level BETWEEN 0 AND 5),
  last_assessed  TIMESTAMPTZ,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, employee_id, skill_name)
);

CREATE INDEX IF NOT EXISTS skill_matrix_gap_idx
  ON app.skill_matrix(tenant_id, (target_level - current_level) DESC)
  WHERE target_level > current_level;

-- RLS policies
ALTER TABLE app.training_programs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.training_enrollments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.training_certificates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.skill_matrix           ENABLE ROW LEVEL SECURITY;

CREATE POLICY training_programs_tenant_iso ON app.training_programs
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY training_enrollments_tenant_iso ON app.training_enrollments
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY training_certificates_tenant_iso ON app.training_certificates
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

CREATE POLICY skill_matrix_tenant_iso ON app.skill_matrix
  USING (tenant_id = current_setting('app.tenant_id', true)::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id', true)::uuid);

COMMIT;
