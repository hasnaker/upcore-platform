package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// --- Calibration Session ---

// CalibrationSession mirrors app.calibration_sessions.
type CalibrationSession struct {
	ID             uuid.UUID  `db:"id" json:"id"`
	TenantID       uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	CycleID        uuid.UUID  `db:"cycle_id" json:"cycle_id"`
	FacilitatorID  uuid.UUID  `db:"facilitator_id" json:"facilitator_id"`
	Scope          string     `db:"scope" json:"scope"`
	DepartmentID   *uuid.UUID `db:"department_id" json:"department_id,omitempty"`
	Status         string     `db:"status" json:"status"`
	ScheduledAt    time.Time  `db:"scheduled_at" json:"scheduled_at"`
	StartedAt      *time.Time `db:"started_at" json:"started_at,omitempty"`
	EndedAt        *time.Time `db:"ended_at" json:"ended_at,omitempty"`
	Notes          *string    `db:"notes" json:"notes,omitempty"`
	CreatedAt      time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time  `db:"updated_at" json:"updated_at"`
}

// CalibrationAdjustment is a single decision made within a session.
type CalibrationAdjustment struct {
	ID            uuid.UUID `db:"id" json:"id"`
	SessionID     uuid.UUID `db:"session_id" json:"session_id"`
	TenantID      uuid.UUID `db:"tenant_id" json:"tenant_id"`
	EmployeeID    uuid.UUID `db:"employee_id" json:"employee_id"`
	Field         string    `db:"field" json:"field"`
	OldValue      *string   `db:"old_value" json:"old_value,omitempty"`
	NewValue      string    `db:"new_value" json:"new_value"`
	Justification *string   `db:"justification" json:"justification,omitempty"`
	DecidedBy     uuid.UUID `db:"decided_by" json:"decided_by"`
	CreatedAt     time.Time `db:"created_at" json:"created_at"`
}

// CalibrationRepository abstracts sessions + adjustments persistence.
type CalibrationRepository interface {
	CreateSession(ctx context.Context, s *CalibrationSession) error
	UpdateSessionStatus(ctx context.Context, tenantID, id uuid.UUID, status string) error
	GetSession(ctx context.Context, tenantID, id uuid.UUID) (*CalibrationSession, error)
	ListSessions(ctx context.Context, tenantID, cycleID uuid.UUID, status string) ([]*CalibrationSession, error)
	AddAdjustment(ctx context.Context, a *CalibrationAdjustment) error
	ListAdjustments(ctx context.Context, tenantID, sessionID uuid.UUID) ([]*CalibrationAdjustment, error)
}

type calibrationRepo struct{ db *sqlx.DB }

// NewCalibrationRepository constructs.
func NewCalibrationRepository(d *sqlx.DB) CalibrationRepository { return &calibrationRepo{db: d} }

const calibSessCols = `id, tenant_id, cycle_id, facilitator_id, scope, department_id,
	status, scheduled_at, started_at, ended_at, notes, created_at, updated_at`

func (r *calibrationRepo) CreateSession(ctx context.Context, s *CalibrationSession) error {
	tx, err := beginTenantTx(ctx, r.db, s.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	if _, err := tx.NamedExecContext(ctx, `INSERT INTO app.calibration_sessions (
		id, tenant_id, cycle_id, facilitator_id, scope, department_id,
		status, scheduled_at, notes
	) VALUES (
		:id, :tenant_id, :cycle_id, :facilitator_id, :scope, :department_id,
		:status, :scheduled_at, :notes
	)`, s); err != nil {
		return fmt.Errorf("insert session: %w", err)
	}
	return tx.Commit()
}

func (r *calibrationRepo) UpdateSessionStatus(ctx context.Context, tenantID, id uuid.UUID, status string) error {
	tx, err := beginTenantTx(ctx, r.db, tenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	q := `UPDATE app.calibration_sessions SET status=$3, updated_at=NOW(),
		  started_at = CASE WHEN $3 IN ('in_progress') AND started_at IS NULL THEN NOW() ELSE started_at END,
		  ended_at   = CASE WHEN $3 IN ('completed','cancelled') AND ended_at IS NULL THEN NOW() ELSE ended_at END
		  WHERE tenant_id=$1 AND id=$2`
	if _, err := tx.ExecContext(ctx, q, tenantID, id, status); err != nil {
		return fmt.Errorf("update session: %w", err)
	}
	return tx.Commit()
}

func (r *calibrationRepo) GetSession(ctx context.Context, tenantID, id uuid.UUID) (*CalibrationSession, error) {
	tx, err := beginTenantTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	var s CalibrationSession
	if err := tx.GetContext(ctx, &s,
		`SELECT `+calibSessCols+` FROM app.calibration_sessions WHERE tenant_id=$1 AND id=$2`,
		tenantID, id); err != nil {
		return nil, fmt.Errorf("get session: %w", err)
	}
	return &s, nil
}

func (r *calibrationRepo) ListSessions(ctx context.Context, tenantID, cycleID uuid.UUID, status string) ([]*CalibrationSession, error) {
	tx, err := beginTenantTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	q := `SELECT ` + calibSessCols + ` FROM app.calibration_sessions WHERE tenant_id=$1`
	args := []any{tenantID}
	if cycleID != uuid.Nil {
		q += ` AND cycle_id=$2`
		args = append(args, cycleID)
	}
	if status != "" {
		q += fmt.Sprintf(` AND status=$%d`, len(args)+1)
		args = append(args, status)
	}
	q += ` ORDER BY scheduled_at DESC`
	out := []*CalibrationSession{}
	if err := tx.SelectContext(ctx, &out, q, args...); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *calibrationRepo) AddAdjustment(ctx context.Context, a *CalibrationAdjustment) error {
	tx, err := beginTenantTx(ctx, r.db, a.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	if _, err := tx.NamedExecContext(ctx,
		`INSERT INTO app.calibration_adjustments
		 (id, session_id, tenant_id, employee_id, field, old_value, new_value, justification, decided_by)
		 VALUES (:id, :session_id, :tenant_id, :employee_id, :field, :old_value, :new_value, :justification, :decided_by)`, a); err != nil {
		return fmt.Errorf("insert adjustment: %w", err)
	}
	return tx.Commit()
}

func (r *calibrationRepo) ListAdjustments(ctx context.Context, tenantID, sessionID uuid.UUID) ([]*CalibrationAdjustment, error) {
	tx, err := beginTenantTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	out := []*CalibrationAdjustment{}
	if err := tx.SelectContext(ctx, &out,
		`SELECT id, session_id, tenant_id, employee_id, field, old_value, new_value, justification, decided_by, created_at
		 FROM app.calibration_adjustments WHERE tenant_id=$1 AND session_id=$2 ORDER BY created_at`,
		tenantID, sessionID); err != nil {
		return nil, err
	}
	return out, nil
}

// --- Development Plan ---

// DevelopmentPlan mirrors app.development_plans.
type DevelopmentPlan struct {
	ID          uuid.UUID  `db:"id" json:"id"`
	TenantID    uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	EmployeeID  uuid.UUID  `db:"employee_id" json:"employee_id"`
	CycleID     *uuid.UUID `db:"cycle_id" json:"cycle_id,omitempty"`
	TitleTR     string     `db:"title_tr" json:"title_tr"`
	Description *string    `db:"description" json:"description,omitempty"`
	TargetDate  *time.Time `db:"target_date" json:"target_date,omitempty"`
	Status      string     `db:"status" json:"status"`
	ProgressPct int        `db:"progress_pct" json:"progress_pct"`
	CreatedAt   time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt   time.Time  `db:"updated_at" json:"updated_at"`
}

// DevelopmentAction is one unit of effort in a plan.
type DevelopmentAction struct {
	ID              uuid.UUID  `db:"id" json:"id"`
	TenantID        uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	PlanID          uuid.UUID  `db:"plan_id" json:"plan_id"`
	Kind            string     `db:"kind" json:"kind"`
	Description     string     `db:"description" json:"description"`
	OwnerEmployeeID *uuid.UUID `db:"owner_employee_id" json:"owner_employee_id,omitempty"`
	DueDate         *time.Time `db:"due_date" json:"due_date,omitempty"`
	CompletedAt     *time.Time `db:"completed_at" json:"completed_at,omitempty"`
	CreatedAt       time.Time  `db:"created_at" json:"created_at"`
}

// DevelopmentRepository — plans + actions CRUD.
type DevelopmentRepository interface {
	CreatePlan(ctx context.Context, p *DevelopmentPlan) error
	GetPlan(ctx context.Context, tenantID, id uuid.UUID) (*DevelopmentPlan, error)
	ListPlansForEmployee(ctx context.Context, tenantID, employeeID uuid.UUID) ([]*DevelopmentPlan, error)
	UpdatePlanProgress(ctx context.Context, tenantID, id uuid.UUID, pct int, status string) error
	AddAction(ctx context.Context, a *DevelopmentAction) error
	CompleteAction(ctx context.Context, tenantID, id uuid.UUID) error
	ListActions(ctx context.Context, tenantID, planID uuid.UUID) ([]*DevelopmentAction, error)
}

type developmentRepo struct{ db *sqlx.DB }

// NewDevelopmentRepository constructs.
func NewDevelopmentRepository(d *sqlx.DB) DevelopmentRepository { return &developmentRepo{db: d} }

const devPlanCols = `id, tenant_id, employee_id, cycle_id, title_tr, description,
	target_date, status, progress_pct, created_at, updated_at`

func (r *developmentRepo) CreatePlan(ctx context.Context, p *DevelopmentPlan) error {
	tx, err := beginTenantTx(ctx, r.db, p.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	if _, err := tx.NamedExecContext(ctx,
		`INSERT INTO app.development_plans
		 (id, tenant_id, employee_id, cycle_id, title_tr, description, target_date, status, progress_pct)
		 VALUES (:id, :tenant_id, :employee_id, :cycle_id, :title_tr, :description, :target_date, :status, :progress_pct)`, p); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *developmentRepo) GetPlan(ctx context.Context, tenantID, id uuid.UUID) (*DevelopmentPlan, error) {
	tx, err := beginTenantTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	var p DevelopmentPlan
	if err := tx.GetContext(ctx, &p,
		`SELECT `+devPlanCols+` FROM app.development_plans WHERE tenant_id=$1 AND id=$2`,
		tenantID, id); err != nil {
		return nil, err
	}
	return &p, nil
}

func (r *developmentRepo) ListPlansForEmployee(ctx context.Context, tenantID, employeeID uuid.UUID) ([]*DevelopmentPlan, error) {
	tx, err := beginTenantTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	out := []*DevelopmentPlan{}
	if err := tx.SelectContext(ctx, &out,
		`SELECT `+devPlanCols+` FROM app.development_plans
		 WHERE tenant_id=$1 AND employee_id=$2 ORDER BY created_at DESC`,
		tenantID, employeeID); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *developmentRepo) UpdatePlanProgress(ctx context.Context, tenantID, id uuid.UUID, pct int, status string) error {
	tx, err := beginTenantTx(ctx, r.db, tenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	if _, err := tx.ExecContext(ctx,
		`UPDATE app.development_plans SET progress_pct=$3, status=COALESCE(NULLIF($4,''), status), updated_at=NOW()
		 WHERE tenant_id=$1 AND id=$2`, tenantID, id, pct, status); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *developmentRepo) AddAction(ctx context.Context, a *DevelopmentAction) error {
	tx, err := beginTenantTx(ctx, r.db, a.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	if _, err := tx.NamedExecContext(ctx,
		`INSERT INTO app.development_actions
		 (id, tenant_id, plan_id, kind, description, owner_employee_id, due_date)
		 VALUES (:id, :tenant_id, :plan_id, :kind, :description, :owner_employee_id, :due_date)`, a); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *developmentRepo) CompleteAction(ctx context.Context, tenantID, id uuid.UUID) error {
	tx, err := beginTenantTx(ctx, r.db, tenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	if _, err := tx.ExecContext(ctx,
		`UPDATE app.development_actions SET completed_at=NOW() WHERE tenant_id=$1 AND id=$2 AND completed_at IS NULL`,
		tenantID, id); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *developmentRepo) ListActions(ctx context.Context, tenantID, planID uuid.UUID) ([]*DevelopmentAction, error) {
	tx, err := beginTenantTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	out := []*DevelopmentAction{}
	if err := tx.SelectContext(ctx, &out,
		`SELECT id, tenant_id, plan_id, kind, description, owner_employee_id, due_date, completed_at, created_at
		 FROM app.development_actions WHERE tenant_id=$1 AND plan_id=$2 ORDER BY due_date NULLS LAST, created_at`,
		tenantID, planID); err != nil {
		return nil, err
	}
	return out, nil
}

// --- Peer Nomination ---

// PeerNomination mirrors app.peer_nominations.
type PeerNomination struct {
	ID           uuid.UUID  `db:"id" json:"id"`
	TenantID     uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	CycleID      uuid.UUID  `db:"cycle_id" json:"cycle_id"`
	SubjectID    uuid.UUID  `db:"subject_id" json:"subject_id"`
	NomineeID    uuid.UUID  `db:"nominee_id" json:"nominee_id"`
	Relationship string     `db:"relationship" json:"relationship"`
	Status       string     `db:"status" json:"status"`
	InvitedAt    *time.Time `db:"invited_at" json:"invited_at,omitempty"`
	CompletedAt  *time.Time `db:"completed_at" json:"completed_at,omitempty"`
	CreatedAt    time.Time  `db:"created_at" json:"created_at"`
}

// PeerNominationRepository — subject chooses nominees, HR approves.
type PeerNominationRepository interface {
	Create(ctx context.Context, p *PeerNomination) error
	List(ctx context.Context, tenantID, cycleID, subjectID uuid.UUID) ([]*PeerNomination, error)
	UpdateStatus(ctx context.Context, tenantID, id uuid.UUID, status string) error
}

type peerRepo struct{ db *sqlx.DB }

// NewPeerNominationRepository constructs.
func NewPeerNominationRepository(d *sqlx.DB) PeerNominationRepository { return &peerRepo{db: d} }

func (r *peerRepo) Create(ctx context.Context, p *PeerNomination) error {
	tx, err := beginTenantTx(ctx, r.db, p.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	if _, err := tx.NamedExecContext(ctx,
		`INSERT INTO app.peer_nominations
		 (id, tenant_id, cycle_id, subject_id, nominee_id, relationship, status)
		 VALUES (:id, :tenant_id, :cycle_id, :subject_id, :nominee_id, :relationship, :status)
		 ON CONFLICT (tenant_id, cycle_id, subject_id, nominee_id) DO NOTHING`, p); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *peerRepo) List(ctx context.Context, tenantID, cycleID, subjectID uuid.UUID) ([]*PeerNomination, error) {
	tx, err := beginTenantTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	q := `SELECT id, tenant_id, cycle_id, subject_id, nominee_id, relationship, status, invited_at, completed_at, created_at
	      FROM app.peer_nominations WHERE tenant_id=$1 AND cycle_id=$2`
	args := []any{tenantID, cycleID}
	if subjectID != uuid.Nil {
		q += ` AND subject_id=$3`
		args = append(args, subjectID)
	}
	q += ` ORDER BY created_at`
	out := []*PeerNomination{}
	if err := tx.SelectContext(ctx, &out, q, args...); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *peerRepo) UpdateStatus(ctx context.Context, tenantID, id uuid.UUID, status string) error {
	tx, err := beginTenantTx(ctx, r.db, tenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	q := `UPDATE app.peer_nominations SET status=$3,
	      invited_at = CASE WHEN $3='approved' AND invited_at IS NULL THEN NOW() ELSE invited_at END,
	      completed_at = CASE WHEN $3='completed' AND completed_at IS NULL THEN NOW() ELSE completed_at END
	      WHERE tenant_id=$1 AND id=$2`
	if _, err := tx.ExecContext(ctx, q, tenantID, id, status); err != nil {
		return err
	}
	return tx.Commit()
}
