package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/survey/internal/domain"
)

// ScheduleRepository abstracts persistence for survey schedules.
type ScheduleRepository interface {
	Create(ctx context.Context, s *domain.Schedule) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Schedule, error)
	Update(ctx context.Context, s *domain.Schedule) error
	Delete(ctx context.Context, tenantID, id uuid.UUID) error
	List(ctx context.Context, tenantID uuid.UUID, activeOnly bool, limit, offset int) ([]*domain.Schedule, int, error)
	ListDue(ctx context.Context, now time.Time) ([]*domain.Schedule, error)
	UpdateNextRun(ctx context.Context, id uuid.UUID, nextRunAt time.Time, lastRunAt time.Time) error
}

// Schedule is the domain type for survey schedule; we store it in the domain package.
// Here we alias it for convenience in the manifest's file tree.
type Schedule = domain.Schedule

type scheduleRepo struct {
	db *sqlx.DB
}

// NewScheduleRepository constructs a ScheduleRepository backed by sqlx.
func NewScheduleRepository(db *sqlx.DB) ScheduleRepository {
	return &scheduleRepo{db: db}
}

func (r *scheduleRepo) Create(ctx context.Context, s *domain.Schedule) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	now := time.Now().UTC()
	s.CreatedAt = now
	s.UpdatedAt = now

	q := `INSERT INTO app.survey_schedules (
		id, tenant_id, survey_id, name, frequency, cron_expr,
		audience_filter, is_active, next_run_at, last_run_at,
		created_by, created_at, updated_at
	) VALUES (
		:id, :tenant_id, :survey_id, :name, :frequency, :cron_expr,
		:audience_filter, :is_active, :next_run_at, :last_run_at,
		:created_by, :created_at, :updated_at
	)`
	_, err := r.db.NamedExecContext(ctx, q, s)
	if err != nil {
		return fmt.Errorf("insert schedule: %w", err)
	}
	return nil
}

func (r *scheduleRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Schedule, error) {
	var s domain.Schedule
	q := `SELECT * FROM app.survey_schedules WHERE id = $1 AND tenant_id = $2`
	if err := r.db.GetContext(ctx, &s, q, id, tenantID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("select schedule: %w", err)
	}
	return &s, nil
}

func (r *scheduleRepo) Update(ctx context.Context, s *domain.Schedule) error {
	s.UpdatedAt = time.Now().UTC()
	q := `UPDATE app.survey_schedules SET
		name = :name, frequency = :frequency, cron_expr = :cron_expr,
		audience_filter = :audience_filter, is_active = :is_active,
		next_run_at = :next_run_at, updated_at = :updated_at
	WHERE id = :id AND tenant_id = :tenant_id`
	res, err := r.db.NamedExecContext(ctx, q, s)
	if err != nil {
		return fmt.Errorf("update schedule: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *scheduleRepo) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	q := `DELETE FROM app.survey_schedules WHERE id = $1 AND tenant_id = $2`
	res, err := r.db.ExecContext(ctx, q, id, tenantID)
	if err != nil {
		return fmt.Errorf("delete schedule: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *scheduleRepo) List(ctx context.Context, tenantID uuid.UUID, activeOnly bool, limit, offset int) ([]*domain.Schedule, int, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	where := "tenant_id = $1"
	args := []any{tenantID}
	if activeOnly {
		where += " AND is_active = true"
	}

	var total int
	if err := r.db.GetContext(ctx, &total, "SELECT COUNT(*) FROM app.survey_schedules WHERE "+where, args...); err != nil {
		return nil, 0, fmt.Errorf("count schedules: %w", err)
	}

	var rows []*domain.Schedule
	q := fmt.Sprintf("SELECT * FROM app.survey_schedules WHERE %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d",
		where, len(args)+1, len(args)+2)
	args = append(args, limit, offset)
	if err := r.db.SelectContext(ctx, &rows, q, args...); err != nil {
		return nil, 0, fmt.Errorf("list schedules: %w", err)
	}
	return rows, total, nil
}

func (r *scheduleRepo) ListDue(ctx context.Context, now time.Time) ([]*domain.Schedule, error) {
	var rows []*domain.Schedule
	q := `SELECT * FROM app.survey_schedules
		WHERE is_active = true AND next_run_at <= $1
		ORDER BY next_run_at ASC
		LIMIT 100`
	if err := r.db.SelectContext(ctx, &rows, q, now); err != nil {
		return nil, fmt.Errorf("list due schedules: %w", err)
	}
	return rows, nil
}

func (r *scheduleRepo) UpdateNextRun(ctx context.Context, id uuid.UUID, nextRunAt, lastRunAt time.Time) error {
	q := `UPDATE app.survey_schedules SET next_run_at = $2, last_run_at = $3, updated_at = $4 WHERE id = $1`
	_, err := r.db.ExecContext(ctx, q, id, nextRunAt, lastRunAt, time.Now().UTC())
	if err != nil {
		return fmt.Errorf("update next run: %w", err)
	}
	return nil
}
