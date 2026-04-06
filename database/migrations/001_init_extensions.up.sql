-- =============================================================================
-- 001_init_extensions.up.sql
-- Enables required PostgreSQL extensions, schemas, and generic helper functions
-- =============================================================================

-- Extensions ------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "ltree";
CREATE EXTENSION IF NOT EXISTS "citext";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Schemas ---------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS ml;

-- Helper: current_tenant_id() -------------------------------------------------
-- Returns the tenant UUID from the session-scoped GUC `app.tenant_id`.
-- When unset (e.g., admin migrations) returns the zero-UUID which no row holds.
CREATE OR REPLACE FUNCTION app.current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_tid text;
BEGIN
    v_tid := current_setting('app.tenant_id', true);
    IF v_tid IS NULL OR v_tid = '' THEN
        RETURN '00000000-0000-0000-0000-000000000000'::uuid;
    END IF;
    RETURN v_tid::uuid;
END$$;

-- Helper: update_updated_at() trigger function --------------------------------
CREATE OR REPLACE FUNCTION app.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END$$;

-- Helper: immutable_row() trigger function ------------------------------------
-- Used by audit.events and similar tables to block UPDATE/DELETE.
CREATE OR REPLACE FUNCTION app.immutable_row()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Row is immutable (table %.%).', TG_TABLE_SCHEMA, TG_TABLE_NAME
        USING ERRCODE = '45000';
END$$;

-- Helper: TCKN validation (Turkish Citizenship Number, 11 digits) -------------
-- Reference: https://tr.wikipedia.org/wiki/T%C3%BCrkiye_Cumhuriyeti_kimlik_numaras%C4%B1
CREATE OR REPLACE FUNCTION app.is_valid_tckn(p_tckn text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    d int[];
    s1 int;
    s2 int;
    d10 int;
    d11 int;
BEGIN
    IF p_tckn IS NULL THEN
        RETURN true; -- NULL ok, CHECK enforces only when provided
    END IF;
    IF p_tckn !~ '^[1-9][0-9]{10}$' THEN
        RETURN false;
    END IF;
    d := ARRAY(SELECT substring(p_tckn FROM i FOR 1)::int FROM generate_series(1, 11) i);
    s1 := d[1] + d[3] + d[5] + d[7] + d[9];
    s2 := d[2] + d[4] + d[6] + d[8];
    d10 := ((s1 * 7) - s2) % 10;
    IF d10 < 0 THEN d10 := d10 + 10; END IF;
    IF d10 <> d[10] THEN RETURN false; END IF;
    d11 := (s1 + s2 + d[10]) % 10;
    IF d11 <> d[11] THEN RETURN false; END IF;
    RETURN true;
END$$;

COMMENT ON FUNCTION app.current_tenant_id() IS 'Returns tenant UUID from session GUC app.tenant_id; fallback: zero-UUID.';
COMMENT ON FUNCTION app.update_updated_at() IS 'Trigger: sets NEW.updated_at = now() on UPDATE.';
COMMENT ON FUNCTION app.immutable_row() IS 'Trigger: prevents UPDATE/DELETE on append-only tables.';
COMMENT ON FUNCTION app.is_valid_tckn(text) IS 'Validates Turkish Citizenship Number (TCKN, 11 digits) via official algorithm.';
