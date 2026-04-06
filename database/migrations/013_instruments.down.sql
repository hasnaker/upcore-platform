-- =============================================================================
-- 013_instruments.down.sql
-- =============================================================================
DROP TRIGGER IF EXISTS trg_norm_tables_updated_at ON app.norm_tables;
DROP TABLE IF EXISTS app.norm_tables CASCADE;
DROP TRIGGER IF EXISTS trg_instrument_items_updated_at ON app.instrument_items;
DROP TABLE IF EXISTS app.instrument_items CASCADE;
DROP TRIGGER IF EXISTS trg_instruments_updated_at ON app.instruments;
DROP TABLE IF EXISTS app.instruments CASCADE;
