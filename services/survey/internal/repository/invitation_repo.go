package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"github.com/upcore/survey/internal/domain"
)

// InvitationRepository abstracts persistence for survey invitations.
type InvitationRepository interface {
	BulkCreate(ctx context.Context, invitations []*domain.Invitation) error
	GetByToken(ctx context.Context, token string) (*domain.Invitation, error)
	GetByID(ctx context.Context, id uuid.UUID) (*domain.Invitation, error)
	MarkSubmitted(ctx context.Context, id uuid.UUID, completedAt time.Time) error
	ListNeedingReminder(ctx context.Context, now time.Time, cadence time.Duration, maxReminders int) ([]*domain.Invitation, error)
	IncrementReminderCount(ctx context.Context, id uuid.UUID, sentAt time.Time) error
	ListPendingByEmployee(ctx context.Context, tenantID, employeeID uuid.UUID) ([]*domain.Invitation, error)
	CountByDistribution(ctx context.Context, distributionID uuid.UUID) (int, error)
}

type invitationRepo struct {
	db *sqlx.DB
}

// NewInvitationRepository constructs an InvitationRepository backed by sqlx.
func NewInvitationRepository(db *sqlx.DB) InvitationRepository {
	return &invitationRepo{db: db}
}

func (r *invitationRepo) BulkCreate(ctx context.Context, invitations []*domain.Invitation) error {
	if len(invitations) == 0 {
		return nil
	}
	q := `INSERT INTO app.survey_invitations (
		id, tenant_id, survey_id, employee_id, token, sent_at,
		reminders_sent, status, expires_at, created_at, updated_at
	) VALUES (
		:id, :tenant_id, :survey_id, :employee_id, :token, :sent_at,
		:reminders_sent, :status, :expires_at, :created_at, :updated_at
	)`
	for _, inv := range invitations {
		if inv.ID == uuid.Nil {
			inv.ID = uuid.New()
		}
		inv.ApplyDefaults()
		now := time.Now().UTC()
		if inv.CreatedAt.IsZero() {
			inv.CreatedAt = now
		}
		inv.UpdatedAt = now
		if _, err := r.db.NamedExecContext(ctx, q, inv); err != nil {
			return fmt.Errorf("insert invitation: %w", err)
		}
	}
	return nil
}

func (r *invitationRepo) GetByToken(ctx context.Context, token string) (*domain.Invitation, error) {
	var inv domain.Invitation
	q := `SELECT * FROM app.survey_invitations WHERE token = $1`
	if err := r.db.GetContext(ctx, &inv, q, token); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrInvitationNotFound
		}
		return nil, fmt.Errorf("select invitation by token: %w", err)
	}
	return &inv, nil
}

func (r *invitationRepo) GetByID(ctx context.Context, id uuid.UUID) (*domain.Invitation, error) {
	var inv domain.Invitation
	q := `SELECT * FROM app.survey_invitations WHERE id = $1`
	if err := r.db.GetContext(ctx, &inv, q, id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, domain.ErrInvitationNotFound
		}
		return nil, fmt.Errorf("select invitation: %w", err)
	}
	return &inv, nil
}

func (r *invitationRepo) MarkSubmitted(ctx context.Context, id uuid.UUID, completedAt time.Time) error {
	q := `UPDATE app.survey_invitations
		SET status = $2, completed_at = $3, updated_at = $4
		WHERE id = $1`
	_, err := r.db.ExecContext(ctx, q, id, string(domain.InvitationCompleted), completedAt, time.Now().UTC())
	if err != nil {
		return fmt.Errorf("mark submitted: %w", err)
	}
	return nil
}

func (r *invitationRepo) ListNeedingReminder(ctx context.Context, now time.Time, cadence time.Duration, maxReminders int) ([]*domain.Invitation, error) {
	cutoff := now.Add(-cadence)
	var rows []*domain.Invitation
	q := `SELECT * FROM app.survey_invitations
		WHERE status IN ('pending', 'sent')
		  AND completed_at IS NULL
		  AND (expires_at IS NULL OR expires_at > $1)
		  AND reminders_sent < $2
		  AND (last_reminder_at IS NULL OR last_reminder_at < $3)
		  AND sent_at IS NOT NULL AND sent_at < $3
		ORDER BY sent_at ASC
		LIMIT 200`
	if err := r.db.SelectContext(ctx, &rows, q, now, maxReminders, cutoff); err != nil {
		return nil, fmt.Errorf("list needing reminder: %w", err)
	}
	return rows, nil
}

func (r *invitationRepo) IncrementReminderCount(ctx context.Context, id uuid.UUID, sentAt time.Time) error {
	q := `UPDATE app.survey_invitations
		SET reminders_sent = reminders_sent + 1, last_reminder_at = $2, updated_at = $3
		WHERE id = $1`
	_, err := r.db.ExecContext(ctx, q, id, sentAt, time.Now().UTC())
	if err != nil {
		return fmt.Errorf("increment reminder: %w", err)
	}
	return nil
}

func (r *invitationRepo) ListPendingByEmployee(ctx context.Context, tenantID, employeeID uuid.UUID) ([]*domain.Invitation, error) {
	var rows []*domain.Invitation
	q := `SELECT * FROM app.survey_invitations
		WHERE tenant_id = $1 AND employee_id = $2
		  AND status IN ('pending', 'sent', 'opened')
		  AND completed_at IS NULL
		  AND (expires_at IS NULL OR expires_at > NOW())
		ORDER BY created_at DESC`
	if err := r.db.SelectContext(ctx, &rows, q, tenantID, employeeID); err != nil {
		return nil, fmt.Errorf("list pending invitations: %w", err)
	}
	return rows, nil
}

func (r *invitationRepo) CountByDistribution(ctx context.Context, distributionID uuid.UUID) (int, error) {
	var n int
	q := `SELECT COUNT(*) FROM app.survey_invitations WHERE survey_id = $1`
	if err := r.db.GetContext(ctx, &n, q, distributionID); err != nil {
		return 0, fmt.Errorf("count invitations: %w", err)
	}
	return n, nil
}
