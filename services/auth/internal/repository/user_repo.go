package repository

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"

	"github.com/upcore/auth/internal/db"
	"github.com/upcore/auth/internal/domain"
)

// UserRepo persists users.
type UserRepo struct {
	db *sqlx.DB
}

// NewUserRepo constructs a UserRepo.
func NewUserRepo(database *sqlx.DB) *UserRepo {
	return &UserRepo{db: database}
}

// GetByID returns a user by id or ErrUserNotFound.
func (r *UserRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	var u domain.User
	err := r.db.GetContext(ctx, &u, db.QUserGetByID, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrUserNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("user by id: %w", err)
	}
	return &u, nil
}

// GetByClerkID returns a user by their clerk id.
func (r *UserRepo) GetByClerkID(ctx context.Context, clerkID string) (*domain.User, error) {
	var u domain.User
	err := r.db.GetContext(ctx, &u, db.QUserGetByClerkID, clerkID)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrUserNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("user by clerk id: %w", err)
	}
	return &u, nil
}

// GetByEmail returns a user by (tenant_id, email).
func (r *UserRepo) GetByEmail(ctx context.Context, tenantID uuid.UUID, email string) (*domain.User, error) {
	var u domain.User
	err := r.db.GetContext(ctx, &u, db.QUserGetByEmail, tenantID, strings.ToLower(email))
	if errors.Is(err, sql.ErrNoRows) {
		return nil, domain.ErrUserNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("user by email: %w", err)
	}
	return &u, nil
}

// userRow wraps domain.User with metadata as string for correct JSONB binding.
type userRow struct {
	ID        uuid.UUID `db:"id"`
	ClerkID   string    `db:"clerk_id"`
	TenantID  uuid.UUID `db:"tenant_id"`
	Email     string    `db:"email"`
	FirstName string    `db:"first_name"`
	LastName  string    `db:"last_name"`
	Locale    string    `db:"locale"`
	Status    string    `db:"status"`
	Metadata  string    `db:"metadata"`
	CreatedAt time.Time `db:"created_at"`
	UpdatedAt time.Time `db:"updated_at"`
}

func toUserRow(u *domain.User) userRow {
	meta := string(u.Metadata)
	if meta == "" {
		meta = "{}"
	}
	return userRow{
		ID: u.ID, ClerkID: u.ClerkID, TenantID: u.TenantID, Email: u.Email,
		FirstName: u.FirstName, LastName: u.LastName, Locale: u.Locale,
		Status: string(u.Status), Metadata: meta,
		CreatedAt: u.CreatedAt, UpdatedAt: u.UpdatedAt,
	}
}

// Create inserts a user.
func (r *UserRepo) Create(ctx context.Context, u *domain.User) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	now := time.Now().UTC()
	if u.CreatedAt.IsZero() {
		u.CreatedAt = now
	}
	u.UpdatedAt = now
	u.Email = strings.ToLower(u.Email)
	if u.Metadata == nil {
		u.Metadata = json.RawMessage("{}")
	}
	if err := u.Validate(); err != nil {
		return err
	}
	if _, err := r.db.NamedExecContext(ctx, db.QUserInsert, toUserRow(u)); err != nil {
		if isUniqueViolation(err) {
			return domain.ErrUserAlreadyExists
		}
		return fmt.Errorf("insert user: %w", err)
	}
	return nil
}

// Update mutates existing user fields.
func (r *UserRepo) Update(ctx context.Context, u *domain.User) error {
	u.UpdatedAt = time.Now().UTC()
	u.Email = strings.ToLower(u.Email)
	if u.Metadata == nil {
		u.Metadata = json.RawMessage("{}")
	}
	res, err := r.db.NamedExecContext(ctx, db.QUserUpdate, toUserRow(u))
	if err != nil {
		return fmt.Errorf("update user: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrUserNotFound
	}
	return nil
}

// SoftDelete marks the user as deleted.
func (r *UserRepo) SoftDelete(ctx context.Context, id uuid.UUID) error {
	res, err := r.db.ExecContext(ctx, db.QUserSoftDelete, id)
	if err != nil {
		return fmt.Errorf("soft delete user: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrUserNotFound
	}
	return nil
}

// List returns a page of users within a tenant.
func (r *UserRepo) List(ctx context.Context, tenantID uuid.UUID, page, limit int) ([]*domain.User, int, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	if page < 0 {
		page = 0
	}
	offset := page * limit

	var users []*domain.User
	if err := r.db.SelectContext(ctx, &users, db.QUserListByTenant, tenantID, limit, offset); err != nil {
		return nil, 0, fmt.Errorf("list users: %w", err)
	}
	var total int
	if err := r.db.GetContext(ctx, &total, db.QUserCountByTenant, tenantID); err != nil {
		return nil, 0, fmt.Errorf("count users: %w", err)
	}
	return users, total, nil
}

// isUniqueViolation reports whether err is a PG unique-constraint error.
func isUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	var pqErr *pq.Error
	if errors.As(err, &pqErr) {
		return pqErr.Code == "23505"
	}
	// Fallback for wrapped/non-pq errors.
	return strings.Contains(err.Error(), "unique")
}
