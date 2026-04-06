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

	"github.com/upcore/ats/internal/db"
	"github.com/upcore/ats/internal/domain"
)

// CandidateFilter parameterises list queries.
type CandidateFilter struct {
	TenantID uuid.UUID
	Search   string
	Source   string
	Tags     []string
	Page     int
	Limit    int
}

// CandidateRepository abstracts persistence for candidates.
type CandidateRepository interface {
	Create(ctx context.Context, c *domain.Candidate) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Candidate, error)
	GetByEmail(ctx context.Context, tenantID uuid.UUID, email string) (*domain.Candidate, error)
	Update(ctx context.Context, c *domain.Candidate) error
	HardDelete(ctx context.Context, tenantID, id uuid.UUID) error
	List(ctx context.Context, f CandidateFilter) ([]*domain.Candidate, int, error)
	Search(ctx context.Context, tenantID uuid.UUID, q string, limit int) ([]*domain.Candidate, error)
	Dedupe(ctx context.Context, tenantID uuid.UUID, email string) (*domain.Candidate, error)
}

type candidateRepo struct {
	db *sqlx.DB
}

// NewCandidateRepository constructs a CandidateRepository backed by sqlx.
func NewCandidateRepository(d *sqlx.DB) CandidateRepository {
	return &candidateRepo{db: d}
}

// Create inserts a candidate.
func (r *candidateRepo) Create(ctx context.Context, c *domain.Candidate) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	now := time.Now().UTC()
	if c.CreatedAt.IsZero() {
		c.CreatedAt = now
	}
	c.UpdatedAt = now
	c.ApplyDefaults()

	_, err := r.db.NamedExecContext(ctx, db.QInsertCandidate, c)
	if err != nil {
		pqErr := mapPqError(err)
		if errors.Is(pqErr, domain.ErrConflict) {
			return domain.ErrDuplicateEmail
		}
		return pqErr
	}
	return nil
}

// GetByID fetches a candidate by ID, scoped to tenant.
func (r *candidateRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Candidate, error) {
	var c domain.Candidate
	if err := r.db.GetContext(ctx, &c, db.QSelectCandidateByID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrCandidateNotFound
		}
		return nil, fmt.Errorf("select candidate: %w", err)
	}
	if c.TenantID != tenantID {
		return nil, domain.ErrCandidateNotFound
	}
	return &c, nil
}

// GetByEmail fetches a candidate by (tenant, email).
func (r *candidateRepo) GetByEmail(ctx context.Context, tenantID uuid.UUID, email string) (*domain.Candidate, error) {
	var c domain.Candidate
	if err := r.db.GetContext(ctx, &c, db.QSelectCandidateByEmail, tenantID, email); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrCandidateNotFound
		}
		return nil, fmt.Errorf("select candidate by email: %w", err)
	}
	return &c, nil
}

// Update persists changes to a candidate.
func (r *candidateRepo) Update(ctx context.Context, c *domain.Candidate) error {
	c.UpdatedAt = time.Now().UTC()
	res, err := r.db.NamedExecContext(ctx, db.QUpdateCandidate, c)
	if err != nil {
		return mapPqError(err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrCandidateNotFound
	}
	return nil
}

// HardDelete removes all PII + CV blobs. GDPR right-to-be-forgotten.
func (r *candidateRepo) HardDelete(ctx context.Context, tenantID, id uuid.UUID) error {
	q := `DELETE FROM app.candidates WHERE id = $1 AND tenant_id = $2`
	res, err := r.db.ExecContext(ctx, q, id, tenantID)
	if err != nil {
		return fmt.Errorf("hard delete candidate: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrCandidateNotFound
	}
	return nil
}

// List returns a page of candidates filtered by criteria.
func (r *candidateRepo) List(ctx context.Context, f CandidateFilter) ([]*domain.Candidate, int, error) {
	if f.Limit <= 0 || f.Limit > 500 {
		f.Limit = 50
	}
	if f.Page <= 0 {
		f.Page = 1
	}
	offset := (f.Page - 1) * f.Limit

	where := []string{"tenant_id = $1", "deleted_at IS NULL"}
	args := []any{f.TenantID}
	idx := 2

	if f.Source != "" {
		where = append(where, fmt.Sprintf("source = $%d", idx))
		args = append(args, f.Source)
		idx++
	}
	if s := strings.TrimSpace(f.Search); s != "" {
		where = append(where,
			fmt.Sprintf("(first_name ILIKE $%d OR last_name ILIKE $%d OR email ILIKE $%d OR COALESCE(cv_text_extracted,'') ILIKE $%d)",
				idx, idx, idx, idx))
		args = append(args, "%"+s+"%")
		idx++
	}
	clause := strings.Join(where, " AND ")

	countQ := "SELECT COUNT(*) FROM app.candidates WHERE " + clause
	var total int
	if err := r.db.GetContext(ctx, &total, countQ, args...); err != nil {
		return nil, 0, fmt.Errorf("count candidates: %w", err)
	}

	listQ := fmt.Sprintf(
		"SELECT %s FROM app.candidates WHERE %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d",
		db.CandidateCols, clause, idx, idx+1,
	)
	args = append(args, f.Limit, offset)

	rows := []*domain.Candidate{}
	if err := r.db.SelectContext(ctx, &rows, listQ, args...); err != nil {
		return nil, 0, fmt.Errorf("list candidates: %w", err)
	}
	return rows, total, nil
}

// Search runs FTS on name + cv_text.
func (r *candidateRepo) Search(ctx context.Context, tenantID uuid.UUID, q string, limit int) ([]*domain.Candidate, error) {
	q = strings.TrimSpace(q)
	if q == "" {
		return []*domain.Candidate{}, nil
	}
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	query := `
		SELECT ` + db.CandidateCols + `
		FROM app.candidates
		WHERE tenant_id = $1 AND deleted_at IS NULL
		  AND (
				(first_name || ' ' || last_name) ILIKE '%' || $2 || '%'
			 OR email ILIKE '%' || $2 || '%'
			 OR COALESCE(cv_text_extracted,'') ILIKE '%' || $2 || '%'
		  )
		ORDER BY created_at DESC
		LIMIT $3`
	rows := []*domain.Candidate{}
	if err := r.db.SelectContext(ctx, &rows, query, tenantID, q, limit); err != nil {
		return nil, fmt.Errorf("search candidates: %w", err)
	}
	return rows, nil
}

// Dedupe checks if a candidate with the given email already exists. Returns
// the existing candidate if found, nil otherwise.
func (r *candidateRepo) Dedupe(ctx context.Context, tenantID uuid.UUID, email string) (*domain.Candidate, error) {
	c, err := r.GetByEmail(ctx, tenantID, email)
	if err != nil {
		if errors.Is(err, domain.ErrCandidateNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return c, nil
}
