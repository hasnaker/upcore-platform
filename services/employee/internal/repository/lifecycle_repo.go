package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/lib/pq"

	"github.com/upcore/employee/internal/db"
	"github.com/upcore/employee/internal/domain"
)

// ============================================================================
// Shared tenant-scoped helpers
// ============================================================================

func txWithTenant(ctx context.Context, d *sqlx.DB, tenantID uuid.UUID, readOnly bool) (*sqlx.Tx, error) {
	var opts *sql.TxOptions
	if readOnly {
		opts = &sql.TxOptions{ReadOnly: true}
	}
	tx, err := d.BeginTxx(ctx, opts)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	if err := db.SetRLSTenant(ctx, tx, tenantID); err != nil {
		_ = tx.Rollback()
		return nil, err
	}
	return tx, nil
}

// ============================================================================
// Career Events
// ============================================================================

// CareerRepository abstracts app.career_events.
type CareerRepository interface {
	Create(ctx context.Context, e *domain.CareerEvent) error
	List(ctx context.Context, tenantID, employeeID uuid.UUID, limit, offset int) ([]*domain.CareerEvent, int, error)
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.CareerEvent, error)
}

type careerRepo struct{ db *sqlx.DB }

// NewCareerRepository constructs a CareerRepository.
func NewCareerRepository(d *sqlx.DB) CareerRepository { return &careerRepo{db: d} }

const careerCols = `id, tenant_id, employee_id, event_type, effective_date,
	from_value, to_value, reason_tr, approved_by, approved_at, metadata, created_at`

func (r *careerRepo) Create(ctx context.Context, e *domain.CareerEvent) error {
	e.ApplyDefaults()
	if e.CreatedAt.IsZero() {
		e.CreatedAt = time.Now().UTC()
	}
	tx, err := txWithTenant(ctx, r.db, e.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	q := `INSERT INTO app.career_events (
		id, tenant_id, employee_id, event_type, effective_date,
		from_value, to_value, reason_tr, approved_by, approved_at, metadata, created_at
	) VALUES (
		:id, :tenant_id, :employee_id, :event_type, :effective_date,
		:from_value, :to_value, :reason_tr, :approved_by, :approved_at, :metadata, :created_at
	)`
	if _, err := tx.NamedExecContext(ctx, q, e); err != nil {
		return fmt.Errorf("insert career event: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}

func (r *careerRepo) List(ctx context.Context, tenantID, employeeID uuid.UUID, limit, offset int) ([]*domain.CareerEvent, int, error) {
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	tx, err := txWithTenant(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, 0, err
	}
	defer func() { _ = tx.Rollback() }()
	var total int
	if err := tx.GetContext(ctx, &total,
		`SELECT COUNT(*) FROM app.career_events WHERE tenant_id = $1 AND employee_id = $2`,
		tenantID, employeeID,
	); err != nil {
		return nil, 0, fmt.Errorf("count career: %w", err)
	}
	out := []*domain.CareerEvent{}
	q := `SELECT ` + careerCols + ` FROM app.career_events
	      WHERE tenant_id = $1 AND employee_id = $2
	      ORDER BY effective_date DESC, created_at DESC
	      LIMIT $3 OFFSET $4`
	if err := tx.SelectContext(ctx, &out, q, tenantID, employeeID, limit, offset); err != nil {
		return nil, 0, fmt.Errorf("list career: %w", err)
	}
	return out, total, nil
}

func (r *careerRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.CareerEvent, error) {
	tx, err := txWithTenant(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	var e domain.CareerEvent
	q := `SELECT ` + careerCols + ` FROM app.career_events WHERE tenant_id = $1 AND id = $2`
	if err := tx.GetContext(ctx, &e, q, tenantID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrCareerEventNotFound
		}
		return nil, fmt.Errorf("select career: %w", err)
	}
	return &e, nil
}

// ============================================================================
// Compensation Records
// ============================================================================

// CompensationRepository abstracts app.compensation_records.
type CompensationRepository interface {
	Create(ctx context.Context, c *domain.CompensationRecord) error
	List(ctx context.Context, tenantID, employeeID uuid.UUID, limit, offset int) ([]*domain.CompensationRecord, int, error)
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.CompensationRecord, error)
	DeactivateOthers(ctx context.Context, tx *sqlx.Tx, tenantID, employeeID uuid.UUID, compType domain.CompensationType) error
}

type compensationRepo struct{ db *sqlx.DB }

// NewCompensationRepository constructs the repository.
func NewCompensationRepository(d *sqlx.DB) CompensationRepository { return &compensationRepo{db: d} }

const compCols = `id, tenant_id, employee_id, effective_date, compensation_type,
	amount, currency, frequency, reason_tr, approved_by, approved_at, source_event_id,
	is_active, created_at, updated_at`

func (r *compensationRepo) Create(ctx context.Context, c *domain.CompensationRecord) error {
	c.ApplyDefaults()
	now := time.Now().UTC()
	if c.CreatedAt.IsZero() {
		c.CreatedAt = now
	}
	c.UpdatedAt = now
	tx, err := txWithTenant(ctx, r.db, c.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	// For base_salary, deactivate prior active records so the latest wins.
	if c.CompensationType == domain.CompBaseSalary && c.IsActive {
		if err := r.DeactivateOthers(ctx, tx, c.TenantID, c.EmployeeID, domain.CompBaseSalary); err != nil {
			return err
		}
	}
	q := `INSERT INTO app.compensation_records (
		id, tenant_id, employee_id, effective_date, compensation_type,
		amount, currency, frequency, reason_tr, approved_by, approved_at, source_event_id,
		is_active, created_at, updated_at
	) VALUES (
		:id, :tenant_id, :employee_id, :effective_date, :compensation_type,
		:amount, :currency, :frequency, :reason_tr, :approved_by, :approved_at, :source_event_id,
		:is_active, :created_at, :updated_at
	)`
	if _, err := tx.NamedExecContext(ctx, q, c); err != nil {
		return fmt.Errorf("insert compensation: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}

func (r *compensationRepo) List(ctx context.Context, tenantID, employeeID uuid.UUID, limit, offset int) ([]*domain.CompensationRecord, int, error) {
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	tx, err := txWithTenant(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, 0, err
	}
	defer func() { _ = tx.Rollback() }()
	var total int
	if err := tx.GetContext(ctx, &total,
		`SELECT COUNT(*) FROM app.compensation_records WHERE tenant_id = $1 AND employee_id = $2`,
		tenantID, employeeID,
	); err != nil {
		return nil, 0, fmt.Errorf("count comp: %w", err)
	}
	out := []*domain.CompensationRecord{}
	q := `SELECT ` + compCols + ` FROM app.compensation_records
	      WHERE tenant_id = $1 AND employee_id = $2
	      ORDER BY effective_date DESC, created_at DESC
	      LIMIT $3 OFFSET $4`
	if err := tx.SelectContext(ctx, &out, q, tenantID, employeeID, limit, offset); err != nil {
		return nil, 0, fmt.Errorf("list comp: %w", err)
	}
	return out, total, nil
}

func (r *compensationRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.CompensationRecord, error) {
	tx, err := txWithTenant(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	var c domain.CompensationRecord
	q := `SELECT ` + compCols + ` FROM app.compensation_records WHERE tenant_id = $1 AND id = $2`
	if err := tx.GetContext(ctx, &c, q, tenantID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrCompensationNotFound
		}
		return nil, fmt.Errorf("select comp: %w", err)
	}
	return &c, nil
}

func (r *compensationRepo) DeactivateOthers(ctx context.Context, tx *sqlx.Tx, tenantID, employeeID uuid.UUID, compType domain.CompensationType) error {
	if _, err := tx.ExecContext(ctx,
		`UPDATE app.compensation_records
		 SET is_active = FALSE, updated_at = NOW()
		 WHERE tenant_id = $1 AND employee_id = $2 AND compensation_type = $3 AND is_active = TRUE`,
		tenantID, employeeID, string(compType),
	); err != nil {
		return fmt.Errorf("deactivate comp: %w", err)
	}
	return nil
}

// ============================================================================
// Related Contacts
// ============================================================================

// RelatedContactRepository abstracts app.related_contacts.
type RelatedContactRepository interface {
	Create(ctx context.Context, c *domain.RelatedContact) error
	Update(ctx context.Context, c *domain.RelatedContact) error
	Delete(ctx context.Context, tenantID, id uuid.UUID) error
	List(ctx context.Context, tenantID, employeeID uuid.UUID, kind string) ([]*domain.RelatedContact, error)
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.RelatedContact, error)
}

type relatedContactRepo struct{ db *sqlx.DB }

// NewRelatedContactRepository constructs the repository.
func NewRelatedContactRepository(d *sqlx.DB) RelatedContactRepository {
	return &relatedContactRepo{db: d}
}

const relatedCols = `id, tenant_id, employee_id, kind, full_name, relation,
	phone, email, is_primary, notes, created_at, updated_at`

func (r *relatedContactRepo) Create(ctx context.Context, c *domain.RelatedContact) error {
	c.ApplyDefaults()
	now := time.Now().UTC()
	if c.CreatedAt.IsZero() {
		c.CreatedAt = now
	}
	c.UpdatedAt = now
	tx, err := txWithTenant(ctx, r.db, c.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	if c.IsPrimary {
		if _, err := tx.ExecContext(ctx,
			`UPDATE app.related_contacts SET is_primary = FALSE, updated_at = NOW()
			 WHERE tenant_id = $1 AND employee_id = $2 AND kind = $3`,
			c.TenantID, c.EmployeeID, string(c.Kind),
		); err != nil {
			return fmt.Errorf("clear primary: %w", err)
		}
	}
	q := `INSERT INTO app.related_contacts (
		id, tenant_id, employee_id, kind, full_name, relation,
		phone, email, is_primary, notes, created_at, updated_at
	) VALUES (
		:id, :tenant_id, :employee_id, :kind, :full_name, :relation,
		:phone, :email, :is_primary, :notes, :created_at, :updated_at
	)`
	if _, err := tx.NamedExecContext(ctx, q, c); err != nil {
		return fmt.Errorf("insert related contact: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}

func (r *relatedContactRepo) Update(ctx context.Context, c *domain.RelatedContact) error {
	c.UpdatedAt = time.Now().UTC()
	tx, err := txWithTenant(ctx, r.db, c.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	if c.IsPrimary {
		if _, err := tx.ExecContext(ctx,
			`UPDATE app.related_contacts SET is_primary = FALSE, updated_at = NOW()
			 WHERE tenant_id = $1 AND employee_id = $2 AND kind = $3 AND id <> $4`,
			c.TenantID, c.EmployeeID, string(c.Kind), c.ID,
		); err != nil {
			return fmt.Errorf("clear primary: %w", err)
		}
	}
	res, err := tx.NamedExecContext(ctx,
		`UPDATE app.related_contacts SET
			kind = :kind, full_name = :full_name, relation = :relation,
			phone = :phone, email = :email, is_primary = :is_primary, notes = :notes,
			updated_at = :updated_at
		 WHERE tenant_id = :tenant_id AND id = :id`, c)
	if err != nil {
		return fmt.Errorf("update related contact: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrRelatedContactNotFound
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}

func (r *relatedContactRepo) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	tx, err := txWithTenant(ctx, r.db, tenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	res, err := tx.ExecContext(ctx,
		`DELETE FROM app.related_contacts WHERE tenant_id = $1 AND id = $2`,
		tenantID, id,
	)
	if err != nil {
		return fmt.Errorf("delete related contact: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrRelatedContactNotFound
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}

func (r *relatedContactRepo) List(ctx context.Context, tenantID, employeeID uuid.UUID, kind string) ([]*domain.RelatedContact, error) {
	tx, err := txWithTenant(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	q := `SELECT ` + relatedCols + ` FROM app.related_contacts
	      WHERE tenant_id = $1 AND employee_id = $2`
	args := []any{tenantID, employeeID}
	if kind != "" {
		q += ` AND kind = $3`
		args = append(args, kind)
	}
	q += ` ORDER BY is_primary DESC, full_name`
	out := []*domain.RelatedContact{}
	if err := tx.SelectContext(ctx, &out, q, args...); err != nil {
		return nil, fmt.Errorf("list related contacts: %w", err)
	}
	return out, nil
}

func (r *relatedContactRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.RelatedContact, error) {
	tx, err := txWithTenant(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	var c domain.RelatedContact
	q := `SELECT ` + relatedCols + ` FROM app.related_contacts WHERE tenant_id = $1 AND id = $2`
	if err := tx.GetContext(ctx, &c, q, tenantID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrRelatedContactNotFound
		}
		return nil, fmt.Errorf("select related contact: %w", err)
	}
	return &c, nil
}

// ============================================================================
// Employee Positions
// ============================================================================

// PositionRepository abstracts app.employee_positions.
type PositionRepository interface {
	Create(ctx context.Context, p *domain.EmployeePosition) error
	Update(ctx context.Context, p *domain.EmployeePosition) error
	End(ctx context.Context, tenantID, id uuid.UUID, endDate time.Time) error
	List(ctx context.Context, tenantID, employeeID uuid.UUID, activeOnly bool) ([]*domain.EmployeePosition, error)
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.EmployeePosition, error)
}

type positionRepo struct{ db *sqlx.DB }

// NewPositionRepository constructs the repository.
func NewPositionRepository(d *sqlx.DB) PositionRepository { return &positionRepo{db: d} }

const positionCols = `id, tenant_id, employee_id, position_id, department_id,
	fte_percentage, is_primary, start_date, end_date, created_at, updated_at`

func (r *positionRepo) Create(ctx context.Context, p *domain.EmployeePosition) error {
	p.ApplyDefaults()
	now := time.Now().UTC()
	if p.CreatedAt.IsZero() {
		p.CreatedAt = now
	}
	p.UpdatedAt = now
	tx, err := txWithTenant(ctx, r.db, p.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	if p.IsPrimary {
		if _, err := tx.ExecContext(ctx,
			`UPDATE app.employee_positions SET is_primary = FALSE, updated_at = NOW()
			 WHERE tenant_id = $1 AND employee_id = $2 AND end_date IS NULL`,
			p.TenantID, p.EmployeeID,
		); err != nil {
			return fmt.Errorf("clear primary: %w", err)
		}
	}
	q := `INSERT INTO app.employee_positions (
		id, tenant_id, employee_id, position_id, department_id,
		fte_percentage, is_primary, start_date, end_date, created_at, updated_at
	) VALUES (
		:id, :tenant_id, :employee_id, :position_id, :department_id,
		:fte_percentage, :is_primary, :start_date, :end_date, :created_at, :updated_at
	)`
	if _, err := tx.NamedExecContext(ctx, q, p); err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23514" {
			return domain.ErrEmployeePositionInvalid
		}
		return fmt.Errorf("insert position: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}

func (r *positionRepo) Update(ctx context.Context, p *domain.EmployeePosition) error {
	p.UpdatedAt = time.Now().UTC()
	tx, err := txWithTenant(ctx, r.db, p.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	res, err := tx.NamedExecContext(ctx,
		`UPDATE app.employee_positions SET
			position_id = :position_id, department_id = :department_id,
			fte_percentage = :fte_percentage, is_primary = :is_primary,
			start_date = :start_date, end_date = :end_date,
			updated_at = :updated_at
		 WHERE tenant_id = :tenant_id AND id = :id`, p)
	if err != nil {
		return fmt.Errorf("update position: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}

func (r *positionRepo) End(ctx context.Context, tenantID, id uuid.UUID, endDate time.Time) error {
	tx, err := txWithTenant(ctx, r.db, tenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	res, err := tx.ExecContext(ctx,
		`UPDATE app.employee_positions SET end_date = $3, updated_at = NOW()
		 WHERE tenant_id = $1 AND id = $2`,
		tenantID, id, endDate,
	)
	if err != nil {
		return fmt.Errorf("end position: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}

func (r *positionRepo) List(ctx context.Context, tenantID, employeeID uuid.UUID, activeOnly bool) ([]*domain.EmployeePosition, error) {
	tx, err := txWithTenant(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	q := `SELECT ` + positionCols + ` FROM app.employee_positions
	      WHERE tenant_id = $1 AND employee_id = $2`
	if activeOnly {
		q += ` AND end_date IS NULL`
	}
	q += ` ORDER BY is_primary DESC, start_date DESC`
	out := []*domain.EmployeePosition{}
	if err := tx.SelectContext(ctx, &out, q, tenantID, employeeID); err != nil {
		return nil, fmt.Errorf("list positions: %w", err)
	}
	return out, nil
}

func (r *positionRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.EmployeePosition, error) {
	tx, err := txWithTenant(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	var p domain.EmployeePosition
	q := `SELECT ` + positionCols + ` FROM app.employee_positions WHERE tenant_id = $1 AND id = $2`
	if err := tx.GetContext(ctx, &p, q, tenantID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("select position: %w", err)
	}
	return &p, nil
}

// ============================================================================
// Offboarding + Exit Interviews
// ============================================================================

// OffboardingRepository abstracts app.offboarding_events + app.exit_interviews.
type OffboardingRepository interface {
	CreateOffboarding(ctx context.Context, o *domain.OffboardingEvent) error
	UpdateOffboarding(ctx context.Context, o *domain.OffboardingEvent) error
	GetOffboardingByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.OffboardingEvent, error)
	GetOffboardingByEmployee(ctx context.Context, tenantID, employeeID uuid.UUID) (*domain.OffboardingEvent, error)
	CreateExitInterview(ctx context.Context, i *domain.ExitInterview) error
	GetExitInterview(ctx context.Context, tenantID, offboardingID uuid.UUID) (*domain.ExitInterview, error)
}

type offboardingRepo struct{ db *sqlx.DB }

// NewOffboardingRepository constructs the repository.
func NewOffboardingRepository(d *sqlx.DB) OffboardingRepository { return &offboardingRepo{db: d} }

const offboardingCols = `id, tenant_id, employee_id, departure_type,
	notice_date, last_working_day, exit_interview_done,
	it_access_revoked, it_revoked_at, final_pay_date,
	handover_complete, handover_to_id, notes, created_at, updated_at`

const exitCols = `id, tenant_id, offboarding_id, satisfaction_score, would_return,
	would_recommend, primary_reason_code, departure_note, hr_summary,
	interview_date, interviewer_id, is_anonymous, created_at, updated_at`

func (r *offboardingRepo) CreateOffboarding(ctx context.Context, o *domain.OffboardingEvent) error {
	o.ApplyDefaults()
	now := time.Now().UTC()
	if o.CreatedAt.IsZero() {
		o.CreatedAt = now
	}
	o.UpdatedAt = now
	tx, err := txWithTenant(ctx, r.db, o.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	q := `INSERT INTO app.offboarding_events (
		id, tenant_id, employee_id, departure_type,
		notice_date, last_working_day, exit_interview_done,
		it_access_revoked, it_revoked_at, final_pay_date,
		handover_complete, handover_to_id, notes, created_at, updated_at
	) VALUES (
		:id, :tenant_id, :employee_id, :departure_type,
		:notice_date, :last_working_day, :exit_interview_done,
		:it_access_revoked, :it_revoked_at, :final_pay_date,
		:handover_complete, :handover_to_id, :notes, :created_at, :updated_at
	)`
	if _, err := tx.NamedExecContext(ctx, q, o); err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			return domain.ErrOffboardingExists
		}
		return fmt.Errorf("insert offboarding: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}

func (r *offboardingRepo) UpdateOffboarding(ctx context.Context, o *domain.OffboardingEvent) error {
	o.UpdatedAt = time.Now().UTC()
	tx, err := txWithTenant(ctx, r.db, o.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	res, err := tx.NamedExecContext(ctx,
		`UPDATE app.offboarding_events SET
			departure_type = :departure_type,
			notice_date = :notice_date, last_working_day = :last_working_day,
			exit_interview_done = :exit_interview_done,
			it_access_revoked = :it_access_revoked, it_revoked_at = :it_revoked_at,
			final_pay_date = :final_pay_date,
			handover_complete = :handover_complete, handover_to_id = :handover_to_id,
			notes = :notes, updated_at = :updated_at
		 WHERE tenant_id = :tenant_id AND id = :id`, o)
	if err != nil {
		return fmt.Errorf("update offboarding: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrOffboardingNotFound
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}

func (r *offboardingRepo) GetOffboardingByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.OffboardingEvent, error) {
	tx, err := txWithTenant(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	var o domain.OffboardingEvent
	q := `SELECT ` + offboardingCols + ` FROM app.offboarding_events WHERE tenant_id = $1 AND id = $2`
	if err := tx.GetContext(ctx, &o, q, tenantID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrOffboardingNotFound
		}
		return nil, fmt.Errorf("select offboarding: %w", err)
	}
	return &o, nil
}

func (r *offboardingRepo) GetOffboardingByEmployee(ctx context.Context, tenantID, employeeID uuid.UUID) (*domain.OffboardingEvent, error) {
	tx, err := txWithTenant(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	var o domain.OffboardingEvent
	q := `SELECT ` + offboardingCols + ` FROM app.offboarding_events WHERE tenant_id = $1 AND employee_id = $2`
	if err := tx.GetContext(ctx, &o, q, tenantID, employeeID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrOffboardingNotFound
		}
		return nil, fmt.Errorf("select offboarding: %w", err)
	}
	return &o, nil
}

func (r *offboardingRepo) CreateExitInterview(ctx context.Context, i *domain.ExitInterview) error {
	i.ApplyDefaults()
	now := time.Now().UTC()
	if i.CreatedAt.IsZero() {
		i.CreatedAt = now
	}
	i.UpdatedAt = now
	tx, err := txWithTenant(ctx, r.db, i.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	q := `INSERT INTO app.exit_interviews (
		id, tenant_id, offboarding_id, satisfaction_score, would_return,
		would_recommend, primary_reason_code, departure_note, hr_summary,
		interview_date, interviewer_id, is_anonymous, created_at, updated_at
	) VALUES (
		:id, :tenant_id, :offboarding_id, :satisfaction_score, :would_return,
		:would_recommend, :primary_reason_code, :departure_note, :hr_summary,
		:interview_date, :interviewer_id, :is_anonymous, :created_at, :updated_at
	)`
	if _, err := tx.NamedExecContext(ctx, q, i); err != nil {
		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			return domain.ErrExitInterviewExists
		}
		return fmt.Errorf("insert exit interview: %w", err)
	}
	// Mark offboarding as interview_done
	if _, err := tx.ExecContext(ctx,
		`UPDATE app.offboarding_events SET exit_interview_done = TRUE, updated_at = NOW()
		 WHERE tenant_id = $1 AND id = $2`,
		i.TenantID, i.OffboardingID,
	); err != nil {
		return fmt.Errorf("mark interview done: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}

func (r *offboardingRepo) GetExitInterview(ctx context.Context, tenantID, offboardingID uuid.UUID) (*domain.ExitInterview, error) {
	tx, err := txWithTenant(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	var i domain.ExitInterview
	q := `SELECT ` + exitCols + ` FROM app.exit_interviews WHERE tenant_id = $1 AND offboarding_id = $2`
	if err := tx.GetContext(ctx, &i, q, tenantID, offboardingID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrExitInterviewNotFound
		}
		return nil, fmt.Errorf("select exit interview: %w", err)
	}
	return &i, nil
}
