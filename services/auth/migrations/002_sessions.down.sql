-- 002_sessions.down.sql
DROP INDEX IF EXISTS idx_login_attempts_ip_time;
DROP INDEX IF EXISTS idx_login_attempts_email_time;
DROP TABLE IF EXISTS login_attempts;

DROP POLICY IF EXISTS sessions_tenant_isolation ON sessions;
DROP INDEX IF EXISTS idx_sessions_tenant;
DROP INDEX IF EXISTS idx_sessions_expires_at;
DROP INDEX IF EXISTS idx_sessions_user_id;
DROP TABLE IF EXISTS sessions;
