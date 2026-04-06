-- =============================================================================
-- 007_employees.up.sql
-- Employees + employment history + managerial hierarchy
-- =============================================================================

CREATE TABLE app.employees (
    id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id            uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    user_id              uuid REFERENCES app.users(id) ON DELETE SET NULL,
    external_id          varchar(80),                -- HRIS/payroll dış kimliği
    employee_no          varchar(40) NOT NULL,        -- sicil numarası
    tckn                 varchar(11),                 -- TC Kimlik No (nullable, sadece TR)
    ad                   varchar(100) NOT NULL,       -- first_name
    soyad                varchar(100) NOT NULL,       -- last_name
    dogum_tarihi         date,                        -- birth_date
    dogum_yeri           varchar(120),
    cinsiyet             varchar(20)                  -- gender (text, not enum)
                         CHECK (cinsiyet IS NULL OR cinsiyet IN ('kadın','erkek','belirtilmek_istemiyor','diğer')),
    medeni_hali          varchar(20)                  -- marital_status
                         CHECK (medeni_hali IS NULL OR medeni_hali IN ('bekâr','evli','boşanmış','dul','belirtilmek_istemiyor')),
    uyruk                varchar(60) DEFAULT 'T.C.',  -- nationality
    email_is             citext,                      -- work email
    email_kisisel        citext,                      -- personal email
    telefon_is           varchar(40),
    telefon_kisisel      varchar(40),
    adres                text,
    sehir                varchar(80),
    ulke                 char(2) DEFAULT 'TR',
    posta_kodu           varchar(20),
    department_id        uuid REFERENCES app.departments(id) ON DELETE SET NULL,
    position_id          uuid REFERENCES app.position_definitions(id) ON DELETE SET NULL,
    manager_id           uuid REFERENCES app.employees(id) ON DELETE SET NULL,
    hire_date            date NOT NULL,               -- işe başlama tarihi
    tenure_months        int,                          -- kıdem (ay); trigger ile güncellenir
    probation_end_date   date,
    termination_date     date,                        -- işten ayrılma
    termination_reason   varchar(60)
                         CHECK (termination_reason IS NULL OR termination_reason IN (
                             'istifa','karşılıklı_fesih','iş_sözleşmesi_feshi','emeklilik','işveren_feshi','diğer'
                         )),
    employment_status    varchar(20) NOT NULL DEFAULT 'active'
                         CHECK (employment_status IN ('active','on_leave','suspended','terminated','retired')),
    employment_type      varchar(30) NOT NULL DEFAULT 'full_time'
                         CHECK (employment_type IN ('full_time','part_time','contract','intern','freelance')),
    work_location        varchar(120),
    contract_type        varchar(40)                  -- iş sözleşmesi türü
                         CHECK (contract_type IS NULL OR contract_type IN ('belirsiz_süreli','belirli_süreli','part_time','çağrı_üzerine','deneme_süreli')),
    salary_gross         numeric(12,2),               -- brüt maaş
    salary_net           numeric(12,2),               -- net maaş (opsiyonel)
    salary_currency      char(3) NOT NULL DEFAULT 'TRY',
    bank_iban            varchar(34),
    sgk_no               varchar(20),                 -- SGK sicil numarası
    notes                text,
    metadata             jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at           timestamptz NOT NULL DEFAULT now(),
    updated_at           timestamptz NOT NULL DEFAULT now(),
    deleted_at           timestamptz,
    CONSTRAINT uq_employees_tenant_no UNIQUE (tenant_id, employee_no),
    CONSTRAINT uq_employees_tenant_external UNIQUE (tenant_id, external_id),
    CONSTRAINT chk_employees_tckn CHECK (tckn IS NULL OR app.is_valid_tckn(tckn)),
    CONSTRAINT chk_employees_termination CHECK (termination_date IS NULL OR termination_date >= hire_date)
);

CREATE INDEX idx_employees_tenant         ON app.employees(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_user           ON app.employees(user_id);
CREATE INDEX idx_employees_department     ON app.employees(department_id);
CREATE INDEX idx_employees_position       ON app.employees(position_id);
CREATE INDEX idx_employees_manager        ON app.employees(manager_id);
CREATE INDEX idx_employees_status         ON app.employees(tenant_id, employment_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_hire_date      ON app.employees(tenant_id, hire_date);
CREATE INDEX idx_employees_name_trgm      ON app.employees USING gin ((ad || ' ' || soyad) gin_trgm_ops);
CREATE INDEX idx_employees_email_is       ON app.employees(tenant_id, email_is);

CREATE TRIGGER trg_employees_updated_at
    BEFORE UPDATE ON app.employees
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

-- Maintain tenure_months (kıdem) on insert/update
CREATE OR REPLACE FUNCTION app.calc_employee_tenure_months()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    ref_date date;
BEGIN
    ref_date := COALESCE(NEW.termination_date, CURRENT_DATE);
    IF NEW.hire_date IS NULL THEN
        NEW.tenure_months := NULL;
    ELSE
        NEW.tenure_months := GREATEST(0,
            (EXTRACT(YEAR FROM age(ref_date, NEW.hire_date)) * 12
             + EXTRACT(MONTH FROM age(ref_date, NEW.hire_date)))::int);
    END IF;
    RETURN NEW;
END$$;

CREATE TRIGGER trg_employees_tenure_months
    BEFORE INSERT OR UPDATE OF hire_date, termination_date ON app.employees
    FOR EACH ROW EXECUTE FUNCTION app.calc_employee_tenure_months();

-- ===== Employment history (position/department changes) =====================
CREATE TABLE app.employment_history (
    id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    employee_id      uuid NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
    change_type      varchar(40) NOT NULL
                     CHECK (change_type IN ('hire','promotion','transfer','title_change','department_change','manager_change','salary_change','type_change','termination')),
    old_department_id uuid REFERENCES app.departments(id) ON DELETE SET NULL,
    new_department_id uuid REFERENCES app.departments(id) ON DELETE SET NULL,
    old_position_id  uuid REFERENCES app.position_definitions(id) ON DELETE SET NULL,
    new_position_id  uuid REFERENCES app.position_definitions(id) ON DELETE SET NULL,
    old_manager_id   uuid REFERENCES app.employees(id) ON DELETE SET NULL,
    new_manager_id   uuid REFERENCES app.employees(id) ON DELETE SET NULL,
    old_salary       numeric(12,2),
    new_salary       numeric(12,2),
    effective_date   date NOT NULL,
    reason           text,
    approved_by      uuid REFERENCES app.users(id) ON DELETE SET NULL,
    metadata         jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_employment_history_employee ON app.employment_history(employee_id, effective_date DESC);
CREATE INDEX idx_employment_history_tenant   ON app.employment_history(tenant_id, effective_date DESC);
CREATE INDEX idx_employment_history_type     ON app.employment_history(change_type);

COMMENT ON TABLE app.employees IS 'Çalışanlar — kişisel ve iş bilgileri (Türkçe alan isimleri).';
COMMENT ON COLUMN app.employees.tckn IS 'T.C. Kimlik Numarası (11 hane, algoritmic olarak doğrulanır).';
COMMENT ON COLUMN app.employees.tenure_months IS 'Otomatik hesaplanan kıdem (ay cinsinden).';
COMMENT ON TABLE app.employment_history IS 'İstihdam geçmişi — atama/terfi/maaş değişiklikleri.';
