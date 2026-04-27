package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/mobility/internal/domain"
)

// SuccessionRepo persists succession_plans + succession_candidates.
type SuccessionRepo struct{ db *sqlx.DB }

func NewSuccessionRepo(db *sqlx.DB) *SuccessionRepo { return &SuccessionRepo{db: db} }

// UpsertPlan creates or refreshes a succession plan for a position.
func (r *SuccessionRepo) UpsertPlan(ctx context.Context, p *domain.SuccessionPlan) (*domain.SuccessionPlan, error) {
	const q = `
		INSERT INTO app.succession_plans (tenant_id, position_id, incumbent_employee_id, risk_level, criticality_tr)
		VALUES (:tenant_id, :position_id, :incumbent_employee_id, :risk_level, :criticality_tr)
		ON CONFLICT (tenant_id, position_id) DO UPDATE
		   SET incumbent_employee_id = EXCLUDED.incumbent_employee_id,
		       risk_level           = EXCLUDED.risk_level,
		       criticality_tr       = EXCLUDED.criticality_tr,
		       updated_at           = NOW()
		RETURNING id, created_at, updated_at;
	`
	rows, err := r.db.NamedQueryContext(ctx, q, p)
	if err != nil {
		return nil, fmt.Errorf("succession plan upsert: %w", err)
	}
	defer rows.Close()
	if rows.Next() {
		if err := rows.StructScan(p); err != nil {
			return nil, fmt.Errorf("succession plan scan: %w", err)
		}
	}
	return p, nil
}

// ListPlans returns all plans for a tenant.
func (r *SuccessionRepo) ListPlans(ctx context.Context, tenantID uuid.UUID) ([]domain.SuccessionPlan, error) {
	var plans []domain.SuccessionPlan
	err := r.db.SelectContext(ctx, &plans,
		`SELECT * FROM app.succession_plans WHERE tenant_id=$1 ORDER BY risk_level DESC, updated_at DESC;`,
		tenantID)
	if err != nil {
		return nil, fmt.Errorf("succession list: %w", err)
	}
	return plans, nil
}

// CandidatesForPlan returns ranked candidates for a plan.
func (r *SuccessionRepo) CandidatesForPlan(ctx context.Context, planID uuid.UUID) ([]domain.SuccessionCandidate, error) {
	var out []domain.SuccessionCandidate
	err := r.db.SelectContext(ctx, &out,
		`SELECT * FROM app.succession_candidates WHERE plan_id=$1 ORDER BY rank ASC, fit_score DESC;`,
		planID)
	if err != nil {
		return nil, fmt.Errorf("succession candidates: %w", err)
	}
	return out, nil
}

// AddCandidate appends a candidate (service enforces pool-size cap).
func (r *SuccessionRepo) AddCandidate(ctx context.Context, c *domain.SuccessionCandidate) (*domain.SuccessionCandidate, error) {
	const q = `
		INSERT INTO app.succession_candidates
		  (plan_id, candidate_employee_id, readiness, fit_score, gaps_tr, rank)
		VALUES
		  (:plan_id, :candidate_employee_id, :readiness, :fit_score, :gaps_tr, :rank)
		RETURNING id, created_at, updated_at;
	`
	rows, err := r.db.NamedQueryContext(ctx, q, c)
	if err != nil {
		return nil, fmt.Errorf("succession candidate insert: %w", err)
	}
	defer rows.Close()
	if rows.Next() {
		if err := rows.StructScan(c); err != nil {
			return nil, fmt.Errorf("succession candidate scan: %w", err)
		}
	}
	return c, nil
}

// CandidateCount returns the current number of candidates in a plan.
func (r *SuccessionRepo) CandidateCount(ctx context.Context, planID uuid.UUID) (int, error) {
	var n int
	if err := r.db.GetContext(ctx, &n,
		`SELECT COUNT(*) FROM app.succession_candidates WHERE plan_id=$1;`, planID); err != nil {
		return 0, fmt.Errorf("succession candidate count: %w", err)
	}
	return n, nil
}

// CandidateDistinctPlanCount returns how many distinct plans a candidate is in (across a tenant).
func (r *SuccessionRepo) CandidateDistinctPlanCount(
	ctx context.Context, tenantID, candidateEmployeeID uuid.UUID,
) (int, error) {
	var n int
	const q = `
		SELECT COUNT(DISTINCT sc.plan_id)
		  FROM app.succession_candidates sc
		  JOIN app.succession_plans sp ON sp.id = sc.plan_id
		 WHERE sp.tenant_id = $1 AND sc.candidate_employee_id = $2;
	`
	if err := r.db.GetContext(ctx, &n, q, tenantID, candidateEmployeeID); err != nil {
		return 0, fmt.Errorf("succession distinct pool count: %w", err)
	}
	return n, nil
}

// GetPlanByID returns a single plan (scoped to tenant).
func (r *SuccessionRepo) GetPlanByID(
	ctx context.Context, tenantID, planID uuid.UUID,
) (*domain.SuccessionPlan, error) {
	var p domain.SuccessionPlan
	err := r.db.GetContext(ctx, &p,
		`SELECT * FROM app.succession_plans WHERE tenant_id=$1 AND id=$2;`,
		tenantID, planID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("succession plan get: %w", err)
	}
	return &p, nil
}

// UpdateCandidateReadiness changes readiness (and optionally fit_score / rank / gaps).
// Only non-empty/non-zero pointer fields are updated.
func (r *SuccessionRepo) UpdateCandidateReadiness(
	ctx context.Context,
	candidateID uuid.UUID,
	readiness string,
	fitScore *float64,
	gapsTR *string,
	rank *int,
) (*domain.SuccessionCandidate, error) {
	sets := []string{"readiness = :readiness", "updated_at = NOW()"}
	args := map[string]any{
		"id":        candidateID,
		"readiness": readiness,
	}
	if fitScore != nil {
		sets = append(sets, "fit_score = :fit_score")
		args["fit_score"] = *fitScore
	}
	if gapsTR != nil {
		sets = append(sets, "gaps_tr = :gaps_tr")
		args["gaps_tr"] = *gapsTR
	}
	if rank != nil {
		sets = append(sets, "rank = :rank")
		args["rank"] = *rank
	}

	q := fmt.Sprintf(`UPDATE app.succession_candidates
	                   SET %s
	                 WHERE id = :id
	             RETURNING *;`, strings.Join(sets, ", "))

	rows, err := r.db.NamedQueryContext(ctx, q, args)
	if err != nil {
		return nil, fmt.Errorf("succession candidate update: %w", err)
	}
	defer rows.Close()
	var c domain.SuccessionCandidate
	if !rows.Next() {
		return nil, domain.ErrNotFound
	}
	if err := rows.StructScan(&c); err != nil {
		return nil, fmt.Errorf("succession candidate scan: %w", err)
	}
	return &c, nil
}

// RemoveCandidate deletes a candidate from its pool.
// tenantID guards cross-tenant deletion via a join check.
func (r *SuccessionRepo) RemoveCandidate(
	ctx context.Context, tenantID, candidateID uuid.UUID,
) error {
	const q = `
		DELETE FROM app.succession_candidates sc
		 USING app.succession_plans sp
		 WHERE sc.id = $1
		   AND sc.plan_id = sp.id
		   AND sp.tenant_id = $2;
	`
	res, err := r.db.ExecContext(ctx, q, candidateID, tenantID)
	if err != nil {
		return fmt.Errorf("succession candidate delete: %w", err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("succession candidate rows affected: %w", err)
	}
	if n == 0 {
		return domain.ErrNotFound
	}
	return nil
}

// CriticalPositionRow is the enriched join used by the critical-positions list.
type CriticalPositionRow struct {
	PlanID             uuid.UUID `db:"plan_id" json:"plan_id"`
	PositionID         uuid.UUID `db:"position_id" json:"position_id"`
	PositionTitleTR    string    `db:"position_title_tr" json:"position_title_tr"`
	DepartmentTR       string    `db:"department_tr" json:"department_tr"`
	RiskLevel          string    `db:"risk_level" json:"risk_level"`
	CriticalityTR      string    `db:"criticality_tr" json:"criticality_tr"`
	IncumbentEmpID     uuid.UUID `db:"incumbent_employee_id" json:"incumbent_employee_id"`
	IncumbentFullName  string    `db:"incumbent_full_name" json:"incumbent_full_name"`
	CandidateCount     int       `db:"candidate_count" json:"candidate_count"`
	ReadyNowCount      int       `db:"ready_now_count" json:"ready_now_count"`
	UpdatedAt          string    `db:"updated_at" json:"updated_at"`
}

// ListCriticalPositions returns an enriched snapshot per plan for UI.
// Orders by: ready_now_count ASC (riskiest first), risk_level DESC, updated_at DESC.
func (r *SuccessionRepo) ListCriticalPositions(
	ctx context.Context, tenantID uuid.UUID,
) ([]CriticalPositionRow, error) {
	const q = `
		SELECT
		   sp.id                               AS plan_id,
		   sp.position_id                      AS position_id,
		   COALESCE(pd.title_tr, '')           AS position_title_tr,
		   COALESCE(dept.name_tr, '')          AS department_tr,
		   sp.risk_level                       AS risk_level,
		   sp.criticality_tr                   AS criticality_tr,
		   sp.incumbent_employee_id            AS incumbent_employee_id,
		   COALESCE(emp.ad,'') || ' ' || COALESCE(emp.soyad,'')
		                                       AS incumbent_full_name,
		   COALESCE(cnt.total, 0)              AS candidate_count,
		   COALESCE(cnt.ready_now, 0)          AS ready_now_count,
		   to_char(sp.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS updated_at
		  FROM app.succession_plans sp
		  LEFT JOIN app.position_definitions pd ON pd.id = sp.position_id
		  LEFT JOIN app.employees emp           ON emp.id = sp.incumbent_employee_id
		  LEFT JOIN app.departments dept        ON dept.id = emp.department_id
		  LEFT JOIN LATERAL (
		     SELECT COUNT(*)                                              AS total,
		            COUNT(*) FILTER (WHERE sc.readiness = 'ready_now')    AS ready_now
		       FROM app.succession_candidates sc
		      WHERE sc.plan_id = sp.id
		  ) cnt ON TRUE
		 WHERE sp.tenant_id = $1
		 ORDER BY
		   (cnt.ready_now IS NULL OR cnt.ready_now = 0) DESC,
		   CASE sp.risk_level
		     WHEN 'critical' THEN 0 WHEN 'high' THEN 1
		     WHEN 'medium'   THEN 2 ELSE 3 END ASC,
		   sp.updated_at DESC;
	`
	var out []CriticalPositionRow
	if err := r.db.SelectContext(ctx, &out, q, tenantID); err != nil {
		return nil, fmt.Errorf("succession critical list: %w", err)
	}
	return out, nil
}
