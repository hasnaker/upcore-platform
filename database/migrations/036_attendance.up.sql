-- 036_attendance.up.sql
-- Puantaj kartı (time clock / attendance). QR kod, manuel giriş, veya
-- mobile GPS check-in destekler.

CREATE TABLE IF NOT EXISTS app.attendance_entries (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id         uuid NOT NULL,
    employee_id       uuid NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
    entry_date        date NOT NULL,
    check_in_at       timestamptz,
    check_out_at      timestamptz,
    hours_worked      numeric(5, 2) GENERATED ALWAYS AS (
        CASE
            WHEN check_in_at IS NOT NULL AND check_out_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (check_out_at - check_in_at)) / 3600.0
            ELSE NULL
        END
    ) STORED,
    source            varchar(20) NOT NULL DEFAULT 'manual'
        CHECK (source IN ('manual', 'qr', 'mobile_gps', 'web', 'biometric')),
    location_geohash  varchar(20),
    notes             text,
    anomaly_flags     text[],     -- ['late', 'early_departure', 'overtime_flag']
    approved_by       uuid,
    approved_at       timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_attendance_emp_date
    ON app.attendance_entries (tenant_id, employee_id, entry_date);

CREATE INDEX IF NOT EXISTS idx_attendance_tenant_date
    ON app.attendance_entries (tenant_id, entry_date);

ALTER TABLE app.attendance_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY attendance_rls ON app.attendance_entries
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

COMMENT ON TABLE app.attendance_entries IS 'Puantaj kartı — günlük check-in/out, kaynak (QR/GPS/manuel), toplam saat hesaplanan kolon.';
