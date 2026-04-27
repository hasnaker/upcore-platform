-- 035_shifts.up.sql
-- Vardiya yönetimi (shift scheduling) — mavi yaka pazar için temel tablo.
-- Shift_templates ile haftalık/aylık desenler, shift_assignments ile
-- personel bazlı atama. Çakışma kontrolü app katmanında.

CREATE TABLE IF NOT EXISTS app.shift_templates (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL,
    code            varchar(40) NOT NULL,           -- 'GUNDUZ_0800_1700'
    label           varchar(100) NOT NULL,          -- 'Gündüz 08:00-17:00'
    start_time      time NOT NULL,
    end_time        time NOT NULL,
    color           varchar(7),                     -- hex #RRGGBB for calendar
    is_night        boolean NOT NULL DEFAULT FALSE, -- 4857/69 gece vardiyası flag
    is_weekend      boolean NOT NULL DEFAULT FALSE,
    is_holiday      boolean NOT NULL DEFAULT FALSE,
    break_minutes   integer NOT NULL DEFAULT 60,
    active          boolean NOT NULL DEFAULT TRUE,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_shift_template_code
    ON app.shift_templates (tenant_id, code) WHERE active = TRUE;

ALTER TABLE app.shift_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY shift_templates_rls ON app.shift_templates
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE TABLE IF NOT EXISTS app.shift_assignments (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL,
    employee_id     uuid NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
    template_id     uuid REFERENCES app.shift_templates(id) ON DELETE RESTRICT,
    shift_date      date NOT NULL,
    start_at        timestamptz NOT NULL,
    end_at          timestamptz NOT NULL,
    status          varchar(20) NOT NULL DEFAULT 'scheduled'
        CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'missed', 'cancelled')),
    actual_start    timestamptz,
    actual_end      timestamptz,
    notes           text,
    created_by      uuid,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CHECK (end_at > start_at)
);

CREATE INDEX IF NOT EXISTS idx_shift_assignments_emp_date
    ON app.shift_assignments (tenant_id, employee_id, shift_date);

CREATE INDEX IF NOT EXISTS idx_shift_assignments_date_range
    ON app.shift_assignments (tenant_id, shift_date);

ALTER TABLE app.shift_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY shift_assignments_rls ON app.shift_assignments
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

COMMENT ON TABLE app.shift_templates IS 'Vardiya desenleri (gunduz/gece/haftasonu) — tenant tarafından tanımlanır.';
COMMENT ON TABLE app.shift_assignments IS 'Personel × gün vardiya ataması. Çakışma kontrolü service katmanında.';
