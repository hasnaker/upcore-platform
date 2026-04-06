-- =============================================================================
-- 009_leaves.up.sql
-- Leave types, leave_requests, leave_balances (4857 İş Kanunu uyumlu)
-- =============================================================================

CREATE TABLE app.leave_types (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid REFERENCES app.tenants(id) ON DELETE CASCADE,  -- NULL = global
    code                varchar(60) NOT NULL,
    name_tr             varchar(200) NOT NULL,
    name_en             varchar(200),
    description_tr      text,
    category            varchar(40) NOT NULL
                        CHECK (category IN ('yıllık','mazeret','hastalık','doğum','babalık','evlilik','ölüm','süt','idari','ücretsiz','diğer')),
    is_paid             boolean NOT NULL DEFAULT true,
    requires_document   boolean NOT NULL DEFAULT false,
    accrual_method      varchar(30)                         -- tahakkuk yöntemi
                        CHECK (accrual_method IS NULL OR accrual_method IN ('yıllık_sabit','kıdeme_bağlı','olay_bazlı','aylık_tahakkuk')),
    max_days_per_year   int CHECK (max_days_per_year IS NULL OR max_days_per_year >= 0),
    max_days_per_event  int CHECK (max_days_per_event IS NULL OR max_days_per_event >= 0),
    carry_over_allowed  boolean NOT NULL DEFAULT false,
    carry_over_max_days int CHECK (carry_over_max_days IS NULL OR carry_over_max_days >= 0),
    min_tenure_months   int NOT NULL DEFAULT 0 CHECK (min_tenure_months >= 0),
    legal_reference     varchar(200),                       -- ör: 4857/53, 4857/55
    active              boolean NOT NULL DEFAULT true,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_leave_types_tenant_code UNIQUE (tenant_id, code)
);

CREATE INDEX idx_leave_types_tenant ON app.leave_types(tenant_id) WHERE active = true;

CREATE TRIGGER trg_leave_types_updated_at
    BEFORE UPDATE ON app.leave_types
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

-- ===== Leave requests ========================================================
CREATE TABLE app.leave_requests (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    employee_id         uuid NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
    leave_type_id       uuid NOT NULL REFERENCES app.leave_types(id) ON DELETE RESTRICT,
    start_date          date NOT NULL,
    end_date            date NOT NULL,
    start_half_day      boolean NOT NULL DEFAULT false,     -- sabah/öğlen
    end_half_day        boolean NOT NULL DEFAULT false,
    total_days          numeric(5,2) NOT NULL CHECK (total_days > 0),
    reason              text,
    status              varchar(20) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('draft','pending','approved','rejected','cancelled','taken')),
    requested_at        timestamptz NOT NULL DEFAULT now(),
    approved_by         uuid REFERENCES app.users(id) ON DELETE SET NULL,
    approved_at         timestamptz,
    rejected_reason     text,
    cancelled_at        timestamptz,
    document_urls       text[],
    metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_leave_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_leave_requests_tenant      ON app.leave_requests(tenant_id);
CREATE INDEX idx_leave_requests_employee    ON app.leave_requests(employee_id, start_date DESC);
CREATE INDEX idx_leave_requests_status      ON app.leave_requests(tenant_id, status);
CREATE INDEX idx_leave_requests_dates       ON app.leave_requests(tenant_id, start_date, end_date);

CREATE TRIGGER trg_leave_requests_updated_at
    BEFORE UPDATE ON app.leave_requests
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

-- ===== Leave balances (per employee + leave type, yearly) ====================
CREATE TABLE app.leave_balances (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL REFERENCES app.tenants(id) ON DELETE CASCADE,
    employee_id     uuid NOT NULL REFERENCES app.employees(id) ON DELETE CASCADE,
    leave_type_id   uuid NOT NULL REFERENCES app.leave_types(id) ON DELETE RESTRICT,
    year            int NOT NULL CHECK (year BETWEEN 2000 AND 2100),
    accrued_days    numeric(6,2) NOT NULL DEFAULT 0 CHECK (accrued_days >= 0),
    used_days       numeric(6,2) NOT NULL DEFAULT 0 CHECK (used_days >= 0),
    pending_days    numeric(6,2) NOT NULL DEFAULT 0 CHECK (pending_days >= 0),
    carried_over    numeric(6,2) NOT NULL DEFAULT 0 CHECK (carried_over >= 0),
    adjusted_days   numeric(6,2) NOT NULL DEFAULT 0,       -- manual adjustments
    remaining_days  numeric(6,2) GENERATED ALWAYS AS (accrued_days + carried_over + adjusted_days - used_days - pending_days) STORED,
    last_accrual_at timestamptz,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_leave_balances UNIQUE (employee_id, leave_type_id, year)
);

CREATE INDEX idx_leave_balances_tenant   ON app.leave_balances(tenant_id);
CREATE INDEX idx_leave_balances_employee ON app.leave_balances(employee_id, year);

CREATE TRIGGER trg_leave_balances_updated_at
    BEFORE UPDATE ON app.leave_balances
    FOR EACH ROW EXECUTE FUNCTION app.update_updated_at();

COMMENT ON TABLE app.leave_types IS 'İzin türleri (4857 İş Kanunu bazlı).';
COMMENT ON TABLE app.leave_requests IS 'İzin talepleri.';
COMMENT ON TABLE app.leave_balances IS 'Yıllık izin bakiyeleri (çalışan × izin türü × yıl).';
