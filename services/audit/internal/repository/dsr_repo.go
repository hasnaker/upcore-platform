package repository

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/audit/internal/domain"
)

// DSRRepository abstracts persistence for KVKK data subject rights requests.
type DSRRepository interface {
	Create(ctx context.Context, d *domain.DSRRequest) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.DSRRequest, error)
	Update(ctx context.Context, d *domain.DSRRequest) error
	List(ctx context.Context, filter domain.DSRFilter) ([]*domain.DSRRequest, int, error)
	ListBySubject(ctx context.Context, tenantID uuid.UUID, email string) ([]*domain.DSRRequest, error)
	ListByStatus(ctx context.Context, tenantID uuid.UUID, status string) ([]*domain.DSRRequest, error)
	ListOverdue(ctx context.Context, tenantID uuid.UUID) ([]*domain.DSRRequest, error)
}

type dsrRepo struct {
	db *sqlx.DB
}

// NewDSRRepository constructs a DSRRepository backed by sqlx.
func NewDSRRepository(db *sqlx.DB) DSRRepository {
	return &dsrRepo{db: db}
}

// Create inserts a new DSR request.
func (r *dsrRepo) Create(ctx context.Context, d *domain.DSRRequest) error {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	now := time.Now().UTC()
	if d.ReceivedAt.IsZero() {
		d.ReceivedAt = now
	}
	if d.CreatedAt.IsZero() {
		d.CreatedAt = now
	}
	if d.Status == "" {
		d.Status = domain.DSRStatusReceived
	}

	const q = `
		INSERT INTO kvkk_dsr_requests (
			id, tenant_id, data_subject_email, request_type, status,
			received_at, verified_at, completed_at, rejection_reason,
			response_data_url, handled_by, created_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
		)`
	_, err := r.db.ExecContext(ctx, q,
		d.ID, d.TenantID, d.DataSubjectEmail, d.RequestType, d.Status,
		d.ReceivedAt, d.VerifiedAt, d.CompletedAt, d.RejectionReason,
		d.ResponseDataURL, d.HandledBy, d.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert dsr request: %w", err)
	}
	return nil
}

// GetByID retrieves a single DSR request.
func (r *dsrRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.DSRRequest, error) {
	const q = `SELECT * FROM kvkk_dsr_requests WHERE id = $1 AND tenant_id = $2`
	var d domain.DSRRequest
	if err := r.db.GetContext(ctx, &d, q, id, tenantID); err != nil {
		if err == sql.ErrNoRows {
			return nil, domain.ErrDSRNotFound
		}
		return nil, fmt.Errorf("get dsr request: %w", err)
	}
	return &d, nil
}

// Update persists changes to a DSR request.
func (r *dsrRepo) Update(ctx context.Context, d *domain.DSRRequest) error {
	const q = `
		UPDATE kvkk_dsr_requests SET
			status = $1, verified_at = $2, completed_at = $3,
			rejection_reason = $4, response_data_url = $5, handled_by = $6
		WHERE id = $7 AND tenant_id = $8`
	result, err := r.db.ExecContext(ctx, q,
		d.Status, d.VerifiedAt, d.CompletedAt,
		d.RejectionReason, d.ResponseDataURL, d.HandledBy,
		d.ID, d.TenantID,
	)
	if err != nil {
		return fmt.Errorf("update dsr request: %w", err)
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return domain.ErrDSRNotFound
	}
	return nil
}

// List returns a paginated, filtered list of DSR requests.
func (r *dsrRepo) List(ctx context.Context, filter domain.DSRFilter) ([]*domain.DSRRequest, int, error) {
	if filter.Page < 1 {
		filter.Page = 1
	}
	if filter.Limit <= 0 || filter.Limit > 100 {
		filter.Limit = 20
	}
	offset := (filter.Page - 1) * filter.Limit

	var conds []string
	var args []any
	idx := 1

	if filter.TenantID != uuid.Nil {
		conds = append(conds, fmt.Sprintf("tenant_id = $%d", idx))
		args = append(args, filter.TenantID)
		idx++
	}
	if filter.Status != "" {
		conds = append(conds, fmt.Sprintf("status = $%d", idx))
		args = append(args, filter.Status)
		idx++
	}
	if filter.RequestType != "" {
		conds = append(conds, fmt.Sprintf("request_type = $%d", idx))
		args = append(args, filter.RequestType)
		idx++
	}
	if filter.Overdue {
		conds = append(conds, fmt.Sprintf(
			"received_at + interval '30 days' < $%d AND status NOT IN ('completed','rejected')", idx))
		args = append(args, time.Now().UTC())
		idx++
	}

	where := ""
	if len(conds) > 0 {
		where = "WHERE " + strings.Join(conds, " AND ")
	}

	countQ := fmt.Sprintf(`SELECT COUNT(*) FROM kvkk_dsr_requests %s`, where)
	var total int
	if err := r.db.GetContext(ctx, &total, countQ, args...); err != nil {
		return nil, 0, fmt.Errorf("count dsr requests: %w", err)
	}

	dataQ := fmt.Sprintf(
		`SELECT * FROM kvkk_dsr_requests %s ORDER BY received_at DESC LIMIT %d OFFSET %d`,
		where, filter.Limit, offset,
	)
	var items []*domain.DSRRequest
	if err := r.db.SelectContext(ctx, &items, dataQ, args...); err != nil {
		return nil, 0, fmt.Errorf("list dsr requests: %w", err)
	}
	return items, total, nil
}

// ListBySubject returns DSR requests for a specific data subject email.
func (r *dsrRepo) ListBySubject(ctx context.Context, tenantID uuid.UUID, email string) ([]*domain.DSRRequest, error) {
	const q = `
		SELECT * FROM kvkk_dsr_requests
		WHERE tenant_id = $1 AND data_subject_email = $2
		ORDER BY received_at DESC`
	var items []*domain.DSRRequest
	if err := r.db.SelectContext(ctx, &items, q, tenantID, email); err != nil {
		return nil, fmt.Errorf("list dsr by subject: %w", err)
	}
	return items, nil
}

// ListByStatus returns DSR requests with the given status.
func (r *dsrRepo) ListByStatus(ctx context.Context, tenantID uuid.UUID, status string) ([]*domain.DSRRequest, error) {
	const q = `
		SELECT * FROM kvkk_dsr_requests
		WHERE tenant_id = $1 AND status = $2
		ORDER BY received_at DESC`
	var items []*domain.DSRRequest
	if err := r.db.SelectContext(ctx, &items, q, tenantID, status); err != nil {
		return nil, fmt.Errorf("list dsr by status: %w", err)
	}
	return items, nil
}

// ListOverdue returns DSR requests that have exceeded the 30-day KVKK deadline.
func (r *dsrRepo) ListOverdue(ctx context.Context, tenantID uuid.UUID) ([]*domain.DSRRequest, error) {
	const q = `
		SELECT * FROM kvkk_dsr_requests
		WHERE tenant_id = $1
		  AND status NOT IN ('completed','rejected')
		  AND received_at + interval '30 days' < NOW()
		ORDER BY received_at ASC`
	var items []*domain.DSRRequest
	if err := r.db.SelectContext(ctx, &items, q, tenantID); err != nil {
		return nil, fmt.Errorf("list overdue dsr: %w", err)
	}
	return items, nil
}
