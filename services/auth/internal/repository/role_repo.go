package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/auth/internal/db"
	"github.com/upcore/auth/internal/domain"
)

// RoleRepo persists roles & role assignments.
type RoleRepo struct {
	db *sqlx.DB
}

// NewRoleRepo constructs a RoleRepo.
func NewRoleRepo(database *sqlx.DB) *RoleRepo {
	return &RoleRepo{db: database}
}

// GetByID returns a role by id.
func (r *RoleRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Role, error) {
	var role domain.Role
	err := r.db.GetContext(ctx, &role, db.QRoleGetByID, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrRoleNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("role by id: %w", err)
	}
	return &role, nil
}

// GetByName resolves a role by name within a tenant (falls back to system roles).
func (r *RoleRepo) GetByName(ctx context.Context, tenantID uuid.UUID, name string) (*domain.Role, error) {
	var role domain.Role
	err := r.db.GetContext(ctx, &role, db.QRoleGetByName, tenantID, name)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrRoleNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("role by name: %w", err)
	}
	return &role, nil
}

// ListByTenant returns roles scoped to a tenant + system roles.
func (r *RoleRepo) ListByTenant(ctx context.Context, tenantID uuid.UUID) ([]*domain.Role, error) {
	var roles []*domain.Role
	if err := r.db.SelectContext(ctx, &roles, db.QRoleListByTenant, tenantID); err != nil {
		return nil, fmt.Errorf("list roles: %w", err)
	}
	return roles, nil
}

// Create inserts a custom role.
func (r *RoleRepo) Create(ctx context.Context, role *domain.Role) error {
	if role.ID == uuid.Nil {
		role.ID = uuid.New()
	}
	if role.CreatedAt.IsZero() {
		role.CreatedAt = time.Now().UTC()
	}
	if _, err := r.db.NamedExecContext(ctx, db.QRoleInsert, role); err != nil {
		return fmt.Errorf("insert role: %w", err)
	}
	return nil
}

// AssignToUser assigns a role to a user (idempotent).
func (r *RoleRepo) AssignToUser(ctx context.Context, userID, roleID, tenantID, grantedBy uuid.UUID) error {
	var granter any
	if grantedBy == uuid.Nil {
		granter = nil
	} else {
		granter = grantedBy
	}
	if _, err := r.db.ExecContext(ctx, db.QUserRoleAssign, userID, roleID, tenantID, granter); err != nil {
		return fmt.Errorf("assign role: %w", err)
	}
	return nil
}

// RevokeFromUser removes a role assignment.
func (r *RoleRepo) RevokeFromUser(ctx context.Context, userID, roleID uuid.UUID) error {
	if _, err := r.db.ExecContext(ctx, db.QUserRoleRevoke, userID, roleID); err != nil {
		return fmt.Errorf("revoke role: %w", err)
	}
	return nil
}

// GetUserRoles lists the roles assigned to a user.
func (r *RoleRepo) GetUserRoles(ctx context.Context, userID uuid.UUID) ([]*domain.Role, error) {
	var roles []*domain.Role
	if err := r.db.SelectContext(ctx, &roles, db.QUserRolesForUser, userID); err != nil {
		return nil, fmt.Errorf("get user roles: %w", err)
	}
	return roles, nil
}
