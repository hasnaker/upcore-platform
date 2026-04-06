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

// ApplicationFilter parameterises list queries.
type ApplicationFilter struct {
	TenantID      uuid.UUID
	RequisitionID *uuid.UUID
	CandidateID   *uuid.UUID
	Stage         string
	Page          int
	Limit         int
}

// ApplicationRepository abstracts persistence for applications.
type ApplicationRepository interface {
	Create(ctx context.Context, a *domain.Application) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Application, error)
	GetByCandidateRequisition(ctx context.Context, candidateID, requisitionID uuid.UUID) (*domain.Application, error)
	Update(ctx context.Context, a *domain.Application) error
	UpdateStage(ctx context.Context, id uuid.UUID, stage domain.Stage, rejectionReason *string) error
	UpdateScore(ctx context.Context, id uuid.UUID, score float64) error
	List(ctx context.Context, f ApplicationFilter) ([]*domain.Application, int, error)
	ListByRequisition(ctx context.Context, reqID uuid.UUID, stage *domain.Stage) ([]*domain.Application, error)
	ListByCandidate(ctx context.Context, candidateID uuid.UUID) ([]*domain.Application, error)
	CountByStage(ctx context.Context, reqID uuid.UUID) (map[domain.Stage]int, error)
	GetTimeInStageStats(ctx context.Context, tenantID uuid.UUID) ([]StageTimeStat, error)
}

// StageTimeStat holds average time spent in a stage.
type StageTimeStat struct {
	Stage   string  `db:"stage" json:"stage"`
	AvgDays float64 `db:"avg_days" json:"avg_days"`
}

type applicationRepo struct {
	db *sqlx.DB
}

// NewApplicationRepository constructs an ApplicationRepository backed by sqlx.
func NewApplicationRepository(d *sqlx.DB) ApplicationRepository {
	return &applicationRepo{db: d}
}

// Create inserts an application.
func (r *applicationRepo) Create(ctx context.Context, a *domain.Application) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	now := time.Now().UTC()
	if a.AppliedAt.IsZero() {
		a.AppliedAt = now
	}
	if a.StageEnteredAt.IsZero() {
		a.StageEnteredAt = now
	}
	a.UpdatedAt = now
	if a.CurrentStage == "" {
		a.CurrentStage = domain.StageApplied
	}

	_, err := r.db.NamedExecContext(ctx, db.QInsertApplication, a)
	if err != nil {
		pqErr := mapPqError(err)
		if errors.Is(pqErr, domain.ErrConflict) {
			return domain.ErrDuplicateApplication
		}
		return pqErr
	}
	return nil
}

// GetByID fetches an application by ID, scoped to tenant.
func (r *applicationRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Application, error) {
	var a domain.Application
	if err := r.db.GetContext(ctx, &a, db.QSelectApplicationByID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrApplicationNotFound
		}
		return nil, fmt.Errorf("select application: %w", err)
	}
	if a.TenantID != tenantID {
		return nil, domain.ErrApplicationNotFound
	}
	return &a, nil
}

// GetByCandidateRequisition fetches by (candidate, requisition).
func (r *applicationRepo) GetByCandidateRequisition(ctx context.Context, candidateID, requisitionID uuid.UUID) (*domain.Application, error) {
	var a domain.Application
	if err := r.db.GetContext(ctx, &a, db.QSelectApplicationByCandidateRequisition, candidateID, requisitionID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrApplicationNotFound
		}
		return nil, fmt.Errorf("select application by candidate+req: %w", err)
	}
	return &a, nil
}

// Update persists changes to an application.
func (r *applicationRepo) Update(ctx context.Context, a *domain.Application) error {
	a.UpdatedAt = time.Now().UTC()
	q := `UPDATE app.applications SET
		current_stage = :current_stage,
		stage_entered_at = :stage_entered_at,
		score = :score,
		rejection_reason = :rejection_reason,
		updated_at = :updated_at
	WHERE id = :id`
	res, err := r.db.NamedExecContext(ctx, q, a)
	if err != nil {
		return mapPqError(err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrApplicationNotFound
	}
	return nil
}

// UpdateStage updates just the stage-related fields.
func (r *applicationRepo) UpdateStage(ctx context.Context, id uuid.UUID, stage domain.Stage, rejectionReason *string) error {
	now := time.Now().UTC()
	var reason sql.NullString
	if rejectionReason != nil {
		reason = sql.NullString{String: *rejectionReason, Valid: true}
	}
	res, err := r.db.ExecContext(ctx, db.QUpdateApplicationStage, id, stage, now, reason)
	if err != nil {
		return fmt.Errorf("update stage: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrApplicationNotFound
	}
	return nil
}

// UpdateScore updates the application score.
func (r *applicationRepo) UpdateScore(ctx context.Context, id uuid.UUID, score float64) error {
	now := time.Now().UTC()
	res, err := r.db.ExecContext(ctx, db.QUpdateApplicationScore, id, score, now)
	if err != nil {
		return fmt.Errorf("update score: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrApplicationNotFound
	}
	return nil
}

// List returns a page of applications filtered by criteria.
func (r *applicationRepo) List(ctx context.Context, f ApplicationFilter) ([]*domain.Application, int, error) {
	if f.Limit <= 0 || f.Limit > 500 {
		f.Limit = 50
	}
	if f.Page <= 0 {
		f.Page = 1
	}
	offset := (f.Page - 1) * f.Limit

	where := []string{"tenant_id = $1"}
	args := []any{f.TenantID}
	idx := 2

	if f.RequisitionID != nil {
		where = append(where, fmt.Sprintf("requisition_id = $%d", idx))
		args = append(args, *f.RequisitionID)
		idx++
	}
	if f.CandidateID != nil {
		where = append(where, fmt.Sprintf("candidate_id = $%d", idx))
		args = append(args, *f.CandidateID)
		idx++
	}
	if f.Stage != "" {
		where = append(where, fmt.Sprintf("current_stage = $%d", idx))
		args = append(args, f.Stage)
		idx++
	}
	clause := strings.Join(where, " AND ")

	countQ := "SELECT COUNT(*) FROM app.applications WHERE " + clause
	var total int
	if err := r.db.GetContext(ctx, &total, countQ, args...); err != nil {
		return nil, 0, fmt.Errorf("count applications: %w", err)
	}

	listQ := fmt.Sprintf(
		"SELECT %s FROM app.applications WHERE %s ORDER BY applied_at DESC LIMIT $%d OFFSET $%d",
		db.ApplicationCols, clause, idx, idx+1,
	)
	args = append(args, f.Limit, offset)

	rows := []*domain.Application{}
	if err := r.db.SelectContext(ctx, &rows, listQ, args...); err != nil {
		return nil, 0, fmt.Errorf("list applications: %w", err)
	}
	return rows, total, nil
}

// ListByRequisition returns all applications for a requisition, optionally filtered by stage.
func (r *applicationRepo) ListByRequisition(ctx context.Context, reqID uuid.UUID, stage *domain.Stage) ([]*domain.Application, error) {
	q := `SELECT ` + db.ApplicationCols + ` FROM app.applications WHERE requisition_id = $1`
	args := []any{reqID}
	if stage != nil {
		q += ` AND current_stage = $2`
		args = append(args, *stage)
	}
	q += ` ORDER BY applied_at DESC`
	rows := []*domain.Application{}
	if err := r.db.SelectContext(ctx, &rows, q, args...); err != nil {
		return nil, fmt.Errorf("list by requisition: %w", err)
	}
	return rows, nil
}

// ListByCandidate returns all applications for a candidate.
func (r *applicationRepo) ListByCandidate(ctx context.Context, candidateID uuid.UUID) ([]*domain.Application, error) {
	q := `SELECT ` + db.ApplicationCols + ` FROM app.applications WHERE candidate_id = $1 ORDER BY applied_at DESC`
	rows := []*domain.Application{}
	if err := r.db.SelectContext(ctx, &rows, q, candidateID); err != nil {
		return nil, fmt.Errorf("list by candidate: %w", err)
	}
	return rows, nil
}

// CountByStage returns application counts grouped by stage for a requisition.
func (r *applicationRepo) CountByStage(ctx context.Context, reqID uuid.UUID) (map[domain.Stage]int, error) {
	type row struct {
		Stage string `db:"current_stage"`
		Count int    `db:"count"`
	}
	q := `SELECT current_stage, COUNT(*) as count FROM app.applications WHERE requisition_id = $1 GROUP BY current_stage`
	var rows []row
	if err := r.db.SelectContext(ctx, &rows, q, reqID); err != nil {
		return nil, fmt.Errorf("count by stage: %w", err)
	}
	out := make(map[domain.Stage]int, len(rows))
	for _, rr := range rows {
		out[domain.Stage(rr.Stage)] = rr.Count
	}
	return out, nil
}

// GetTimeInStageStats returns average time in stage across all applications.
func (r *applicationRepo) GetTimeInStageStats(ctx context.Context, tenantID uuid.UUID) ([]StageTimeStat, error) {
	q := `
		SELECT
			ae.to_stage AS stage,
			AVG(EXTRACT(EPOCH FROM (
				COALESCE(
					LEAD(ae.created_at) OVER (PARTITION BY ae.application_id ORDER BY ae.created_at),
					NOW()
				) - ae.created_at
			)) / 86400) AS avg_days
		FROM app.application_events ae
		WHERE ae.tenant_id = $1 AND ae.event_type = 'stage_changed' AND ae.to_stage IS NOT NULL
		GROUP BY ae.to_stage
		ORDER BY avg_days DESC`
	var stats []StageTimeStat
	if err := r.db.SelectContext(ctx, &stats, q, tenantID); err != nil {
		return nil, fmt.Errorf("time in stage stats: %w", err)
	}
	return stats, nil
}
