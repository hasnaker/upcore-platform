package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/tenant/internal/domain"
)

// OnboardingDraftRepository persists wizard drafts.
type OnboardingDraftRepository interface {
	// Upsert inserts a new draft or updates an existing one for the user.
	// The tenant-commit path sets Status=committed and CommittedTenantID.
	Upsert(ctx context.Context, tx Querier, d *domain.OnboardingDraft) error
	GetByID(ctx context.Context, id uuid.UUID) (*domain.OnboardingDraft, error)
	// GetInProgressByUser returns the active draft for a Clerk user, or
	// ErrOnboardingDraftNotFound if none exists.
	GetInProgressByUser(ctx context.Context, clerkUserID string) (*domain.OnboardingDraft, error)
	// MarkCommitted records the resulting tenant and flips status.
	MarkCommitted(ctx context.Context, tx Querier, id uuid.UUID, tenantID uuid.UUID) error
	// MarkAbandoned lets the user discard and start over.
	MarkAbandoned(ctx context.Context, id uuid.UUID) error
	// ListForFunnel returns aggregated step counts for the funnel dashboard
	// between [from,to). Status filter applies.
	ListForFunnel(ctx context.Context, from, to time.Time) (FunnelAggregate, error)
}

// FunnelAggregate counts per step + per status.
type FunnelAggregate struct {
	Total      int                        `json:"total"`
	Committed  int                        `json:"committed"`
	Abandoned  int                        `json:"abandoned"`
	InProgress int                        `json:"in_progress"`
	PerStep    map[int]FunnelStepCount    `json:"per_step"`
}

// FunnelStepCount is the breakdown for one step.
type FunnelStepCount struct {
	Reached   int `json:"reached"`
	Completed int `json:"completed"`
}

type onboardingDraftRepo struct {
	db *sqlx.DB
}

// NewOnboardingDraftRepository wires up the SQL-backed draft repository.
func NewOnboardingDraftRepository(d *sqlx.DB) OnboardingDraftRepository {
	return &onboardingDraftRepo{db: d}
}

const (
	qInsertDraft = `
		INSERT INTO tenant_onboarding_drafts
			(id, clerk_user_id, admin_email, current_step, status, data, created_at, updated_at)
		VALUES
			(:id, :clerk_user_id, :admin_email, :current_step, :status, :data, :created_at, :updated_at)`

	qUpdateDraft = `
		UPDATE tenant_onboarding_drafts SET
			admin_email = :admin_email,
			current_step = :current_step,
			status = :status,
			data = :data,
			updated_at = :updated_at
		WHERE id = :id`

	qSelectDraftByID = `
		SELECT id, clerk_user_id, admin_email, current_step, status,
			committed_tenant_id, data, created_at, updated_at
		FROM tenant_onboarding_drafts WHERE id = $1`

	qSelectInProgressByUser = `
		SELECT id, clerk_user_id, admin_email, current_step, status,
			committed_tenant_id, data, created_at, updated_at
		FROM tenant_onboarding_drafts
		WHERE clerk_user_id = $1 AND status = 'in_progress'
		ORDER BY updated_at DESC LIMIT 1`

	qMarkCommitted = `
		UPDATE tenant_onboarding_drafts SET
			status = 'committed',
			committed_tenant_id = $2,
			updated_at = now()
		WHERE id = $1 AND status = 'in_progress'`

	qMarkAbandoned = `
		UPDATE tenant_onboarding_drafts SET
			status = 'abandoned',
			updated_at = now()
		WHERE id = $1 AND status = 'in_progress'`

	qFunnelAgg = `
		SELECT
			COUNT(*) FILTER (WHERE TRUE)                              AS total,
			COUNT(*) FILTER (WHERE status = 'committed')              AS committed,
			COUNT(*) FILTER (WHERE status = 'abandoned')              AS abandoned,
			COUNT(*) FILTER (WHERE status = 'in_progress')            AS in_progress
		FROM tenant_onboarding_drafts
		WHERE created_at >= $1 AND created_at < $2`

	qFunnelSteps = `
		SELECT current_step, status, COUNT(*) AS c
		FROM tenant_onboarding_drafts
		WHERE created_at >= $1 AND created_at < $2
		GROUP BY current_step, status`
)

// Upsert inserts a new draft or updates the existing row by ID.
func (r *onboardingDraftRepo) Upsert(ctx context.Context, tx Querier, d *domain.OnboardingDraft) error {
	if tx == nil {
		tx = r.db
	}
	now := time.Now().UTC()
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
		d.CreatedAt = now
		d.UpdatedAt = now
		if d.Status == "" {
			d.Status = domain.OnboardingStatusInProgress
		}
		if d.CurrentStep == 0 {
			d.CurrentStep = 1
		}
		if _, err := tx.NamedExecContext(ctx, qInsertDraft, d); err != nil {
			return fmt.Errorf("insert draft: %w", err)
		}
		return nil
	}
	d.UpdatedAt = now
	if _, err := tx.NamedExecContext(ctx, qUpdateDraft, d); err != nil {
		return fmt.Errorf("update draft: %w", err)
	}
	return nil
}

func (r *onboardingDraftRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.OnboardingDraft, error) {
	var d domain.OnboardingDraft
	if err := r.db.GetContext(ctx, &d, qSelectDraftByID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrOnboardingDraftNotFound
		}
		return nil, fmt.Errorf("select draft: %w", err)
	}
	return &d, nil
}

func (r *onboardingDraftRepo) GetInProgressByUser(ctx context.Context, clerkUserID string) (*domain.OnboardingDraft, error) {
	var d domain.OnboardingDraft
	if err := r.db.GetContext(ctx, &d, qSelectInProgressByUser, clerkUserID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrOnboardingDraftNotFound
		}
		return nil, fmt.Errorf("select in-progress draft: %w", err)
	}
	return &d, nil
}

func (r *onboardingDraftRepo) MarkCommitted(ctx context.Context, tx Querier, id, tenantID uuid.UUID) error {
	if tx == nil {
		tx = r.db
	}
	res, err := tx.ExecContext(ctx, qMarkCommitted, id, tenantID)
	if err != nil {
		return fmt.Errorf("mark committed: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrOnboardingAlreadyCommit
	}
	return nil
}

func (r *onboardingDraftRepo) MarkAbandoned(ctx context.Context, id uuid.UUID) error {
	res, err := r.db.ExecContext(ctx, qMarkAbandoned, id)
	if err != nil {
		return fmt.Errorf("mark abandoned: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrOnboardingDraftNotFound
	}
	return nil
}

func (r *onboardingDraftRepo) ListForFunnel(ctx context.Context, from, to time.Time) (FunnelAggregate, error) {
	agg := FunnelAggregate{PerStep: map[int]FunnelStepCount{}}
	row := r.db.QueryRowxContext(ctx, qFunnelAgg, from, to)
	if err := row.Scan(&agg.Total, &agg.Committed, &agg.Abandoned, &agg.InProgress); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return agg, nil
		}
		return agg, fmt.Errorf("scan funnel agg: %w", err)
	}

	rows, err := r.db.QueryxContext(ctx, qFunnelSteps, from, to)
	if err != nil {
		return agg, fmt.Errorf("query funnel steps: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var step int
		var status string
		var c int
		if err := rows.Scan(&step, &status, &c); err != nil {
			return agg, fmt.Errorf("scan funnel row: %w", err)
		}
		fs := agg.PerStep[step]
		fs.Reached += c
		if status == string(domain.OnboardingStatusCommitted) {
			fs.Completed += c
		}
		agg.PerStep[step] = fs
	}
	if err := rows.Err(); err != nil {
		return agg, fmt.Errorf("iterate funnel rows: %w", err)
	}
	return agg, nil
}
