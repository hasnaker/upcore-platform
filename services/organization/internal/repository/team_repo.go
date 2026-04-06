package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/organization/internal/domain"
)

// TeamRepository persists teams and team membership.
type TeamRepository interface {
	Create(ctx context.Context, tx Querier, t *domain.Team) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Team, error)
	List(ctx context.Context, tenantID uuid.UUID, includeArchived bool) ([]*domain.Team, error)
	ListByDepartment(ctx context.Context, tenantID, departmentID uuid.UUID) ([]*domain.Team, error)
	Update(ctx context.Context, tx Querier, t *domain.Team) error
	Archive(ctx context.Context, tenantID, id uuid.UUID) error

	AddMember(ctx context.Context, tx Querier, m *domain.TeamMember) error
	RemoveMember(ctx context.Context, tenantID, teamID, employeeID uuid.UUID) error
	ListMembers(ctx context.Context, tenantID, teamID uuid.UUID) ([]*domain.TeamMember, error)
	ListByEmployee(ctx context.Context, tenantID, employeeID uuid.UUID) ([]*domain.TeamMember, error)
}

type teamRepo struct{ db *sqlx.DB }

// NewTeamRepository creates a TeamRepository.
func NewTeamRepository(d *sqlx.DB) TeamRepository {
	return &teamRepo{db: d}
}

const qInsertTeam = `
	INSERT INTO app.teams (id, tenant_id, name, department_id, lead_employee_id, description, active, created_at, updated_at)
	VALUES (:id, :tenant_id, :name, :department_id, :lead_employee_id, :description, :active, :created_at, :updated_at)`

const qSelectTeamCols = `
	SELECT id, tenant_id, name, department_id, lead_employee_id, description,
	  active, created_at, updated_at, deleted_at
	FROM app.teams`

func (r *teamRepo) Create(ctx context.Context, tx Querier, t *domain.Team) error {
	q := r.qr(tx)
	if _, err := q.NamedExecContext(ctx, qInsertTeam, t); err != nil {
		return fmt.Errorf("insert team: %w", err)
	}
	return nil
}

func (r *teamRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Team, error) {
	q := qSelectTeamCols + ` WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`
	var t domain.Team
	if err := r.db.GetContext(ctx, &t, q, tenantID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrTeamNotFound
		}
		return nil, fmt.Errorf("get team: %w", err)
	}
	return &t, nil
}

func (r *teamRepo) List(ctx context.Context, tenantID uuid.UUID, includeArchived bool) ([]*domain.Team, error) {
	q := qSelectTeamCols + ` WHERE tenant_id = $1 AND deleted_at IS NULL`
	if !includeArchived {
		q += ` AND active = true`
	}
	q += ` ORDER BY name`
	var out []*domain.Team
	if err := r.db.SelectContext(ctx, &out, q, tenantID); err != nil {
		return nil, fmt.Errorf("list teams: %w", err)
	}
	return out, nil
}

func (r *teamRepo) ListByDepartment(ctx context.Context, tenantID, departmentID uuid.UUID) ([]*domain.Team, error) {
	q := qSelectTeamCols + ` WHERE tenant_id = $1 AND department_id = $2 AND deleted_at IS NULL AND active = true ORDER BY name`
	var out []*domain.Team
	if err := r.db.SelectContext(ctx, &out, q, tenantID, departmentID); err != nil {
		return nil, fmt.Errorf("list teams by dept: %w", err)
	}
	return out, nil
}

func (r *teamRepo) Update(ctx context.Context, tx Querier, t *domain.Team) error {
	q := `
		UPDATE app.teams SET
		  name = :name,
		  department_id = :department_id,
		  lead_employee_id = :lead_employee_id,
		  description = :description,
		  active = :active,
		  updated_at = now()
		WHERE id = :id AND tenant_id = :tenant_id AND deleted_at IS NULL`
	res, err := r.qr(tx).NamedExecContext(ctx, q, t)
	if err != nil {
		return fmt.Errorf("update team: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrTeamNotFound
	}
	return nil
}

func (r *teamRepo) Archive(ctx context.Context, tenantID, id uuid.UUID) error {
	q := `UPDATE app.teams SET active = false, deleted_at = now(), updated_at = now() WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`
	res, err := r.db.ExecContext(ctx, q, tenantID, id)
	if err != nil {
		return fmt.Errorf("archive team: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrTeamNotFound
	}
	return nil
}

func (r *teamRepo) AddMember(ctx context.Context, tx Querier, m *domain.TeamMember) error {
	q := `
		INSERT INTO app.team_members (team_id, employee_id, tenant_id, role, joined_at)
		VALUES (:team_id, :employee_id, :tenant_id, :role, :joined_at)
		ON CONFLICT (team_id, employee_id) DO UPDATE SET role = EXCLUDED.role`
	if _, err := r.qr(tx).NamedExecContext(ctx, q, m); err != nil {
		return fmt.Errorf("add member: %w", err)
	}
	return nil
}

func (r *teamRepo) RemoveMember(ctx context.Context, tenantID, teamID, employeeID uuid.UUID) error {
	q := `DELETE FROM app.team_members WHERE tenant_id = $1 AND team_id = $2 AND employee_id = $3`
	res, err := r.db.ExecContext(ctx, q, tenantID, teamID, employeeID)
	if err != nil {
		return fmt.Errorf("remove member: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

func (r *teamRepo) ListMembers(ctx context.Context, tenantID, teamID uuid.UUID) ([]*domain.TeamMember, error) {
	q := `SELECT team_id, employee_id, tenant_id, role, joined_at FROM app.team_members WHERE tenant_id = $1 AND team_id = $2 ORDER BY joined_at`
	var out []*domain.TeamMember
	if err := r.db.SelectContext(ctx, &out, q, tenantID, teamID); err != nil {
		return nil, fmt.Errorf("list members: %w", err)
	}
	return out, nil
}

func (r *teamRepo) ListByEmployee(ctx context.Context, tenantID, employeeID uuid.UUID) ([]*domain.TeamMember, error) {
	q := `SELECT team_id, employee_id, tenant_id, role, joined_at FROM app.team_members WHERE tenant_id = $1 AND employee_id = $2`
	var out []*domain.TeamMember
	if err := r.db.SelectContext(ctx, &out, q, tenantID, employeeID); err != nil {
		return nil, fmt.Errorf("list by employee: %w", err)
	}
	return out, nil
}

func (r *teamRepo) qr(tx Querier) Querier {
	if tx != nil {
		return tx
	}
	return r.db
}
