package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"

	"github.com/upcore/tenant/internal/db"
	"github.com/upcore/tenant/internal/domain"
)

// TenantRepository abstracts tenant persistence.
type TenantRepository interface {
	Create(ctx context.Context, tx Querier, t *domain.Tenant) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Tenant, error)
	GetBySlug(ctx context.Context, slug string) (*domain.Tenant, error)
	Update(ctx context.Context, t *domain.Tenant) error
	SoftDelete(ctx context.Context, id uuid.UUID, at time.Time) error
	HardDelete(ctx context.Context, id uuid.UUID) error
	ListPendingHardDelete(ctx context.Context, graceDays int) ([]*domain.Tenant, error)
	ListAdmin(ctx context.Context, f TenantListFilter) ([]*domain.TenantAdminRow, int, error)
}

// TenantListFilter captures optional filters for admin tenant listings.
// Empty / nil values disable the corresponding filter. Page is 1-based.
type TenantListFilter struct {
	Status   string // trial|active|suspended|deleted, "" for all non-deleted
	PlanID   string // plan id filter, "" disables
	Search   string // trimmed case-insensitive, matches name/slug
	Page     int    // 1-based, minimum 1
	PageSize int    // 1..100, default 25
}

// Querier is a small interface implemented by *sqlx.DB and *sqlx.Tx.
type Querier interface {
	NamedExecContext(ctx context.Context, query string, arg any) (sql.Result, error)
	GetContext(ctx context.Context, dest any, query string, args ...any) error
	SelectContext(ctx context.Context, dest any, query string, args ...any) error
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
}

type tenantRepo struct {
	db *sqlx.DB
}

// NewTenantRepository creates a new TenantRepository.
func NewTenantRepository(d *sqlx.DB) TenantRepository {
	return &tenantRepo{db: d}
}

// Create inserts a tenant. If tx is nil, runs on the underlying db pool.
func (r *tenantRepo) Create(ctx context.Context, tx Querier, t *domain.Tenant) error {
	if tx == nil {
		tx = r.db
	}
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	now := time.Now().UTC()
	if t.CreatedAt.IsZero() {
		t.CreatedAt = now
	}
	t.UpdatedAt = now
	if t.Country == "" {
		t.Country = "TR"
	}
	if t.Locale == "" {
		t.Locale = "tr-TR"
	}
	if t.Status == "" {
		t.Status = domain.TenantStatusTrial
	}

	if _, err := tx.NamedExecContext(ctx, db.QInsertTenant, t); err != nil {
		if isUniqueViolation(err, "tenants_slug_key", "idx_tenants_slug_active", "slug") {
			return domain.ErrSlugTaken
		}
		return fmt.Errorf("insert tenant: %w", err)
	}
	return nil
}

func (r *tenantRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Tenant, error) {
	var t domain.Tenant
	if err := r.db.GetContext(ctx, &t, db.QSelectTenantByID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrTenantNotFound
		}
		return nil, fmt.Errorf("select tenant: %w", err)
	}
	return &t, nil
}

func (r *tenantRepo) GetBySlug(ctx context.Context, slug string) (*domain.Tenant, error) {
	var t domain.Tenant
	if err := r.db.GetContext(ctx, &t, db.QSelectTenantBySlug, slug); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrTenantNotFound
		}
		return nil, fmt.Errorf("select tenant by slug: %w", err)
	}
	return &t, nil
}

func (r *tenantRepo) Update(ctx context.Context, t *domain.Tenant) error {
	t.UpdatedAt = time.Now().UTC()
	res, err := r.db.NamedExecContext(ctx, db.QUpdateTenant, t)
	if err != nil {
		return fmt.Errorf("update tenant: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrTenantNotFound
	}
	return nil
}

func (r *tenantRepo) SoftDelete(ctx context.Context, id uuid.UUID, at time.Time) error {
	res, err := r.db.ExecContext(ctx, db.QSoftDeleteTenant, id, at.UTC())
	if err != nil {
		return fmt.Errorf("soft delete tenant: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrTenantNotFound
	}
	return nil
}

func (r *tenantRepo) HardDelete(ctx context.Context, id uuid.UUID) error {
	_, err := r.db.ExecContext(ctx, db.QHardDeleteTenant, id)
	if err != nil {
		return fmt.Errorf("hard delete tenant: %w", err)
	}
	return nil
}

func (r *tenantRepo) ListPendingHardDelete(ctx context.Context, graceDays int) ([]*domain.Tenant, error) {
	q := `
		SELECT id, name, slug, vkn, tckn, country, locale, status,
			trial_ends_at, deleted_at, created_at, updated_at
		FROM tenants
		WHERE deleted_at IS NOT NULL
		  AND deleted_at < (now() - ($1 || ' days')::interval)`
	var ts []*domain.Tenant
	if err := r.db.SelectContext(ctx, &ts, q, fmt.Sprintf("%d", graceDays)); err != nil {
		return nil, fmt.Errorf("list pending hard delete: %w", err)
	}
	return ts, nil
}

// ListAdmin returns the paginated admin view of tenants with plan + latest
// employee usage joined in. Soft-deleted tenants are excluded. Returns the
// page slice and the total matching row count.
func (r *tenantRepo) ListAdmin(ctx context.Context, f TenantListFilter) ([]*domain.TenantAdminRow, int, error) {
	page := f.Page
	if page < 1 {
		page = 1
	}
	size := f.PageSize
	if size <= 0 {
		size = 25
	}
	if size > 100 {
		size = 100
	}
	offset := (page - 1) * size

	where := []string{"t.deleted_at IS NULL"}
	args := []any{}
	i := 1

	status := strings.ToLower(strings.TrimSpace(f.Status))
	switch status {
	case "", "all":
		// default excludes deleted (already applied)
	case "trial", "active", "suspended", "deleted":
		where = append(where, fmt.Sprintf("t.status = $%d", i))
		args = append(args, status)
		i++
	default:
		return nil, 0, domain.NewValidationError(map[string]string{"status": "invalid"})
	}

	plan := strings.TrimSpace(f.PlanID)
	if plan != "" {
		where = append(where, fmt.Sprintf("s.plan_id = $%d", i))
		args = append(args, plan)
		i++
	}

	search := strings.TrimSpace(f.Search)
	if search != "" {
		pattern := "%" + strings.ToLower(search) + "%"
		where = append(where, fmt.Sprintf("(LOWER(t.name) LIKE $%d OR LOWER(t.slug) LIKE $%d)", i, i))
		args = append(args, pattern)
		i++
	}

	whereSQL := "WHERE " + strings.Join(where, " AND ")

	// Count first (same WHERE).
	var total int
	countSQL := fmt.Sprintf(`
		SELECT COUNT(*) FROM tenants t
		LEFT JOIN LATERAL (
			SELECT plan_id, status AS sub_status, seats
			FROM subscriptions
			WHERE tenant_id = t.id
			ORDER BY created_at DESC
			LIMIT 1
		) s ON TRUE
		%s`, whereSQL)
	if err := r.db.GetContext(ctx, &total, countSQL, args...); err != nil {
		return nil, 0, fmt.Errorf("count tenants: %w", err)
	}

	listSQL := fmt.Sprintf(`
		SELECT
			t.id, t.name, t.slug, t.country, t.locale, t.status,
			t.trial_ends_at, t.created_at, t.updated_at,
			s.plan_id, s.sub_status, s.seats,
			COALESCE(u.value, 0) AS employee_count
		FROM tenants t
		LEFT JOIN LATERAL (
			SELECT plan_id, status AS sub_status, seats
			FROM subscriptions
			WHERE tenant_id = t.id
			ORDER BY created_at DESC
			LIMIT 1
		) s ON TRUE
		LEFT JOIN LATERAL (
			SELECT value
			FROM usage_counters
			WHERE tenant_id = t.id AND metric = 'employees'
			ORDER BY period_start DESC
			LIMIT 1
		) u ON TRUE
		%s
		ORDER BY t.created_at DESC
		LIMIT $%d OFFSET $%d`, whereSQL, i, i+1)
	args = append(args, size, offset)

	rows := []*domain.TenantAdminRow{}
	if err := r.db.SelectContext(ctx, &rows, listSQL, args...); err != nil {
		return nil, 0, fmt.Errorf("list tenants admin: %w", err)
	}
	return rows, total, nil
}

// isUniqueViolation returns true for pq unique_violation on any matching constraint.
func isUniqueViolation(err error, hints ...string) bool {
	var pqe *pq.Error
	if !errors.As(err, &pqe) {
		return false
	}
	if pqe.Code != "23505" {
		return false
	}
	if len(hints) == 0 {
		return true
	}
	for _, h := range hints {
		if strings.Contains(pqe.Constraint, h) || strings.Contains(pqe.Message, h) {
			return true
		}
	}
	return false
}
