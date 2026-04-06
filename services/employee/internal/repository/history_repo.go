package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/employee/internal/db"
	"github.com/upcore/employee/internal/domain"
)

// HistoryRepository abstracts the employment_history table.
type HistoryRepository interface {
	Append(ctx context.Context, tx Querier, h *domain.EmploymentHistory) error
	ListByEmployee(ctx context.Context, employeeID uuid.UUID, page, limit int) ([]*domain.EmploymentHistory, int, error)
	GetLastByType(ctx context.Context, employeeID uuid.UUID, changeType domain.ChangeType) (*domain.EmploymentHistory, error)
}

type historyRepo struct {
	db *sqlx.DB
}

// NewHistoryRepository constructs a HistoryRepository.
func NewHistoryRepository(d *sqlx.DB) HistoryRepository {
	return &historyRepo{db: d}
}

// Append inserts a history entry (append-only).
func (r *historyRepo) Append(ctx context.Context, tx Querier, h *domain.EmploymentHistory) error {
	if tx == nil {
		tx = r.db
	}
	if h.ID == uuid.Nil {
		h.ID = uuid.New()
	}
	if h.CreatedAt.IsZero() {
		h.CreatedAt = time.Now().UTC()
	}
	h.ApplyDefaults()
	if _, err := tx.NamedExecContext(ctx, db.QInsertEmploymentHistory, h); err != nil {
		return fmt.Errorf("insert history: %w", err)
	}
	return nil
}

// ListByEmployee returns a paged list of history entries for an employee.
func (r *historyRepo) ListByEmployee(ctx context.Context, employeeID uuid.UUID, page, limit int) ([]*domain.EmploymentHistory, int, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	if page <= 0 {
		page = 1
	}
	offset := (page - 1) * limit
	rows := []*domain.EmploymentHistory{}
	if err := r.db.SelectContext(ctx, &rows, db.QSelectHistoryByEmployee, employeeID, limit, offset); err != nil {
		return nil, 0, fmt.Errorf("select history: %w", err)
	}
	var total int
	if err := r.db.GetContext(ctx, &total, db.QCountHistoryByEmployee, employeeID); err != nil {
		return nil, 0, fmt.Errorf("count history: %w", err)
	}
	return rows, total, nil
}

// GetLastByType returns the most recent history entry of the given type.
func (r *historyRepo) GetLastByType(ctx context.Context, employeeID uuid.UUID, changeType domain.ChangeType) (*domain.EmploymentHistory, error) {
	q := `SELECT ` + db.EmploymentHistoryCols + `
		FROM app.employment_history
		WHERE employee_id = $1 AND change_type = $2
		ORDER BY effective_date DESC, created_at DESC
		LIMIT 1`
	var h domain.EmploymentHistory
	if err := r.db.GetContext(ctx, &h, q, employeeID, string(changeType)); err != nil {
		return nil, domain.ErrHistoryNotFound
	}
	return &h, nil
}
