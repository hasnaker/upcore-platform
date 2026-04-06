package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/employee/internal/db"
	"github.com/upcore/employee/internal/domain"
)

// ContactRepository abstracts the employee_contacts table.
type ContactRepository interface {
	Create(ctx context.Context, c *domain.EmergencyContact) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.EmergencyContact, error)
	ListByEmployee(ctx context.Context, employeeID uuid.UUID) ([]*domain.EmergencyContact, error)
	Update(ctx context.Context, c *domain.EmergencyContact) error
	SoftDelete(ctx context.Context, id uuid.UUID) error
	ClearPrimary(ctx context.Context, employeeID uuid.UUID) error
}

type contactRepo struct {
	db *sqlx.DB
}

// NewContactRepository constructs a ContactRepository.
func NewContactRepository(d *sqlx.DB) ContactRepository {
	return &contactRepo{db: d}
}

// Create inserts a contact. When is_primary=true, any existing primary is cleared first.
func (r *contactRepo) Create(ctx context.Context, c *domain.EmergencyContact) error {
	c.ApplyDefaults()
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	now := time.Now().UTC()
	if c.CreatedAt.IsZero() {
		c.CreatedAt = now
	}
	c.UpdatedAt = now

	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	if c.IsPrimary {
		if _, err := tx.ExecContext(ctx, db.QClearPrimaryContacts, c.EmployeeID, now); err != nil {
			return fmt.Errorf("clear primary: %w", err)
		}
	}
	if _, err := tx.NamedExecContext(ctx, db.QInsertEmployeeContact, c); err != nil {
		return fmt.Errorf("insert contact: %w", err)
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}

// GetByID returns a contact by ID.
func (r *contactRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.EmergencyContact, error) {
	var c domain.EmergencyContact
	if err := r.db.GetContext(ctx, &c, db.QSelectContactByID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrContactNotFound
		}
		return nil, fmt.Errorf("select contact: %w", err)
	}
	return &c, nil
}

// ListByEmployee returns all contacts for an employee.
func (r *contactRepo) ListByEmployee(ctx context.Context, employeeID uuid.UUID) ([]*domain.EmergencyContact, error) {
	out := []*domain.EmergencyContact{}
	if err := r.db.SelectContext(ctx, &out, db.QSelectContactsByEmployee, employeeID); err != nil {
		return nil, fmt.Errorf("list contacts: %w", err)
	}
	return out, nil
}

// Update persists changes.
func (r *contactRepo) Update(ctx context.Context, c *domain.EmergencyContact) error {
	c.UpdatedAt = time.Now().UTC()
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()
	if c.IsPrimary {
		if _, err := tx.ExecContext(ctx, db.QClearPrimaryContacts, c.EmployeeID, c.UpdatedAt); err != nil {
			return fmt.Errorf("clear primary: %w", err)
		}
	}
	res, err := tx.NamedExecContext(ctx, db.QUpdateContact, c)
	if err != nil {
		return fmt.Errorf("update contact: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrContactNotFound
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit: %w", err)
	}
	return nil
}

// SoftDelete marks a contact deleted.
func (r *contactRepo) SoftDelete(ctx context.Context, id uuid.UUID) error {
	now := time.Now().UTC()
	res, err := r.db.ExecContext(ctx, db.QSoftDeleteContact, id, now)
	if err != nil {
		return fmt.Errorf("soft delete contact: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrContactNotFound
	}
	return nil
}

// ClearPrimary clears the current primary flag for an employee's contacts.
func (r *contactRepo) ClearPrimary(ctx context.Context, employeeID uuid.UUID) error {
	now := time.Now().UTC()
	if _, err := r.db.ExecContext(ctx, db.QClearPrimaryContacts, employeeID, now); err != nil {
		return fmt.Errorf("clear primary: %w", err)
	}
	return nil
}
