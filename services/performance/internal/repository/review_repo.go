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

	"github.com/upcore/performance/internal/domain"
)

// ReviewRepository abstracts app.performance_reviews + app.review_feedback.
type ReviewRepository interface {
	Create(ctx context.Context, rv *domain.PerformanceReview) error
	UpdateStatus(ctx context.Context, tenantID, id uuid.UUID, status domain.ReviewStatus) error
	UpdateContent(ctx context.Context, rv *domain.PerformanceReview) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.PerformanceReview, error)
	List(ctx context.Context, tenantID, cycleID, employeeID uuid.UUID, reviewType string) ([]*domain.PerformanceReview, error)
	AddFeedback(ctx context.Context, f *domain.ReviewFeedback) error
}

type reviewRepo struct{ db *sqlx.DB }

// NewReviewRepository constructs the repository.
func NewReviewRepository(d *sqlx.DB) ReviewRepository { return &reviewRepo{db: d} }

const reviewCols = `id, tenant_id, cycle_id, employee_id, reviewer_id, review_type,
	performance_rating, potential_rating, overall_comment, strengths, growth_areas,
	goals_achieved_pct, status, submitted_at, acknowledged_at, finalised_at,
	metadata, created_at, updated_at`

const feedbackCols = `id, tenant_id, review_id, competency_code, competency_name_tr,
	rating, comment, evidence, created_at, updated_at`

func (r *reviewRepo) Create(ctx context.Context, rv *domain.PerformanceReview) error {
	rv.ApplyDefaults()
	now := time.Now().UTC()
	if rv.CreatedAt.IsZero() {
		rv.CreatedAt = now
	}
	rv.UpdatedAt = now
	tx, err := beginTenantTx(ctx, r.db, rv.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	q := `INSERT INTO app.performance_reviews (
		id, tenant_id, cycle_id, employee_id, reviewer_id, review_type,
		performance_rating, potential_rating, overall_comment, strengths, growth_areas,
		goals_achieved_pct, status, submitted_at, acknowledged_at, finalised_at,
		metadata, created_at, updated_at
	) VALUES (
		:id, :tenant_id, :cycle_id, :employee_id, :reviewer_id, :review_type,
		:performance_rating, :potential_rating, :overall_comment, :strengths, :growth_areas,
		:goals_achieved_pct, :status, :submitted_at, :acknowledged_at, :finalised_at,
		:metadata, :created_at, :updated_at
	)`
	if _, err := tx.NamedExecContext(ctx, q, rv); err != nil {
		return fmt.Errorf("insert review: %w", err)
	}
	return tx.Commit()
}

func (r *reviewRepo) UpdateStatus(ctx context.Context, tenantID, id uuid.UUID, status domain.ReviewStatus) error {
	tx, err := beginTenantTx(ctx, r.db, tenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	now := time.Now().UTC()
	args := []any{tenantID, id, string(status), now}
	q := `UPDATE app.performance_reviews SET status = $3, updated_at = $4`
	switch status {
	case domain.ReviewSubmitted:
		q += `, submitted_at = $4`
	case domain.ReviewAcknowledged:
		q += `, acknowledged_at = $4`
	case domain.ReviewFinal:
		q += `, finalised_at = $4`
	}
	q += ` WHERE tenant_id = $1 AND id = $2`
	res, err := tx.ExecContext(ctx, q, args...)
	if err != nil {
		return fmt.Errorf("update review status: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return tx.Commit()
}

func (r *reviewRepo) UpdateContent(ctx context.Context, rv *domain.PerformanceReview) error {
	rv.UpdatedAt = time.Now().UTC()
	tx, err := beginTenantTx(ctx, r.db, rv.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	res, err := tx.NamedExecContext(ctx,
		`UPDATE app.performance_reviews SET
			performance_rating = :performance_rating, potential_rating = :potential_rating,
			overall_comment = :overall_comment, strengths = :strengths, growth_areas = :growth_areas,
			goals_achieved_pct = :goals_achieved_pct, metadata = :metadata,
			updated_at = :updated_at
		 WHERE tenant_id = :tenant_id AND id = :id`, rv)
	if err != nil {
		return fmt.Errorf("update review content: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return tx.Commit()
}

func (r *reviewRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.PerformanceReview, error) {
	tx, err := beginTenantTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	var rv domain.PerformanceReview
	q := `SELECT ` + reviewCols + ` FROM app.performance_reviews WHERE tenant_id = $1 AND id = $2`
	if err := tx.GetContext(ctx, &rv, q, tenantID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("select review: %w", err)
	}
	fb := []domain.ReviewFeedback{}
	if err := tx.SelectContext(ctx, &fb,
		`SELECT `+feedbackCols+` FROM app.review_feedback WHERE review_id = $1 ORDER BY competency_code`,
		id); err != nil {
		return nil, fmt.Errorf("select feedback: %w", err)
	}
	rv.Feedback = fb
	return &rv, nil
}

func (r *reviewRepo) List(ctx context.Context, tenantID, cycleID, employeeID uuid.UUID, reviewType string) ([]*domain.PerformanceReview, error) {
	tx, err := beginTenantTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	conds := []string{"tenant_id = $1"}
	args := []any{tenantID}
	i := 2
	if cycleID != uuid.Nil {
		conds = append(conds, fmt.Sprintf("cycle_id = $%d", i))
		args = append(args, cycleID)
		i++
	}
	if employeeID != uuid.Nil {
		conds = append(conds, fmt.Sprintf("employee_id = $%d", i))
		args = append(args, employeeID)
		i++
	}
	if s := strings.TrimSpace(reviewType); s != "" {
		conds = append(conds, fmt.Sprintf("review_type = $%d", i))
		args = append(args, s)
		i++
	}
	q := fmt.Sprintf("SELECT %s FROM app.performance_reviews WHERE %s ORDER BY created_at DESC",
		reviewCols, strings.Join(conds, " AND "))
	out := []*domain.PerformanceReview{}
	if err := tx.SelectContext(ctx, &out, q, args...); err != nil {
		return nil, fmt.Errorf("list reviews: %w", err)
	}
	return out, nil
}

func (r *reviewRepo) AddFeedback(ctx context.Context, f *domain.ReviewFeedback) error {
	f.ApplyDefaults()
	now := time.Now().UTC()
	if f.CreatedAt.IsZero() {
		f.CreatedAt = now
	}
	f.UpdatedAt = now
	tx, err := beginTenantTx(ctx, r.db, f.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	q := `INSERT INTO app.review_feedback (
		id, tenant_id, review_id, competency_code, competency_name_tr,
		rating, comment, evidence, created_at, updated_at
	) VALUES (
		:id, :tenant_id, :review_id, :competency_code, :competency_name_tr,
		:rating, :comment, :evidence, :created_at, :updated_at
	)`
	if _, err := tx.NamedExecContext(ctx, q, f); err != nil {
		return fmt.Errorf("insert feedback: %w", err)
	}
	return tx.Commit()
}
