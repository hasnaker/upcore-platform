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

	"github.com/upcore/survey/internal/domain"
)

// DistributionRepository abstracts persistence for distributions.
type DistributionRepository interface {
	Create(ctx context.Context, d *domain.Distribution) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Distribution, error)
	Update(ctx context.Context, d *domain.Distribution) error
	IncrementResponseCount(ctx context.Context, id uuid.UUID) error
	List(ctx context.Context, f DistFilter) ([]*domain.Distribution, int, error)
	ListExpired(ctx context.Context, now time.Time) ([]*domain.Distribution, error)
}

// DistFilter parameterises distribution listing.
type DistFilter struct {
	TenantID uuid.UUID
	Status   *domain.DistStatus
	SurveyID *uuid.UUID
	From     *time.Time
	To       *time.Time
	Limit    int
	Offset   int
}

type distRepo struct {
	db *sqlx.DB
}

// NewDistributionRepository constructs a DistributionRepository backed by sqlx.
func NewDistributionRepository(db *sqlx.DB) DistributionRepository {
	return &distRepo{db: db}
}

func (r *distRepo) Create(ctx context.Context, d *domain.Distribution) error {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	d.CreatedAt = time.Now().UTC()

	q := `INSERT INTO app.survey_distributions (
		id, tenant_id, schedule_id, survey_id, distributed_at, closes_at,
		target_count, response_count, status, created_at
	) VALUES (
		:id, :tenant_id, :schedule_id, :survey_id, :distributed_at, :closes_at,
		:target_count, :response_count, :status, :created_at
	)`
	_, err := r.db.NamedExecContext(ctx, q, d)
	if err != nil {
		return fmt.Errorf("insert distribution: %w", err)
	}
	return nil
}

func (r *distRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Distribution, error) {
	var d domain.Distribution
	q := `SELECT * FROM app.survey_distributions WHERE id = $1 AND tenant_id = $2`
	if err := r.db.GetContext(ctx, &d, q, id, tenantID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("select distribution: %w", err)
	}
	return &d, nil
}

func (r *distRepo) Update(ctx context.Context, d *domain.Distribution) error {
	q := `UPDATE app.survey_distributions SET
		status = :status, response_count = :response_count, closes_at = :closes_at
	WHERE id = :id AND tenant_id = :tenant_id`
	res, err := r.db.NamedExecContext(ctx, q, d)
	if err != nil {
		return fmt.Errorf("update distribution: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *distRepo) IncrementResponseCount(ctx context.Context, id uuid.UUID) error {
	q := `UPDATE app.survey_distributions SET response_count = response_count + 1 WHERE id = $1`
	_, err := r.db.ExecContext(ctx, q, id)
	if err != nil {
		return fmt.Errorf("increment response count: %w", err)
	}
	return nil
}

func (r *distRepo) List(ctx context.Context, f DistFilter) ([]*domain.Distribution, int, error) {
	if f.Limit <= 0 || f.Limit > 100 {
		f.Limit = 50
	}
	if f.Offset < 0 {
		f.Offset = 0
	}

	where := []string{"tenant_id = $1"}
	args := []any{f.TenantID}
	idx := 2

	if f.Status != nil {
		where = append(where, fmt.Sprintf("status = $%d", idx))
		args = append(args, string(*f.Status))
		idx++
	}
	if f.SurveyID != nil {
		where = append(where, fmt.Sprintf("survey_id = $%d", idx))
		args = append(args, *f.SurveyID)
		idx++
	}
	if f.From != nil {
		where = append(where, fmt.Sprintf("distributed_at >= $%d", idx))
		args = append(args, *f.From)
		idx++
	}
	if f.To != nil {
		where = append(where, fmt.Sprintf("distributed_at <= $%d", idx))
		args = append(args, *f.To)
		idx++
	}

	clause := strings.Join(where, " AND ")

	var total int
	if err := r.db.GetContext(ctx, &total, "SELECT COUNT(*) FROM app.survey_distributions WHERE "+clause, args...); err != nil {
		return nil, 0, fmt.Errorf("count distributions: %w", err)
	}

	q := fmt.Sprintf("SELECT * FROM app.survey_distributions WHERE %s ORDER BY distributed_at DESC LIMIT $%d OFFSET $%d",
		clause, idx, idx+1)
	args = append(args, f.Limit, f.Offset)

	var rows []*domain.Distribution
	if err := r.db.SelectContext(ctx, &rows, q, args...); err != nil {
		return nil, 0, fmt.Errorf("list distributions: %w", err)
	}
	return rows, total, nil
}

func (r *distRepo) ListExpired(ctx context.Context, now time.Time) ([]*domain.Distribution, error) {
	var rows []*domain.Distribution
	q := `SELECT * FROM app.survey_distributions
		WHERE status = 'open' AND closes_at <= $1
		ORDER BY closes_at ASC LIMIT 100`
	if err := r.db.SelectContext(ctx, &rows, q, now); err != nil {
		return nil, fmt.Errorf("list expired distributions: %w", err)
	}
	return rows, nil
}
