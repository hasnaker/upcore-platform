package db

// Common SQL queries used across repositories.
// Keeping them in one place makes auditing SQL easier.
const (
	// Users
	QUserSelectBase = `
		SELECT id, clerk_id, tenant_id, email, first_name, last_name,
		       locale, status, metadata, created_at, updated_at
		FROM users`

	QUserGetByID       = QUserSelectBase + ` WHERE id = $1 AND deleted_at IS NULL`
	QUserGetByClerkID  = QUserSelectBase + ` WHERE clerk_id = $1 AND deleted_at IS NULL`
	QUserGetByEmail    = QUserSelectBase + ` WHERE tenant_id = $1 AND email = $2 AND deleted_at IS NULL`
	QUserListByTenant  = QUserSelectBase + ` WHERE tenant_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT $2 OFFSET $3`
	QUserCountByTenant = `SELECT COUNT(*) FROM users WHERE tenant_id = $1 AND deleted_at IS NULL`

	QUserInsert = `
		INSERT INTO users (id, clerk_id, tenant_id, email, first_name, last_name, locale, status, metadata, created_at, updated_at)
		VALUES (:id, :clerk_id, :tenant_id, :email, :first_name, :last_name, :locale, :status, CAST(:metadata AS JSONB), :created_at, :updated_at)`

	QUserUpdate = `
		UPDATE users
		SET email = :email, first_name = :first_name, last_name = :last_name,
		    locale = :locale, status = :status, metadata = CAST(:metadata AS JSONB), updated_at = :updated_at
		WHERE id = :id`

	QUserSoftDelete = `UPDATE users SET deleted_at = NOW(), status = 'deleted', updated_at = NOW() WHERE id = $1`

	// Sessions
	QSessionInsert = `
		INSERT INTO sessions (id, user_id, tenant_id, refresh_token_hash, user_agent, ip_address, expires_at, created_at)
		VALUES (:id, :user_id, :tenant_id, :refresh_token_hash, :user_agent, :ip_address, :expires_at, :created_at)`

	QSessionGetByTokenHash = `
		SELECT id, user_id, tenant_id, refresh_token_hash, user_agent, ip_address, expires_at, revoked_at, revoke_reason, created_at
		FROM sessions WHERE refresh_token_hash = $1`

	QSessionGetByID = `
		SELECT id, user_id, tenant_id, refresh_token_hash, user_agent, ip_address, expires_at, revoked_at, revoke_reason, created_at
		FROM sessions WHERE id = $1`

	QSessionListByUser = `
		SELECT id, user_id, tenant_id, refresh_token_hash, user_agent, ip_address, expires_at, revoked_at, revoke_reason, created_at
		FROM sessions
		WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > NOW()
		ORDER BY created_at DESC`

	QSessionRevoke       = `UPDATE sessions SET revoked_at = NOW(), revoke_reason = $2 WHERE id = $1 AND revoked_at IS NULL`
	QSessionRevokeByUser = `UPDATE sessions SET revoked_at = NOW(), revoke_reason = $2 WHERE user_id = $1 AND revoked_at IS NULL`
	QSessionDeleteExpired = `DELETE FROM sessions WHERE expires_at < NOW() - INTERVAL '7 days'`

	// Roles
	QRoleGetByID     = `SELECT id, tenant_id, name, description, is_system, created_at FROM roles WHERE id = $1`
	QRoleGetByName   = `SELECT id, tenant_id, name, description, is_system, created_at FROM roles WHERE (tenant_id = $1 OR tenant_id IS NULL) AND name = $2`
	QRoleListByTenant = `SELECT id, tenant_id, name, description, is_system, created_at FROM roles WHERE tenant_id = $1 OR tenant_id IS NULL ORDER BY is_system DESC, name`
	QRoleInsert      = `INSERT INTO roles (id, tenant_id, name, description, is_system, created_at) VALUES (:id, :tenant_id, :name, :description, :is_system, :created_at)`

	// User roles
	QUserRoleAssign  = `INSERT INTO user_roles (user_id, role_id, tenant_id, granted_by, granted_at) VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT (user_id, role_id) DO NOTHING`
	QUserRoleRevoke  = `DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2`
	QUserRolesForUser = `
		SELECT r.id, r.tenant_id, r.name, r.description, r.is_system, r.created_at
		FROM roles r
		INNER JOIN user_roles ur ON ur.role_id = r.id
		WHERE ur.user_id = $1`
)
