-- =============================================================================
-- 060_audit_log_worm.up.sql
-- Audit log WORM reinforcement (POL-13, POL-07):
--   1. Add hash_prev + hash_self columns for tamper-evident chaining.
--   2. Populate hashes on insert via trigger (deterministic SHA-256).
--   3. Reinforce immutability trigger to reject UPDATE + DELETE + TRUNCATE.
--   4. Add daily Merkle-root table `audit.worm_root` computed by scripts.
--   5. Partition retention policy: 7 years (84 months).
--   6. Legal hold support: `audit.legal_holds` freezes a partition range.
-- =============================================================================

-- -- 1. Chain columns ---------------------------------------------------------
ALTER TABLE audit.events
    ADD COLUMN IF NOT EXISTS hash_prev  bytea,
    ADD COLUMN IF NOT EXISTS hash_self  bytea,
    ADD COLUMN IF NOT EXISTS hash_alg   varchar(16) NOT NULL DEFAULT 'sha256';

CREATE INDEX IF NOT EXISTS idx_audit_events_hash_self ON audit.events (hash_self);

-- -- 2. Chain trigger ---------------------------------------------------------
CREATE OR REPLACE FUNCTION audit.chain_hash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = audit, app, pg_catalog, pg_temp
AS $$
DECLARE
    v_prev bytea;
    v_input text;
BEGIN
    -- Find the previous tip (latest hash_self within same partition period
    -- using occurred_at month granularity).
    SELECT hash_self INTO v_prev
    FROM audit.events
    WHERE occurred_at >= date_trunc('month', NEW.occurred_at)
      AND occurred_at < (date_trunc('month', NEW.occurred_at) + interval '1 month')
      AND hash_self IS NOT NULL
    ORDER BY occurred_at DESC, id DESC
    LIMIT 1;

    NEW.hash_prev := v_prev; -- nullable for first row of a partition
    v_input := COALESCE(encode(v_prev, 'hex'), '')
        || '|' || COALESCE(NEW.tenant_id::text, '')
        || '|' || COALESCE(NEW.user_id::text, '')
        || '|' || NEW.action
        || '|' || NEW.resource_type
        || '|' || COALESCE(NEW.resource_id::text, '')
        || '|' || NEW.status
        || '|' || NEW.payload::text
        || '|' || COALESCE(NEW.diff::text, '')
        || '|' || to_char(NEW.occurred_at, 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
    NEW.hash_self := digest(v_input, 'sha256');
    RETURN NEW;
END$$;

CREATE TRIGGER trg_audit_events_chain_hash
    BEFORE INSERT ON audit.events
    FOR EACH ROW EXECUTE FUNCTION audit.chain_hash();

-- -- 3. Reinforce immutability (UPDATE/DELETE already blocked; add TRUNCATE) --
CREATE OR REPLACE FUNCTION audit.block_truncate()
RETURNS event_trigger
LANGUAGE plpgsql
AS $$
DECLARE
    rec record;
BEGIN
    FOR rec IN SELECT * FROM pg_event_trigger_ddl_commands()
    LOOP
        IF rec.command_tag IN ('TRUNCATE TABLE')
           AND rec.schema_name = 'audit' THEN
            RAISE EXCEPTION 'TRUNCATE is forbidden on audit.* (WORM policy)';
        END IF;
    END LOOP;
END$$;

-- event_trigger on TRUNCATE (Postgres 16+ supports table_rewrite only; TRUNCATE
-- is blocked via regular trigger on the table).
CREATE OR REPLACE FUNCTION audit.reject_truncate()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'TRUNCATE on audit.events is forbidden (WORM policy)';
END$$;

DO $$
DECLARE
    p regclass;
BEGIN
    FOR p IN SELECT oid::regclass FROM pg_class
             WHERE relnamespace = 'audit'::regnamespace
               AND relkind = 'r'
    LOOP
        EXECUTE format(
            'CREATE TRIGGER trg_audit_no_truncate
               BEFORE TRUNCATE ON %s
               FOR EACH STATEMENT EXECUTE FUNCTION audit.reject_truncate();', p);
    END LOOP;
EXCEPTION WHEN duplicate_object THEN NULL;
END$$;

-- -- 4. Daily Merkle root table ----------------------------------------------
CREATE TABLE IF NOT EXISTS audit.worm_root (
    root_date     date PRIMARY KEY,
    row_count     bigint NOT NULL,
    merkle_root   bytea NOT NULL,
    signer_kid    varchar(64),    -- Key Vault signing-key id
    signer_sig    bytea,          -- detached signature (set by ops job)
    computed_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE audit.worm_root IS
  'Daily Merkle root of hash_self values. Signed by CISO-held key; attests immutability.';

-- Helper to compute root for a given date (called nightly by a job).
CREATE OR REPLACE FUNCTION audit.compute_worm_root(p_date date)
RETURNS bytea
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_root bytea := decode('', 'hex');
    v_count bigint := 0;
    rec record;
BEGIN
    FOR rec IN
        SELECT hash_self
        FROM audit.events
        WHERE occurred_at >= p_date::timestamptz
          AND occurred_at <  (p_date + 1)::timestamptz
          AND hash_self IS NOT NULL
        ORDER BY id
    LOOP
        v_root := digest(v_root || rec.hash_self, 'sha256');
        v_count := v_count + 1;
    END LOOP;

    INSERT INTO audit.worm_root (root_date, row_count, merkle_root)
    VALUES (p_date, v_count, v_root)
    ON CONFLICT (root_date) DO UPDATE
        SET row_count = EXCLUDED.row_count,
            merkle_root = EXCLUDED.merkle_root,
            computed_at = now();

    RETURN v_root;
END$$;

-- -- 5. Retention: 7 years rolling partition maintenance ---------------------
CREATE TABLE IF NOT EXISTS audit.partition_policy (
    policy_key        text PRIMARY KEY,
    retention_months  int  NOT NULL
);
INSERT INTO audit.partition_policy (policy_key, retention_months)
VALUES ('events', 84)
ON CONFLICT (policy_key) DO UPDATE SET retention_months = EXCLUDED.retention_months;

-- Helper: ensure next 15 monthly partitions exist + drop anything older than
-- 84 months unless on legal hold. Called nightly by scripts/retention-cron.sh.
CREATE OR REPLACE FUNCTION audit.rotate_partitions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_retention int;
    v_m date;
    v_next date;
    v_name text;
    r record;
    on_hold boolean;
BEGIN
    SELECT retention_months INTO v_retention
    FROM audit.partition_policy WHERE policy_key = 'events';

    -- Ensure forward partitions.
    FOR i IN 0..15 LOOP
        v_m := date_trunc('month', CURRENT_DATE + (i || ' months')::interval)::date;
        v_next := (v_m + interval '1 month')::date;
        v_name := 'events_' || to_char(v_m, 'YYYY_MM');
        EXECUTE format(
            'CREATE TABLE IF NOT EXISTS audit.%I PARTITION OF audit.events FOR VALUES FROM (%L) TO (%L);',
            v_name, v_m::timestamptz, v_next::timestamptz
        );
    END LOOP;

    -- Drop partitions older than retention, unless legal hold applies.
    FOR r IN
        SELECT c.relname AS name, pg_catalog.pg_get_expr(c.relpartbound, c.oid, true) AS bound
          FROM pg_inherits i
          JOIN pg_class c ON c.oid = i.inhrelid
         WHERE i.inhparent = 'audit.events'::regclass
    LOOP
        -- parse the "FROM ('2018-05-01 00:00:00+00')" lower bound
        DECLARE lb_txt text; lb_date date;
        BEGIN
            lb_txt := substring(r.bound FROM 'FROM \(''([^'']+)''');
            CONTINUE WHEN lb_txt IS NULL;
            lb_date := lb_txt::date;
            IF lb_date < (CURRENT_DATE - (v_retention || ' months')::interval)::date THEN
                SELECT EXISTS (
                    SELECT 1 FROM audit.legal_holds
                     WHERE period_start <= lb_date AND period_end >= lb_date
                ) INTO on_hold;
                IF on_hold THEN
                    RAISE NOTICE 'partition % retained due to legal hold', r.name;
                    CONTINUE;
                END IF;
                EXECUTE format('ALTER TABLE audit.events DETACH PARTITION audit.%I;', r.name);
                EXECUTE format('DROP TABLE audit.%I;', r.name);
            END IF;
        END;
    END LOOP;
END$$;

-- -- 6. Legal holds ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit.legal_holds (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    reason        text NOT NULL,
    period_start  date NOT NULL,
    period_end    date NOT NULL,
    created_by    text NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    released_at   timestamptz,
    released_by   text,
    CHECK (period_end >= period_start)
);

COMMENT ON TABLE audit.legal_holds IS
  'Legal hold freezes partitions in period [start, end] from retention deletion. Applied by DPO/Legal.';

COMMENT ON FUNCTION audit.rotate_partitions() IS
  'Creates forward partitions and prunes expired ones subject to legal_holds (POL-13).';
