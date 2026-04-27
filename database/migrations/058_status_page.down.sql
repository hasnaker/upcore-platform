-- 056_status_page.down.sql — rollback.

DROP TABLE IF EXISTS app.status_subscribers CASCADE;
DROP TABLE IF EXISTS app.status_maintenance_windows CASCADE;
DROP TABLE IF EXISTS app.status_incident_updates CASCADE;
DROP TABLE IF EXISTS app.status_incidents CASCADE;
DROP TABLE IF EXISTS app.status_component_daily CASCADE;
DROP TABLE IF EXISTS app.status_components CASCADE;
