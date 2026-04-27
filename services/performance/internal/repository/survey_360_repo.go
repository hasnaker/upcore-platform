// Package repository — 360° feedback campaigns, invitations, responses.
package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/performance/internal/domain"
)

// ============================================================================
// Survey360Repository
// ============================================================================

// Survey360Repository abstracts the 3 tables.
type Survey360Repository interface {
	CreateCampaign(ctx context.Context, c *domain.Survey360Campaign) error
	UpdateCampaignStatus(ctx context.Context, tenantID, id uuid.UUID, status domain.CampaignStatus) error
	GetCampaign(ctx context.Context, tenantID, id uuid.UUID) (*domain.Survey360Campaign, error)
	ListCampaignsBySubject(ctx context.Context, tenantID, subjectUserID uuid.UUID) ([]*domain.Survey360Campaign, error)

	AddInvitation(ctx context.Context, inv *domain.Survey360Invitation) error
	GetInvitation(ctx context.Context, tenantID, id uuid.UUID) (*domain.Survey360Invitation, error)
	ListInvitationsByCampaign(ctx context.Context, tenantID, campaignID uuid.UUID) ([]*domain.Survey360Invitation, error)
	ListInvitationsByReviewer(ctx context.Context, tenantID, reviewerUserID uuid.UUID) ([]*domain.Survey360Invitation, error)
	MarkInvitationResponded(ctx context.Context, tenantID, id uuid.UUID) error

	AppendResponses(ctx context.Context, tenantID, invitationID, campaignID uuid.UUID, items []domain.Survey360Response) error
	ListResponsesByCampaign(ctx context.Context, tenantID, campaignID uuid.UUID) ([]*domain.Survey360Response, map[uuid.UUID]domain.Relation, error)
}

type survey360Repo struct{ db *sqlx.DB }

// NewSurvey360Repository constructs the repo.
func NewSurvey360Repository(d *sqlx.DB) Survey360Repository { return &survey360Repo{db: d} }

const campCols = `id, tenant_id, cycle_id, subject_user_id, created_by, anonymity_mode,
	status, due_date, min_responses, metadata, distributed_at, completed_at, created_at, updated_at`

const invCols = `id, tenant_id, campaign_id, reviewer_user_id, relation, status,
	sent_at, responded_at, created_at, updated_at`

const respCols = `id, tenant_id, invitation_id, campaign_id, competency_code, competency_name_tr,
	score, comment, created_at`

func (r *survey360Repo) CreateCampaign(ctx context.Context, c *domain.Survey360Campaign) error {
	c.ApplyDefaults()
	now := time.Now().UTC()
	if c.CreatedAt.IsZero() {
		c.CreatedAt = now
	}
	c.UpdatedAt = now
	tx, err := beginTenantTx(ctx, r.db, c.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	q := `INSERT INTO app.survey_360_campaigns (
		id, tenant_id, cycle_id, subject_user_id, created_by, anonymity_mode,
		status, due_date, min_responses, metadata, distributed_at, completed_at, created_at, updated_at
	) VALUES (
		:id, :tenant_id, :cycle_id, :subject_user_id, :created_by, :anonymity_mode,
		:status, :due_date, :min_responses, :metadata, :distributed_at, :completed_at, :created_at, :updated_at
	)`
	if _, err := tx.NamedExecContext(ctx, q, c); err != nil {
		return fmt.Errorf("insert s360 campaign: %w", err)
	}
	return tx.Commit()
}

func (r *survey360Repo) UpdateCampaignStatus(ctx context.Context, tenantID, id uuid.UUID, status domain.CampaignStatus) error {
	tx, err := beginTenantTx(ctx, r.db, tenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	now := time.Now().UTC()
	q := `UPDATE app.survey_360_campaigns SET status = $3, updated_at = $4`
	args := []any{tenantID, id, string(status), now}
	switch status {
	case domain.CampDistributed:
		q += `, distributed_at = $4`
	case domain.CampComplete:
		q += `, completed_at = $4`
	}
	q += ` WHERE tenant_id = $1 AND id = $2`
	res, err := tx.ExecContext(ctx, q, args...)
	if err != nil {
		return fmt.Errorf("update s360 camp status: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return domain.ErrNotFound
	}
	return tx.Commit()
}

func (r *survey360Repo) GetCampaign(ctx context.Context, tenantID, id uuid.UUID) (*domain.Survey360Campaign, error) {
	tx, err := beginTenantTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	var c domain.Survey360Campaign
	q := `SELECT ` + campCols + ` FROM app.survey_360_campaigns WHERE tenant_id = $1 AND id = $2`
	if err := tx.GetContext(ctx, &c, q, tenantID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("select s360 camp: %w", err)
	}
	return &c, nil
}

func (r *survey360Repo) ListCampaignsBySubject(ctx context.Context, tenantID, subjectUserID uuid.UUID) ([]*domain.Survey360Campaign, error) {
	tx, err := beginTenantTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	conds := []string{"tenant_id = $1"}
	args := []any{tenantID}
	if subjectUserID != uuid.Nil {
		conds = append(conds, "subject_user_id = $2")
		args = append(args, subjectUserID)
	}
	q := fmt.Sprintf("SELECT %s FROM app.survey_360_campaigns WHERE %s ORDER BY created_at DESC",
		campCols, strings.Join(conds, " AND "))
	out := []*domain.Survey360Campaign{}
	if err := tx.SelectContext(ctx, &out, q, args...); err != nil {
		return nil, fmt.Errorf("list s360 camps: %w", err)
	}
	return out, nil
}

func (r *survey360Repo) AddInvitation(ctx context.Context, inv *domain.Survey360Invitation) error {
	inv.ApplyDefaults()
	now := time.Now().UTC()
	if inv.CreatedAt.IsZero() {
		inv.CreatedAt = now
	}
	inv.UpdatedAt = now
	tx, err := beginTenantTx(ctx, r.db, inv.TenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	q := `INSERT INTO app.survey_360_invitations (
		id, tenant_id, campaign_id, reviewer_user_id, relation, status,
		sent_at, responded_at, created_at, updated_at
	) VALUES (
		:id, :tenant_id, :campaign_id, :reviewer_user_id, :relation, :status,
		:sent_at, :responded_at, :created_at, :updated_at
	)`
	if _, err := tx.NamedExecContext(ctx, q, inv); err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "unique") ||
			strings.Contains(strings.ToLower(err.Error()), "duplicate") {
			return domain.ErrConflict
		}
		return fmt.Errorf("insert s360 inv: %w", err)
	}
	return tx.Commit()
}

func (r *survey360Repo) GetInvitation(ctx context.Context, tenantID, id uuid.UUID) (*domain.Survey360Invitation, error) {
	tx, err := beginTenantTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	var inv domain.Survey360Invitation
	q := `SELECT ` + invCols + ` FROM app.survey_360_invitations WHERE tenant_id = $1 AND id = $2`
	if err := tx.GetContext(ctx, &inv, q, tenantID, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrNotFound
		}
		return nil, fmt.Errorf("select s360 inv: %w", err)
	}
	return &inv, nil
}

func (r *survey360Repo) ListInvitationsByCampaign(ctx context.Context, tenantID, campaignID uuid.UUID) ([]*domain.Survey360Invitation, error) {
	tx, err := beginTenantTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	q := `SELECT ` + invCols + ` FROM app.survey_360_invitations
	      WHERE tenant_id = $1 AND campaign_id = $2 ORDER BY relation, created_at`
	out := []*domain.Survey360Invitation{}
	if err := tx.SelectContext(ctx, &out, q, tenantID, campaignID); err != nil {
		return nil, fmt.Errorf("list s360 inv by camp: %w", err)
	}
	return out, nil
}

func (r *survey360Repo) ListInvitationsByReviewer(ctx context.Context, tenantID, reviewerUserID uuid.UUID) ([]*domain.Survey360Invitation, error) {
	tx, err := beginTenantTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()
	q := `SELECT ` + invCols + ` FROM app.survey_360_invitations
	      WHERE tenant_id = $1 AND reviewer_user_id = $2 ORDER BY created_at DESC`
	out := []*domain.Survey360Invitation{}
	if err := tx.SelectContext(ctx, &out, q, tenantID, reviewerUserID); err != nil {
		return nil, fmt.Errorf("list s360 inv by reviewer: %w", err)
	}
	return out, nil
}

func (r *survey360Repo) MarkInvitationResponded(ctx context.Context, tenantID, id uuid.UUID) error {
	tx, err := beginTenantTx(ctx, r.db, tenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	now := time.Now().UTC()
	res, err := tx.ExecContext(ctx,
		`UPDATE app.survey_360_invitations
		 SET status = 'responded', responded_at = $3, updated_at = $3
		 WHERE tenant_id = $1 AND id = $2 AND status != 'responded'`,
		tenantID, id, now)
	if err != nil {
		return fmt.Errorf("mark responded: %w", err)
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		// Idempotency: if already responded, surface conflict so handlers can
		// reject a second submit cleanly.
		return domain.ErrConflict
	}
	return tx.Commit()
}

func (r *survey360Repo) AppendResponses(ctx context.Context, tenantID, invitationID, campaignID uuid.UUID, items []domain.Survey360Response) error {
	if len(items) == 0 {
		return domain.NewValidationError(map[string]string{"responses": "empty"})
	}
	tx, err := beginTenantTx(ctx, r.db, tenantID, false)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()
	now := time.Now().UTC()
	for i := range items {
		items[i].TenantID = tenantID
		items[i].InvitationID = invitationID
		items[i].CampaignID = campaignID
		items[i].ApplyDefaults()
		if items[i].CreatedAt.IsZero() {
			items[i].CreatedAt = now
		}
		q := `INSERT INTO app.survey_360_responses (
			id, tenant_id, invitation_id, campaign_id, competency_code, competency_name_tr,
			score, comment, created_at
		) VALUES (
			:id, :tenant_id, :invitation_id, :campaign_id, :competency_code, :competency_name_tr,
			:score, :comment, :created_at
		)`
		if _, err := tx.NamedExecContext(ctx, q, items[i]); err != nil {
			if strings.Contains(strings.ToLower(err.Error()), "unique") ||
				strings.Contains(strings.ToLower(err.Error()), "duplicate") {
				return domain.ErrConflict
			}
			return fmt.Errorf("insert s360 response: %w", err)
		}
	}
	return tx.Commit()
}

// ListResponsesByCampaign returns every response + a map of invitation_id →
// reviewer relation. Anonymous mode callers should use only the relation map
// (reviewer_user_id stays absent because responses table has no reviewer id).
func (r *survey360Repo) ListResponsesByCampaign(ctx context.Context, tenantID, campaignID uuid.UUID) ([]*domain.Survey360Response, map[uuid.UUID]domain.Relation, error) {
	tx, err := beginTenantTx(ctx, r.db, tenantID, true)
	if err != nil {
		return nil, nil, err
	}
	defer func() { _ = tx.Rollback() }()
	items := []*domain.Survey360Response{}
	q := `SELECT ` + respCols + ` FROM app.survey_360_responses
	      WHERE tenant_id = $1 AND campaign_id = $2 ORDER BY competency_code`
	if err := tx.SelectContext(ctx, &items, q, tenantID, campaignID); err != nil {
		return nil, nil, fmt.Errorf("list s360 resp: %w", err)
	}
	invs := []struct {
		ID       uuid.UUID       `db:"id"`
		Relation domain.Relation `db:"relation"`
	}{}
	if err := tx.SelectContext(ctx, &invs,
		`SELECT id, relation FROM app.survey_360_invitations
		 WHERE tenant_id = $1 AND campaign_id = $2`,
		tenantID, campaignID); err != nil {
		return nil, nil, fmt.Errorf("list s360 inv (for report): %w", err)
	}
	relMap := make(map[uuid.UUID]domain.Relation, len(invs))
	for _, v := range invs {
		relMap[v.ID] = v.Relation
	}
	return items, relMap, nil
}
