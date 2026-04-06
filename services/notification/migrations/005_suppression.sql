-- 005_suppression.sql
-- Email suppression list (global, not tenant-scoped).

CREATE TABLE IF NOT EXISTS email_suppression (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email        TEXT        NOT NULL UNIQUE,
    reason       TEXT        NOT NULL CHECK (reason IN ('bounce','complaint','manual','unsubscribe')),
    bounce_count INT         NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supp_email ON email_suppression (email);

COMMENT ON TABLE email_suppression IS 'Global email suppression list (bounces, complaints)';
