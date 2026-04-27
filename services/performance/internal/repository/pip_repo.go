// Package repository — PIP persistence.
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

// PipListFilter narrows a case listing.
type PipListFilter struct {
	EmployeeID uuid.UUID
	ManagerID  uuid.UUID
	Status     string
	Reason     string
	// IncludeClosed — when true, passed + terminated are included.
	IncludeClosed bool
}

// PipRepository — PIP aggregate CRUD + state transitions + retention.
type PipRepository interface {
	// Case-level
	CreateCaseWithGoals(ctx context.Context, c *domain.PipCase, goals []*domain.PipGoal) error
	UpdateCaseStatus(
		ctx context.Context,
		tenantID, caseID uuid.UUID,
		legalReviewerID *uuid.UUID, legalReviewed *bool,
		legalFileURL *string, outcomeReason *string,
		nextStatus domain.PipStatus,
	) error
	SetHRReviewer(ctx context.Context, tenantID, caseID uuid.UUID, hrReviewerID uuid.UUID) error
	SetDurationDays(ctx context.Context, tenantID, caseID uuid.UUID, durationDays int) error
	GetCase(ctx context.Context, tenantID, caseID uuid.UUID) (*domain.PipCase, error)
	GetCaseWithRelations(ctx context.Context, tenantID, caseID uuid.UUID) (*domain.PipCase, error)
	ListCases(ctx context.Context, tenantID uuid.UUID, filter PipListFilter, limit, offset int) ([]*domain.PipCase, int, error)

	// Goals
	AddGoal(ctx context.Context, g *domain.PipGoal) error
	ListGoals(ctx context.Context, tenantID, caseID uuid.UUID) ([]domain.PipGoal, error)

	// Check-ins
	AddCheckin(ctx context.Context, k *domain.PipCheckin) error
	AcknowledgeCheckin(ctx context.Context, tenantID, checkinID uuid.UUID, ack *domain.PipCheckin) error
	ListCheckins(ctx context.Context, tenantID, caseID uuid.UUID) ([]domain.PipCheckin, error)

	// Outcome (1:1) — closes the case atomically with status update.
	CloseCase(
		ctx context.Context,
		tenantID, caseID uuid.UUID,
		legalFileURL *string, outcomeReason string,
		nextStatus domain.PipStatus,
		outcome *domain.PipOutcome,
	) error
	GetOutcome(ctx context.Context, tenantID, caseID uuid.UUID) (*domain.PipOutcome, error)

	// Retention helpers
	RetentionCandidates(ctx context.Context, olderThan time.Time) ([]uuid.UUID, error)
}

type pipRepo struct{ db *sqlx.DB }

// NewPipRepository constructs a sqlx-backed PIP repository.
func NewPipRepository(d *sqlx.DB) PipRepository { return &pipRepo{db: d} }

const pipCaseCols = `id, tenant_id, employee_id, initiated_by, hr_reviewer_id, legal_reviewer_id,
	legal_reviewed, reason_category, reason_summary, start_date, duration_days,
	status, legal_file_url, outcome_reason, created_at, updated_at`

const pipGoalCols = `id, tenant_id, case_id, description, measurable_target, deadline, priority, created_at`

const pipCheckinCols = `id, tenant_id, case_id, week_number, on_track, manager_notes, employee_notes,
	acknowledged_by_employee, acknowledge_ip, acknowledge_user_agent, created_by, created_at`

const pipOutcomeCols = `id, tenant_id, case_id, result, legal_file_url, outcome_notes, closed_at, closed_by, created_at`

// ============================================================================
// Case CRUD
// ============================================================================

// CreateCaseWithGoals inserts a case and its initial goals inside a single tx.
func (r *pipRepo) CreateCaseWithGoals(ctx context.Context, c *domain.PipCase, goals []*domain.PipGoal) error {
	c.ApplyDefaults()
	if c.CreatedAt.IsZero() {
		c.CreatedAt = time.Now().UTC()
	}
	c.UpdatedAt = c.CreatedAt
	tx, err := beginTenantTx(ctx, r.db, c.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	if _, err := tx.NamedExecContext(ctx, `INSERT INTO app.pip_cases (
		id, tenant_id, employee_id, initiated_by, hr_reviewer_id, legal_reviewer_id,
		legal_reviewed, reason_category, reason_summary, start_date, duration_days,
		status, legal_file_url, outcome_reason, created_at, updated_at
	) VALUES (
		:id, :tenant_id, :employee_id, :initiated_by, :hr_reviewer_id, :legal_reviewer_id,
		:legal_reviewed, :reason_category, :reason_summary, :start_date, :duration_days,
		:status, :legal_file_url, :outcome_reason, :created_at, :updated_at
	)`, c); err != nil {
		return fmt.Errorf("insert pip_case: %w", err)
	}
	for _, g := range goals {
		g.ApplyDefaults()
		if g.CreatedAt.IsZero() {
			g.CreatedAt = time.Now().UTC()
		}
		if _, err := tx.NamedExecContext(ctx,
			`INSERT INTO app.pip_goals (`+pipGoalCols+`) VALUES (
				:id, :tenant_id, :case_id, :description, :measurable_target, :deadline, :priority, :created_at
			)`, g); err != nil {
			return fmt.Errorf("insert initial goal: %w", err)
		}
	}
	return tx.Commit()
}

// UpdateCaseStatus mutates status + optional legal/outcome fields.
func (r *pipRepo) UpdateCaseStatus(
	ctx context.Context,
	tenantID, caseID uuid.UUID,
	legalReviewerID *uuid.UUID, legalReviewed *bool,
	legalFileURL *string, outcomeReason *string,
	nextStatus domain.PipStatus,
) error {
	tx, err := beginTenantTx(ctx, r.db, tenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	if err := applyStatusUpdate(ctx, tx, tenantID, caseID, legalReviewerID, legalReviewed, legalFileURL, outcomeReason, nextStatus); err != nil {
		return err
	}
	return tx.Commit()
}

// SetHRReviewer assigns the HR reviewer on a case.
func (r *pipRepo) SetHRReviewer(ctx context.Context, tenantID, caseID, hrReviewerID uuid.UUID) error {
	tx, err := beginTenantTx(ctx, r.db, tenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	res, err := tx.ExecContext(ctx,
		`UPDATE app.pip_cases SET hr_reviewer_id=$3, updated_at=NOW()
		 WHERE tenant_id=$1 AND id=$2`,
		tenantID, caseID, hrReviewerID)
	if err != nil {
		return fmt.Errorf("set hr reviewer: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrNotFound
	}
	return tx.Commit()
}

// SetDurationDays updates a case's duration (for extensions).
func (r *pipRepo) SetDurationDays(ctx context.Context, tenantID, caseID uuid.UUID, durationDays int) error {
	tx, err := beginTenantTx(ctx, r.db, tenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	res, err := tx.ExecContext(ctx,
		`UPDATE app.pip_cases SET duration_days=$3, updated_at=NOW()
		 WHERE tenant_id=$1 AND id=$2`,
		tenantID, caseID, durationDays)
	if err != nil {
		return fmt.Errorf("set duration_days: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrNotFound
	}
	return tx.Commit()
}

// applyStatusUpdate is the shared SQL fragment for status transitions.
func applyStatusUpdate(
	ctx context.Context, tx *sqlx.Tx,
	tenantID, caseID uuid.UUID,
	legalReviewerID *uuid.UUID, legalReviewed *bool,
	legalFileURL *string, outcomeReason *string,
	nextStatus domain.PipStatus,
) error {
	sets := []string{"status = :status", "updated_at = :updated_at"}
	params := map[string]any{
		"tenant_id":  tenantID,
		"id":         caseID,
		"status":     string(nextStatus),
		"updated_at": time.Now().UTC(),
	}
	if legalReviewerID != nil {
		sets = append(sets, "legal_reviewer_id = :legal_reviewer_id")
		params["legal_reviewer_id"] = *legalReviewerID
	}
	if legalReviewed != nil {
		sets = append(sets, "legal_reviewed = :legal_reviewed")
		params["legal_reviewed"] = *legalReviewed
	}
	if legalFileURL != nil {
		sets = append(sets, "legal_file_url = :legal_file_url")
		params["legal_file_url"] = *legalFileURL
	}
	if outcomeReason != nil {
		sets = append(sets, "outcome_reason = :outcome_reason")
		params["outcome_reason"] = *outcomeReason
	}
	q := fmt.Sprintf(`UPDATE app.pip_cases SET %s WHERE tenant_id = :tenant_id AND id = :id`,
		strings.Join(sets, ", "))
	res, err := tx.NamedExecContext(ctx, q, params)
	if err != nil {
		return fmt.Errorf("update pip_case status: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *pipRepo) GetCase(ctx context.Context, tenantID, caseID uuid.UUID) (*domain.PipCase, error) {
	tx, err := beginTenantTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	var c domain.PipCase
	err = tx.GetContext(ctx, &c,
		`SELECT `+pipCaseCols+` FROM app.pip_cases WHERE tenant_id=$1 AND id=$2`,
		tenantID, caseID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("get pip_case: %w", err)
	}
	return &c, nil
}

func (r *pipRepo) GetCaseWithRelations(ctx context.Context, tenantID, caseID uuid.UUID) (*domain.PipCase, error) {
	c, err := r.GetCase(ctx, tenantID, caseID)
	if err != nil {
		return nil, err
	}
	goals, err := r.ListGoals(ctx, tenantID, caseID)
	if err != nil {
		return nil, err
	}
	c.Goals = goals
	ck, err := r.ListCheckins(ctx, tenantID, caseID)
	if err != nil {
		return nil, err
	}
	c.Checkins = ck
	out, err := r.GetOutcome(ctx, tenantID, caseID)
	if err != nil && !errors.Is(err, domain.ErrNotFound) {
		return nil, err
	}
	c.Outcome = out
	return c, nil
}

func (r *pipRepo) ListCases(ctx context.Context, tenantID uuid.UUID, filter PipListFilter, limit, offset int) ([]*domain.PipCase, int, error) {
	if limit <= 0 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	tx, err := beginTenantTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, 0, err
	}
	defer func() { _ = tx.Rollback() }()

	where := []string{"tenant_id = $1"}
	args := []any{tenantID}
	if filter.EmployeeID != uuid.Nil {
		args = append(args, filter.EmployeeID)
		where = append(where, fmt.Sprintf("employee_id = $%d", len(args)))
	}
	if filter.ManagerID != uuid.Nil {
		args = append(args, filter.ManagerID)
		where = append(where, fmt.Sprintf("initiated_by = $%d", len(args)))
	}
	if filter.Status != "" {
		args = append(args, filter.Status)
		where = append(where, fmt.Sprintf("status = $%d", len(args)))
	}
	if filter.Reason != "" {
		args = append(args, filter.Reason)
		where = append(where, fmt.Sprintf("reason_category = $%d", len(args)))
	}
	if !filter.IncludeClosed && filter.Status == "" {
		where = append(where, "status NOT IN ('passed','terminated')")
	}
	whereSQL := strings.Join(where, " AND ")

	var total int
	if err := tx.GetContext(ctx, &total, `SELECT COUNT(*) FROM app.pip_cases WHERE `+whereSQL, args...); err != nil {
		return nil, 0, fmt.Errorf("count pip_cases: %w", err)
	}

	args = append(args, limit, offset)
	q := fmt.Sprintf(`SELECT `+pipCaseCols+` FROM app.pip_cases WHERE %s
		ORDER BY start_date DESC, created_at DESC LIMIT $%d OFFSET $%d`,
		whereSQL, len(args)-1, len(args))
	out := []*domain.PipCase{}
	if err := tx.SelectContext(ctx, &out, q, args...); err != nil {
		return nil, 0, fmt.Errorf("list pip_cases: %w", err)
	}
	return out, total, nil
}

// ============================================================================
// Goals
// ============================================================================

func (r *pipRepo) AddGoal(ctx context.Context, g *domain.PipGoal) error {
	g.ApplyDefaults()
	if g.CreatedAt.IsZero() {
		g.CreatedAt = time.Now().UTC()
	}
	tx, err := beginTenantTx(ctx, r.db, g.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	if _, err := tx.NamedExecContext(ctx,
		`INSERT INTO app.pip_goals (`+pipGoalCols+`) VALUES (
			:id, :tenant_id, :case_id, :description, :measurable_target, :deadline, :priority, :created_at
		)`, g); err != nil {
		return fmt.Errorf("insert pip_goal: %w", err)
	}
	return tx.Commit()
}

func (r *pipRepo) ListGoals(ctx context.Context, tenantID, caseID uuid.UUID) ([]domain.PipGoal, error) {
	tx, err := beginTenantTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	out := []domain.PipGoal{}
	if err := tx.SelectContext(ctx, &out,
		`SELECT `+pipGoalCols+` FROM app.pip_goals
		 WHERE tenant_id=$1 AND case_id=$2 ORDER BY deadline, created_at`,
		tenantID, caseID); err != nil {
		return nil, fmt.Errorf("list pip_goals: %w", err)
	}
	return out, nil
}

// ============================================================================
// Check-ins
// ============================================================================

func (r *pipRepo) AddCheckin(ctx context.Context, k *domain.PipCheckin) error {
	k.ApplyDefaults()
	if k.CreatedAt.IsZero() {
		k.CreatedAt = time.Now().UTC()
	}
	tx, err := beginTenantTx(ctx, r.db, k.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	if _, err := tx.NamedExecContext(ctx,
		`INSERT INTO app.pip_checkins (`+pipCheckinCols+`) VALUES (
			:id, :tenant_id, :case_id, :week_number, :on_track, :manager_notes, :employee_notes,
			:acknowledged_by_employee, :acknowledge_ip, :acknowledge_user_agent, :created_by, :created_at
		)`, k); err != nil {
		if strings.Contains(err.Error(), "pip_checkins_tenant_id_case_id_week_number_key") ||
			strings.Contains(err.Error(), "duplicate key") {
			return domain.ErrConflict
		}
		return fmt.Errorf("insert pip_checkin: %w", err)
	}
	return tx.Commit()
}

func (r *pipRepo) AcknowledgeCheckin(ctx context.Context, tenantID, checkinID uuid.UUID, ack *domain.PipCheckin) error {
	tx, err := beginTenantTx(ctx, r.db, tenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	res, err := tx.ExecContext(ctx,
		`UPDATE app.pip_checkins SET
			acknowledged_by_employee = $3,
			acknowledge_ip = $4,
			acknowledge_user_agent = $5,
			employee_notes = COALESCE($6, employee_notes)
		 WHERE tenant_id=$1 AND id=$2 AND acknowledged_by_employee IS NULL`,
		tenantID, checkinID,
		ack.AcknowledgedByEmployee, ack.AcknowledgeIP, ack.AcknowledgeUserAgent,
		ack.EmployeeNotes,
	)
	if err != nil {
		return fmt.Errorf("ack pip_checkin: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrConflict
	}
	return tx.Commit()
}

func (r *pipRepo) ListCheckins(ctx context.Context, tenantID, caseID uuid.UUID) ([]domain.PipCheckin, error) {
	tx, err := beginTenantTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	out := []domain.PipCheckin{}
	if err := tx.SelectContext(ctx, &out,
		`SELECT `+pipCheckinCols+` FROM app.pip_checkins
		 WHERE tenant_id=$1 AND case_id=$2 ORDER BY week_number`,
		tenantID, caseID); err != nil {
		return nil, fmt.Errorf("list pip_checkins: %w", err)
	}
	return out, nil
}

// ============================================================================
// Outcome
// ============================================================================

// CloseCase atomically transitions the case to passed/terminated and
// writes the matching outcome row.
func (r *pipRepo) CloseCase(
	ctx context.Context,
	tenantID, caseID uuid.UUID,
	legalFileURL *string, outcomeReason string,
	nextStatus domain.PipStatus,
	outcome *domain.PipOutcome,
) error {
	tx, err := beginTenantTx(ctx, r.db, tenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	if err := applyStatusUpdate(ctx, tx, tenantID, caseID, nil, nil, legalFileURL, &outcomeReason, nextStatus); err != nil {
		return err
	}
	outcome.ApplyDefaults()
	if outcome.CreatedAt.IsZero() {
		outcome.CreatedAt = time.Now().UTC()
	}
	if _, err := tx.NamedExecContext(ctx,
		`INSERT INTO app.pip_outcome (`+pipOutcomeCols+`) VALUES (
			:id, :tenant_id, :case_id, :result, :legal_file_url, :outcome_notes, :closed_at, :closed_by, :created_at
		) ON CONFLICT (case_id) DO UPDATE SET
			result = EXCLUDED.result,
			legal_file_url = EXCLUDED.legal_file_url,
			outcome_notes = EXCLUDED.outcome_notes,
			closed_at = EXCLUDED.closed_at,
			closed_by = EXCLUDED.closed_by`, outcome); err != nil {
		return fmt.Errorf("upsert pip_outcome: %w", err)
	}
	return tx.Commit()
}

func (r *pipRepo) GetOutcome(ctx context.Context, tenantID, caseID uuid.UUID) (*domain.PipOutcome, error) {
	tx, err := beginTenantTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	var o domain.PipOutcome
	err = tx.GetContext(ctx, &o,
		`SELECT `+pipOutcomeCols+` FROM app.pip_outcome WHERE tenant_id=$1 AND case_id=$2`,
		tenantID, caseID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("get pip_outcome: %w", err)
	}
	return &o, nil
}

// ============================================================================
// Retention helpers — 10y for closed cases (İş Kanunu zamanaşımı)
// ============================================================================

func (r *pipRepo) RetentionCandidates(ctx context.Context, olderThan time.Time) ([]uuid.UUID, error) {
	q := `SELECT id FROM app.pip_cases
	      WHERE status IN ('passed','terminated') AND updated_at < $1`
	ids := []uuid.UUID{}
	if err := r.db.SelectContext(ctx, &ids, q, olderThan); err != nil {
		return nil, fmt.Errorf("retention candidates: %w", err)
	}
	return ids, nil
}
