-- 033_employee_deductions.up.sql
-- Tekrarlayan veya tek seferlik ek kesintiler: avans, icra, nafaka,
-- sendika aidatı, özel sağlık sigortası, kurum içi kredi, ek gıda.
--
-- 4857/35 ve İİK 83 uyarınca icra kesintisi net maaşın %25'ini geçemez;
-- nafaka öncelikli (İİK 83/6) ve icra cap'inden bağımsızdır. Servis
-- katmanında bu sırayla uygulanır:
--   1. Önce nafaka
--   2. Sonra diğer icra (cap %25)
--   3. Sonra sendika/avans/diğer (cap yok ama net >= 0)

CREATE TABLE IF NOT EXISTS app.employee_deductions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL,
    employee_id     uuid NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,

    deduction_type  varchar(40) NOT NULL
        CHECK (deduction_type IN (
            'advance',           -- avans geri ödemesi
            'icra',              -- icra takibi
            'nafaka',            -- nafaka
            'sendika_aidati',    -- sendika aidatı
            'saglik_sigortasi',  -- özel sağlık sigortası (brütten)
            'kredi',             -- kurum içi kredi
            'ozel'               -- tenant tanımlı
        )),

    label           varchar(200) NOT NULL,     -- "2026-03 avansı", "İcra 2024/1234"
    monthly_amount  numeric(12, 2) NOT NULL CHECK (monthly_amount > 0),
    total_cap       numeric(12, 2),            -- opsiyonel toplam üst sınır (örn avans tamamı)
    consumed        numeric(12, 2) NOT NULL DEFAULT 0, -- kümülatif indirilmiş tutar

    start_period    varchar(7) NOT NULL,       -- "2026-04"
    end_period      varchar(7),                -- null → belirsiz süreli (icra)

    reference_no    varchar(100),              -- icra dosya no / kredi no
    priority        smallint NOT NULL DEFAULT 50,  -- 0-99 (düşük = öncelikli)

    active          boolean NOT NULL DEFAULT TRUE,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    created_by      uuid,
    notes           text
);

CREATE INDEX IF NOT EXISTS idx_employee_deductions_active
    ON app.employee_deductions (tenant_id, employee_id)
    WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS idx_employee_deductions_period
    ON app.employee_deductions (tenant_id, start_period, end_period)
    WHERE active = TRUE;

ALTER TABLE app.employee_deductions ENABLE ROW LEVEL SECURITY;

CREATE POLICY employee_deductions_rls ON app.employee_deductions
    USING (tenant_id = current_setting('app.tenant_id')::uuid)
    WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

COMMENT ON TABLE app.employee_deductions IS 'Personel bazlı ek kesintiler: avans/icra/nafaka/sendika/kredi. Bordro calculate sırasında uygulanır.';
COMMENT ON COLUMN app.employee_deductions.priority IS 'Nafaka=0, icra=10, aidat=30, avans=50, diğer=70 (düşük öncelikli).';
COMMENT ON COLUMN app.employee_deductions.consumed IS 'Kümülatif indirilmiş tutar — total_cap dolduğunda active=FALSE yapılır.';
