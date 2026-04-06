package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/intervention/internal/domain"
)

// ConsentRepository abstracts persistence for consent log entries.
// The consent log is append-only and immutable.
type ConsentRepository interface {
	Create(ctx context.Context, c *domain.ConsentLog) error
	ListByEmployee(ctx context.Context, tenantID, employeeID uuid.UUID) ([]*domain.ConsentLog, error)
	ListByAssignment(ctx context.Context, assignmentID uuid.UUID) ([]*domain.ConsentLog, error)
}

type consentRepo struct {
	db *sqlx.DB
}

// NewConsentRepository constructs a ConsentRepository backed by sqlx.
func NewConsentRepository(db *sqlx.DB) ConsentRepository {
	return &consentRepo{db: db}
}

func (r *consentRepo) Create(ctx context.Context, c *domain.ConsentLog) error {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	c.CreatedAt = time.Now().UTC()

	q := `INSERT INTO app.intervention_consent_log (
		id, tenant_id, assignment_id, employee_id, action, reason, actor_ip, created_at
	) VALUES (
		:id, :tenant_id, :assignment_id, :employee_id, :action, :reason, :actor_ip, :created_at
	)`
	_, err := r.db.NamedExecContext(ctx, q, c)
	if err != nil {
		return fmt.Errorf("insert consent log: %w", err)
	}
	return nil
}

func (r *consentRepo) ListByEmployee(ctx context.Context, tenantID, employeeID uuid.UUID) ([]*domain.ConsentLog, error) {
	var rows []*domain.ConsentLog
	q := `SELECT * FROM app.intervention_consent_log
		WHERE tenant_id = $1 AND employee_id = $2
		ORDER BY created_at DESC`
	if err := r.db.SelectContext(ctx, &rows, q, tenantID, employeeID); err != nil {
		return nil, fmt.Errorf("list consent by employee: %w", err)
	}
	return rows, nil
}

func (r *consentRepo) ListByAssignment(ctx context.Context, assignmentID uuid.UUID) ([]*domain.ConsentLog, error) {
	var rows []*domain.ConsentLog
	q := `SELECT * FROM app.intervention_consent_log
		WHERE assignment_id = $1
		ORDER BY created_at ASC`
	if err := r.db.SelectContext(ctx, &rows, q, assignmentID); err != nil {
		return nil, fmt.Errorf("list consent by assignment: %w", err)
	}
	return rows, nil
}
