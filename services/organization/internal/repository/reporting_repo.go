package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/organization/internal/domain"
)

// ReportingRepository persists reporting_lines.
type ReportingRepository interface {
	Create(ctx context.Context, tx Querier, r *domain.ReportingLine) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.ReportingLine, error)
	EndLine(ctx context.Context, tenantID, id uuid.UUID, endAt time.Time) error
	GetActiveLines(ctx context.Context, tenantID uuid.UUID) ([]*domain.ReportingLine, error)
	GetCurrentManager(ctx context.Context, tenantID, employeeID uuid.UUID) (*domain.ReportingLine, error)
	GetDirectReports(ctx context.Context, tenantID, managerID uuid.UUID, includeDotted bool) ([]*domain.ReportingLine, error)
	GetDottedManagers(ctx context.Context, tenantID, employeeID uuid.UUID) ([]*domain.ReportingLine, error)
	GetChainUpward(ctx context.Context, tenantID, employeeID uuid.UUID, maxDepth int) ([]*domain.ReportingLine, error)
}

type reportingRepo struct{ db *sqlx.DB }

// NewReportingRepository creates a ReportingRepository.
func NewReportingRepository(d *sqlx.DB) ReportingRepository {
	return &reportingRepo{db: d}
}

const qInsertLine = `
	INSERT INTO app.reporting_lines (id, tenant_id, employee_id, manager_id, line_type, effective_from, effective_to, created_at)
	VALUES (:id, :tenant_id, :employee_id, :manager_id, :line_type, :effective_from, :effective_to, :created_at)`

const qSelectLineCols = `
	SELECT id, tenant_id, employee_id, manager_id, line_type, effective_from, effective_to, created_at
	FROM app.reporting_lines`

func (r *reportingRepo) Create(ctx context.Context, tx Querier, line *domain.ReportingLine) error {
	q := r.qr(tx)
	if _, err := q.NamedExecContext(ctx, qInsertLine, line); err != nil {
		return fmt.Errorf("insert reporting line: %w", err)
	}
	return nil
}

func (r *reportingRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.ReportingLine, error) {
	q := qSelectLineCols + ` WHERE tenant_id = $1 AND id = $2`
	var l domain.ReportingLine
	if err := r.db.GetContext(ctx, &l, q, tenantID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrReportingNotFound
		}
		return nil, fmt.Errorf("get line: %w", err)
	}
	return &l, nil
}

func (r *reportingRepo) EndLine(ctx context.Context, tenantID, id uuid.UUID, endAt time.Time) error {
	q := `UPDATE app.reporting_lines SET effective_to = $3 WHERE tenant_id = $1 AND id = $2 AND effective_to IS NULL`
	res, err := r.db.ExecContext(ctx, q, tenantID, id, endAt.UTC())
	if err != nil {
		return fmt.Errorf("end line: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrReportingNotFound
	}
	return nil
}

func (r *reportingRepo) GetActiveLines(ctx context.Context, tenantID uuid.UUID) ([]*domain.ReportingLine, error) {
	q := qSelectLineCols + ` WHERE tenant_id = $1 AND effective_to IS NULL`
	var out []*domain.ReportingLine
	if err := r.db.SelectContext(ctx, &out, q, tenantID); err != nil {
		return nil, fmt.Errorf("list active lines: %w", err)
	}
	return out, nil
}

func (r *reportingRepo) GetCurrentManager(ctx context.Context, tenantID, employeeID uuid.UUID) (*domain.ReportingLine, error) {
	q := qSelectLineCols + ` WHERE tenant_id = $1 AND employee_id = $2 AND line_type = 'solid' AND effective_to IS NULL ORDER BY effective_from DESC LIMIT 1`
	var l domain.ReportingLine
	if err := r.db.GetContext(ctx, &l, q, tenantID, employeeID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrReportingNotFound
		}
		return nil, fmt.Errorf("get manager: %w", err)
	}
	return &l, nil
}

func (r *reportingRepo) GetDirectReports(ctx context.Context, tenantID, managerID uuid.UUID, includeDotted bool) ([]*domain.ReportingLine, error) {
	q := qSelectLineCols + ` WHERE tenant_id = $1 AND manager_id = $2 AND effective_to IS NULL`
	if !includeDotted {
		q += ` AND line_type = 'solid'`
	}
	q += ` ORDER BY employee_id`
	var out []*domain.ReportingLine
	if err := r.db.SelectContext(ctx, &out, q, tenantID, managerID); err != nil {
		return nil, fmt.Errorf("list reports: %w", err)
	}
	return out, nil
}

func (r *reportingRepo) GetDottedManagers(ctx context.Context, tenantID, employeeID uuid.UUID) ([]*domain.ReportingLine, error) {
	q := qSelectLineCols + ` WHERE tenant_id = $1 AND employee_id = $2 AND line_type = 'dotted' AND effective_to IS NULL`
	var out []*domain.ReportingLine
	if err := r.db.SelectContext(ctx, &out, q, tenantID, employeeID); err != nil {
		return nil, fmt.Errorf("list dotted: %w", err)
	}
	return out, nil
}

func (r *reportingRepo) GetChainUpward(ctx context.Context, tenantID, employeeID uuid.UUID, maxDepth int) ([]*domain.ReportingLine, error) {
	if maxDepth <= 0 {
		maxDepth = 15
	}
	// Recursive CTE follows solid manager chain upwards.
	q := `
		WITH RECURSIVE chain AS (
			SELECT id, tenant_id, employee_id, manager_id, line_type, effective_from, effective_to, created_at, 1 AS depth
			FROM app.reporting_lines
			WHERE tenant_id = $1 AND employee_id = $2 AND line_type = 'solid' AND effective_to IS NULL
			UNION ALL
			SELECT rl.id, rl.tenant_id, rl.employee_id, rl.manager_id, rl.line_type, rl.effective_from, rl.effective_to, rl.created_at, chain.depth + 1
			FROM app.reporting_lines rl
			JOIN chain ON rl.employee_id = chain.manager_id
			WHERE rl.tenant_id = chain.tenant_id
			  AND rl.line_type = 'solid'
			  AND rl.effective_to IS NULL
			  AND chain.depth < $3
		)
		SELECT id, tenant_id, employee_id, manager_id, line_type, effective_from, effective_to, created_at
		FROM chain ORDER BY depth`
	var out []*domain.ReportingLine
	if err := r.db.SelectContext(ctx, &out, q, tenantID, employeeID, maxDepth); err != nil {
		return nil, fmt.Errorf("chain upward: %w", err)
	}
	return out, nil
}

func (r *reportingRepo) qr(tx Querier) Querier {
	if tx != nil {
		return tx
	}
	return r.db
}
