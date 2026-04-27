-- =============================================================================
-- 057_psychometric_validation.down.sql
-- Rollback UpCap-TR validasyon şeması.
-- =============================================================================

SET search_path TO app, public;

DROP TABLE IF EXISTS app.upcap_pilot_responses CASCADE;
DROP TABLE IF EXISTS app.upcap_pilot_consents  CASCADE;
DROP TABLE IF EXISTS app.psychometric_norms    CASCADE;
DROP TABLE IF EXISTS app.psychometric_items    CASCADE;
DROP TABLE IF EXISTS app.psychometric_scales   CASCADE;
