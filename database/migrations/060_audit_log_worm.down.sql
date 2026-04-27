-- =============================================================================
-- 060_audit_log_worm.down.sql — partial reversal.
-- NOTE: audit data MUST NOT be dropped by a rollback; this migration only
-- removes chaining infrastructure. Partition data + immutability triggers
-- remain intact.
-- =============================================================================

DROP FUNCTION IF EXISTS audit.rotate_partitions();
DROP TABLE IF EXISTS audit.legal_holds;

DROP FUNCTION IF EXISTS audit.compute_worm_root(date);
DROP TABLE IF EXISTS audit.worm_root;

-- Remove chain trigger but keep columns so historical chain stays verifiable.
DROP TRIGGER IF EXISTS trg_audit_events_chain_hash ON audit.events;
DROP FUNCTION IF EXISTS audit.chain_hash();

-- TRUNCATE blocker stays in place on purpose (safety).
