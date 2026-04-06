package repository

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/notification/internal/domain"
)

// TemplateRepository abstracts persistence for notification templates.
type TemplateRepository interface {
	Create(ctx context.Context, t *domain.Template) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Template, error)
	GetByCode(ctx context.Context, tenantID *uuid.UUID, code, locale string) (*domain.Template, error)
	Update(ctx context.Context, t *domain.Template) error
	List(ctx context.Context, tenantID *uuid.UUID, channel, locale string, activeOnly bool, page, limit int) ([]*domain.Template, int, error)
	Activate(ctx context.Context, id uuid.UUID) error
	Deactivate(ctx context.Context, id uuid.UUID) error
}

type templateRepo struct {
	db *sqlx.DB
}

// NewTemplateRepository constructs a TemplateRepository backed by sqlx.
func NewTemplateRepository(db *sqlx.DB) TemplateRepository {
	return &templateRepo{db: db}
}

// Create inserts a new template.
func (r *templateRepo) Create(ctx context.Context, t *domain.Template) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	now := time.Now().UTC()
	t.CreatedAt = now
	t.UpdatedAt = now

	const q = `
		INSERT INTO notification_templates (
			id, tenant_id, template_key, channel, locale, subject, body,
			variables, active, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`
	_, err := r.db.ExecContext(ctx, q,
		t.ID, t.TenantID, t.Key, t.Channel, t.Locale, t.Subject, t.Body,
		t.Variables, t.Active, t.CreatedAt, t.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert template: %w", err)
	}
	return nil
}

// GetByID retrieves a template by ID.
func (r *templateRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Template, error) {
	const q = `SELECT * FROM notification_templates WHERE id = $1`
	var t domain.Template
	if err := r.db.GetContext(ctx, &t, q, id); err != nil {
		if err == sql.ErrNoRows {
			return nil, domain.ErrTemplateNotFound
		}
		return nil, fmt.Errorf("get template: %w", err)
	}
	return &t, nil
}

// GetByCode retrieves a template by code and locale, with fallback to system
// (NULL tenant_id) if a tenant-specific template is not found.
func (r *templateRepo) GetByCode(ctx context.Context, tenantID *uuid.UUID, code, locale string) (*domain.Template, error) {
	// Try tenant-specific first.
	if tenantID != nil {
		const q = `
			SELECT * FROM notification_templates
			WHERE template_key = $1 AND locale = $2 AND tenant_id = $3 AND active = true
			LIMIT 1`
		var t domain.Template
		err := r.db.GetContext(ctx, &t, q, code, locale, *tenantID)
		if err == nil {
			return &t, nil
		}
		if err != sql.ErrNoRows {
			return nil, fmt.Errorf("get template by code: %w", err)
		}
	}

	// Fall back to system template.
	const q = `
		SELECT * FROM notification_templates
		WHERE template_key = $1 AND locale = $2 AND tenant_id IS NULL AND active = true
		LIMIT 1`
	var t domain.Template
	if err := r.db.GetContext(ctx, &t, q, code, locale); err != nil {
		if err == sql.ErrNoRows {
			return nil, domain.ErrTemplateNotFound
		}
		return nil, fmt.Errorf("get system template: %w", err)
	}
	return &t, nil
}

// Update persists changes to a template.
func (r *templateRepo) Update(ctx context.Context, t *domain.Template) error {
	t.UpdatedAt = time.Now().UTC()
	const q = `
		UPDATE notification_templates SET
			template_key = $1, channel = $2, locale = $3, subject = $4,
			body = $5, variables = $6, active = $7, updated_at = $8
		WHERE id = $9`
	result, err := r.db.ExecContext(ctx, q,
		t.Key, t.Channel, t.Locale, t.Subject,
		t.Body, t.Variables, t.Active, t.UpdatedAt, t.ID,
	)
	if err != nil {
		return fmt.Errorf("update template: %w", err)
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return domain.ErrTemplateNotFound
	}
	return nil
}

// List returns a paginated, filtered list of templates.
func (r *templateRepo) List(ctx context.Context, tenantID *uuid.UUID, channel, locale string, activeOnly bool, page, limit int) ([]*domain.Template, int, error) {
	if page < 1 {
		page = 1
	}
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	offset := (page - 1) * limit

	var conds []string
	var args []any
	idx := 1

	if tenantID != nil {
		conds = append(conds, fmt.Sprintf("(tenant_id = $%d OR tenant_id IS NULL)", idx))
		args = append(args, *tenantID)
		idx++
	}
	if channel != "" {
		conds = append(conds, fmt.Sprintf("channel = $%d", idx))
		args = append(args, channel)
		idx++
	}
	if locale != "" {
		conds = append(conds, fmt.Sprintf("locale = $%d", idx))
		args = append(args, locale)
		idx++
	}
	if activeOnly {
		conds = append(conds, "active = true")
	}

	where := ""
	if len(conds) > 0 {
		where = "WHERE " + joinAnd(conds)
	}

	var total int
	if err := r.db.GetContext(ctx, &total,
		fmt.Sprintf("SELECT COUNT(*) FROM notification_templates %s", where), args...); err != nil {
		return nil, 0, fmt.Errorf("count templates: %w", err)
	}

	var items []*domain.Template
	if err := r.db.SelectContext(ctx, &items,
		fmt.Sprintf("SELECT * FROM notification_templates %s ORDER BY template_key, locale LIMIT %d OFFSET %d", where, limit, offset),
		args...); err != nil {
		return nil, 0, fmt.Errorf("list templates: %w", err)
	}
	return items, total, nil
}

// Activate sets a template to active.
func (r *templateRepo) Activate(ctx context.Context, id uuid.UUID) error {
	const q = `UPDATE notification_templates SET active = true, updated_at = NOW() WHERE id = $1`
	result, err := r.db.ExecContext(ctx, q, id)
	if err != nil {
		return fmt.Errorf("activate template: %w", err)
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return domain.ErrTemplateNotFound
	}
	return nil
}

// Deactivate sets a template to inactive.
func (r *templateRepo) Deactivate(ctx context.Context, id uuid.UUID) error {
	const q = `UPDATE notification_templates SET active = false, updated_at = NOW() WHERE id = $1`
	result, err := r.db.ExecContext(ctx, q, id)
	if err != nil {
		return fmt.Errorf("deactivate template: %w", err)
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return domain.ErrTemplateNotFound
	}
	return nil
}

func joinAnd(conds []string) string {
	result := conds[0]
	for i := 1; i < len(conds); i++ {
		result += " AND " + conds[i]
	}
	return result
}
