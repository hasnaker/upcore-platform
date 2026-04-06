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

// PositionRepository persists position_definitions rows.
type PositionRepository interface {
	Create(ctx context.Context, tx Querier, p *domain.Position) error
	GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Position, error)
	GetByCode(ctx context.Context, tenantID uuid.UUID, code string) (*domain.Position, error)
	List(ctx context.Context, tenantID uuid.UUID, filter PositionFilter) ([]*domain.Position, int, error)
	Update(ctx context.Context, tx Querier, p *domain.Position) error
	UpdateJDR(ctx context.Context, tx Querier, tenantID, id uuid.UUID, demands domain.JDRDemands, resources domain.JDRResources) error
	Archive(ctx context.Context, tenantID, id uuid.UUID) error
}

// PositionFilter drives List queries.
type PositionFilter struct {
	DepartmentID    *uuid.UUID
	JobFamily       string
	JobLevel        string
	IncludeArchived bool
	Search          string
	Page            int
	Limit           int
}

type positionRepo struct{ db *sqlx.DB }

// NewPositionRepository creates a new PositionRepository.
func NewPositionRepository(d *sqlx.DB) PositionRepository {
	return &positionRepo{db: d}
}

const qInsertPosition = `
	INSERT INTO app.position_definitions
	  (id, tenant_id, department_id, code, title_tr, title_en, job_family, job_level,
	   seniority_min_years, description_tr, description_en, responsibilities,
	   required_skills, preferred_skills, jdr_talepler, jdr_kaynaklar,
	   salary_band_min, salary_band_max, salary_currency, employment_type,
	   remote_policy, active, created_at, updated_at)
	VALUES
	  (:id, :tenant_id, :department_id, :code, :title_tr, :title_en, :job_family, :job_level,
	   :seniority_min_years, :description_tr, :description_en, :responsibilities,
	   :required_skills, :preferred_skills, :jdr_talepler, :jdr_kaynaklar,
	   :salary_band_min, :salary_band_max, :salary_currency, :employment_type,
	   :remote_policy, :active, :created_at, :updated_at)`

const qSelectPositionCols = `
	SELECT id, tenant_id, department_id, code, title_tr, title_en, job_family, job_level,
	  seniority_min_years, description_tr, description_en, responsibilities,
	  required_skills, preferred_skills, jdr_talepler, jdr_kaynaklar,
	  salary_band_min, salary_band_max, salary_currency, employment_type,
	  remote_policy, active, created_at, updated_at, deleted_at
	FROM app.position_definitions`

func (r *positionRepo) Create(ctx context.Context, tx Querier, p *domain.Position) error {
	q := r.qr(tx)
	if _, err := q.NamedExecContext(ctx, qInsertPosition, p); err != nil {
		if isUniqueViolation(err, "uq_positions_tenant_code", "code") {
			return domain.ErrDuplicateCode
		}
		return fmt.Errorf("insert position: %w", err)
	}
	return nil
}

func (r *positionRepo) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.Position, error) {
	q := qSelectPositionCols + ` WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`
	var p domain.Position
	if err := r.db.GetContext(ctx, &p, q, tenantID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrPositionNotFound
		}
		return nil, fmt.Errorf("get position: %w", err)
	}
	return &p, nil
}

func (r *positionRepo) GetByCode(ctx context.Context, tenantID uuid.UUID, code string) (*domain.Position, error) {
	q := qSelectPositionCols + ` WHERE tenant_id = $1 AND code = $2 AND deleted_at IS NULL`
	var p domain.Position
	if err := r.db.GetContext(ctx, &p, q, tenantID, code); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrPositionNotFound
		}
		return nil, fmt.Errorf("get position by code: %w", err)
	}
	return &p, nil
}

func (r *positionRepo) List(ctx context.Context, tenantID uuid.UUID, f PositionFilter) ([]*domain.Position, int, error) {
	if f.Limit <= 0 || f.Limit > 200 {
		f.Limit = 50
	}
	if f.Page < 1 {
		f.Page = 1
	}
	offset := (f.Page - 1) * f.Limit

	where := []any{tenantID}
	q := qSelectPositionCols + ` WHERE tenant_id = $1 AND deleted_at IS NULL`
	countQ := `SELECT count(*) FROM app.position_definitions WHERE tenant_id = $1 AND deleted_at IS NULL`

	argN := 2
	if f.DepartmentID != nil {
		q += fmt.Sprintf(" AND department_id = $%d", argN)
		countQ += fmt.Sprintf(" AND department_id = $%d", argN)
		where = append(where, *f.DepartmentID)
		argN++
	}
	if f.JobFamily != "" {
		q += fmt.Sprintf(" AND job_family = $%d", argN)
		countQ += fmt.Sprintf(" AND job_family = $%d", argN)
		where = append(where, f.JobFamily)
		argN++
	}
	if f.JobLevel != "" {
		q += fmt.Sprintf(" AND job_level = $%d", argN)
		countQ += fmt.Sprintf(" AND job_level = $%d", argN)
		where = append(where, f.JobLevel)
		argN++
	}
	if !f.IncludeArchived {
		q += " AND active = true"
		countQ += " AND active = true"
	}
	if f.Search != "" {
		q += fmt.Sprintf(" AND title_tr ILIKE $%d", argN)
		countQ += fmt.Sprintf(" AND title_tr ILIKE $%d", argN)
		where = append(where, "%"+f.Search+"%")
		argN++
	}
	q += fmt.Sprintf(" ORDER BY created_at DESC LIMIT $%d OFFSET $%d", argN, argN+1)
	listArgs := append(where, f.Limit, offset)

	var out []*domain.Position
	if err := r.db.SelectContext(ctx, &out, q, listArgs...); err != nil {
		return nil, 0, fmt.Errorf("list positions: %w", err)
	}
	var total int
	if err := r.db.GetContext(ctx, &total, countQ, where...); err != nil {
		return nil, 0, fmt.Errorf("count positions: %w", err)
	}
	return out, total, nil
}

func (r *positionRepo) Update(ctx context.Context, tx Querier, p *domain.Position) error {
	q := `
		UPDATE app.position_definitions SET
		  department_id = :department_id,
		  title_tr = :title_tr,
		  title_en = :title_en,
		  job_family = :job_family,
		  job_level = :job_level,
		  seniority_min_years = :seniority_min_years,
		  description_tr = :description_tr,
		  description_en = :description_en,
		  responsibilities = :responsibilities,
		  required_skills = :required_skills,
		  preferred_skills = :preferred_skills,
		  salary_band_min = :salary_band_min,
		  salary_band_max = :salary_band_max,
		  salary_currency = :salary_currency,
		  employment_type = :employment_type,
		  remote_policy = :remote_policy,
		  active = :active,
		  updated_at = now()
		WHERE id = :id AND tenant_id = :tenant_id AND deleted_at IS NULL`
	res, err := r.qr(tx).NamedExecContext(ctx, q, p)
	if err != nil {
		return fmt.Errorf("update position: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrPositionNotFound
	}
	return nil
}

func (r *positionRepo) UpdateJDR(ctx context.Context, tx Querier, tenantID, id uuid.UUID, demands domain.JDRDemands, resources domain.JDRResources) error {
	q := `UPDATE app.position_definitions SET jdr_talepler = $3, jdr_kaynaklar = $4, updated_at = now() WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`
	res, err := r.qr(tx).ExecContext(ctx, q, tenantID, id, demands, resources)
	if err != nil {
		return fmt.Errorf("update jdr: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrPositionNotFound
	}
	return nil
}

func (r *positionRepo) Archive(ctx context.Context, tenantID, id uuid.UUID) error {
	q := `UPDATE app.position_definitions SET active = false, deleted_at = now(), updated_at = now() WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL`
	res, err := r.db.ExecContext(ctx, q, tenantID, id)
	if err != nil {
		return fmt.Errorf("archive position: %w", err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return domain.ErrPositionNotFound
	}
	return nil
}

func (r *positionRepo) qr(tx Querier) Querier {
	if tx != nil {
		return tx
	}
	return r.db
}
