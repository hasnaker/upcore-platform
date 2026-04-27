-- Rollback 065_referral_network
SET search_path TO app, public;

DROP VIEW  IF EXISTS app.v_referral_usage;
DROP TABLE IF EXISTS app.referral_bookings CASCADE;
DROP TABLE IF EXISTS app.referral_providers CASCADE;
