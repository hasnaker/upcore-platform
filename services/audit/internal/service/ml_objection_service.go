package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/audit/internal/domain"
	"github.com/upcore/audit/internal/event"
	"github.com/upcore/audit/internal/repository"
)

// ReviewerContext carries the HTTP / session context of the İK reviewer who
// acts on an objection. The IP + user agent are recorded for audit, and the
// role set is checked against AllowedReviewerRoles for dismiss actions.
type ReviewerContext struct {
	ReviewerUserID uuid.UUID
	DPOUserID      uuid.UUID // required for Dismiss
	Roles          []string
	IP             string
	UserAgent      string
}

// AllowedDPORoles lists the roles authorised to sign off a dismissal.
// Mirrors the check that admin/api-gateway already performs; enforced again
// at the service layer so background jobs and tests cannot bypass it.
var AllowedDPORoles = map[string]struct{}{
	"dpo":              {},
	"platform-admin":   {},
	"compliance-admin": {},
}

// hasDPORole returns true when the reviewer roster includes a role authorised
// to sign off a dismissal. Case-insensitive.
func hasDPORole(roles []string) bool {
	for _, r := range roles {
		if _, ok := AllowedDPORoles[toLower(r)]; ok {
			return true
		}
	}
	return false
}

// toLower avoids importing strings just for ToLower.
func toLower(s string) string {
	b := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= 'A' && c <= 'Z' {
			c += 32
		}
		b[i] = c
	}
	return string(b)
}

// MLObjectionService handles KVKK Madde 22 objections against ML predictions.
// It mirrors the DSRService lifecycle so the admin review queue, SLA reports
// and audit fan-out all work identically.
type MLObjectionService struct {
	repo      repository.MLObjectionRepository
	publisher event.Publisher
	log       zerolog.Logger
}

// NewMLObjectionService constructs an MLObjectionService.
func NewMLObjectionService(
	repo repository.MLObjectionRepository,
	publisher event.Publisher,
	log zerolog.Logger,
) *MLObjectionService {
	return &MLObjectionService{repo: repo, publisher: publisher, log: log}
}

// Receive creates a new objection, publishes a received event, and triggers
// İK + data-scientist notifications via the audit event bus.
func (s *MLObjectionService) Receive(ctx context.Context, o *domain.MLObjection) (*domain.MLObjection, error) {
	if o.ObjectedAt.IsZero() {
		o.ObjectedAt = time.Now().UTC()
	}
	if o.Status == "" {
		o.Status = domain.MLObjectionStatusReceived
	}
	if err := o.Validate(); err != nil {
		return nil, err
	}
	if err := s.repo.Create(ctx, o); err != nil {
		return nil, err
	}

	_ = s.publisher.Publish(ctx, event.TopicMLObjectionReceived, map[string]any{
		"objection_id":   o.ID,
		"tenant_id":      o.TenantID,
		"user_id":        o.UserID,
		"prediction_id":  o.PredictionID,
		"objected_at":    o.ObjectedAt,
		"due_date":       o.DueDate(),
		"notify_roles":   []string{"hr_manager", "data_scientist", "dpo"},
	})
	s.log.Info().
		Str("objection_id", o.ID.String()).
		Str("tenant_id", o.TenantID.String()).
		Msg("ml objection received; IK + data scientist notified")
	return o, nil
}

// Verify moves an objection to verifying state (identity check stage).
func (s *MLObjectionService) Verify(ctx context.Context, tenantID, id, actorID uuid.UUID) error {
	return s.transition(ctx, tenantID, id, actorID, domain.MLObjectionStatusVerifying)
}

// Process moves an objection into active manual review.
func (s *MLObjectionService) Process(ctx context.Context, tenantID, id, actorID uuid.UUID) error {
	return s.transition(ctx, tenantID, id, actorID, domain.MLObjectionStatusInProgress)
}

// Complete marks an objection as resolved with a resolution note.
func (s *MLObjectionService) Complete(
	ctx context.Context,
	tenantID, id, actorID uuid.UUID,
	resolutionNote string,
) error {
	o, err := s.repo.GetByID(ctx, tenantID, id)
	if err != nil {
		return err
	}
	if err := o.Transition(domain.MLObjectionStatusCompleted, actorID); err != nil {
		return err
	}
	o.ResolutionNote = resolutionNote
	if err := s.repo.Update(ctx, o); err != nil {
		return err
	}
	_ = s.publisher.Publish(ctx, event.TopicMLObjectionResolved, map[string]any{
		"objection_id":    o.ID,
		"tenant_id":       o.TenantID,
		"user_id":         o.UserID,
		"prediction_id":   o.PredictionID,
		"resolution":      "completed",
		"resolution_note": resolutionNote,
	})
	return nil
}

// Reject marks an objection as rejected with a reason.
func (s *MLObjectionService) Reject(
	ctx context.Context,
	tenantID, id, actorID uuid.UUID,
	reason string,
) error {
	o, err := s.repo.GetByID(ctx, tenantID, id)
	if err != nil {
		return err
	}
	if err := o.Transition(domain.MLObjectionStatusRejected, actorID); err != nil {
		return err
	}
	o.RejectionReason = reason
	if err := s.repo.Update(ctx, o); err != nil {
		return err
	}
	_ = s.publisher.Publish(ctx, event.TopicMLObjectionResolved, map[string]any{
		"objection_id":  o.ID,
		"tenant_id":     o.TenantID,
		"prediction_id": o.PredictionID,
		"resolution":    "rejected",
		"reason":        reason,
	})
	return nil
}

// GetByID fetches a single objection.
func (s *MLObjectionService) GetByID(ctx context.Context, tenantID, id uuid.UUID) (*domain.MLObjection, error) {
	return s.repo.GetByID(ctx, tenantID, id)
}

// List returns filtered objections for the admin review queue.
func (s *MLObjectionService) List(ctx context.Context, filter domain.MLObjectionFilter) ([]*domain.MLObjection, int, error) {
	return s.repo.List(ctx, filter)
}

// GetOverdue returns objections past the 30 day KVKK SLA.
func (s *MLObjectionService) GetOverdue(ctx context.Context, tenantID uuid.UUID) ([]*domain.MLObjection, error) {
	return s.repo.ListOverdue(ctx, tenantID)
}

func (s *MLObjectionService) transition(
	ctx context.Context,
	tenantID, id, actorID uuid.UUID,
	next domain.MLObjectionStatus,
) error {
	o, err := s.repo.GetByID(ctx, tenantID, id)
	if err != nil {
		return err
	}
	if err := o.Transition(next, actorID); err != nil {
		return err
	}
	return s.repo.Update(ctx, o)
}

// Uphold finalises an objection with outcome=upheld (KVKK Madde 22):
//
//  1. Atomically transitions the objection to completed, stamps
//     resolution_outcome=upheld and prediction_retracted_at=now().
//  2. Updates the linked ml_predictions_audit row with retracted_at,
//     retracted_by, retraction_reason and retraction_objection_id.
//  3. Publishes ml.prediction.retracted.v1 so downstream services
//     (intervention, notification) can reverse recommendations.
//
// The reviewer context is audited (IP + UA). Retry is safe: the repository
// uses SELECT ... FOR UPDATE and returns ErrInvalidTransition if the
// objection has already been finalised.
func (s *MLObjectionService) Uphold(
	ctx context.Context,
	tenantID, objectionID uuid.UUID,
	reviewer ReviewerContext,
	resolutionNote string,
) (*domain.MLObjection, error) {
	if tenantID == uuid.Nil || objectionID == uuid.Nil {
		return nil, fmt.Errorf("%w: tenant_id and objection_id required", domain.ErrInvalidInput)
	}
	if reviewer.ReviewerUserID == uuid.Nil {
		return nil, fmt.Errorf("%w: reviewer_user_id required", domain.ErrInvalidInput)
	}
	if len(resolutionNote) < 5 {
		return nil, fmt.Errorf("%w: resolution_note must be at least 5 chars", domain.ErrInvalidInput)
	}

	updated, err := s.repo.UpholdAndRetract(ctx, repository.UpholdInput{
		TenantID:          tenantID,
		ObjectionID:       objectionID,
		ReviewerUserID:    reviewer.ReviewerUserID,
		ResolutionNote:    resolutionNote,
		ReviewerIP:        reviewer.IP,
		ReviewerUserAgent: reviewer.UserAgent,
	})
	if err != nil {
		return nil, err
	}

	// Fan-out: objection resolved + prediction retracted. Failure to publish
	// must not undo the DB change (the outbox pattern guarantees eventual
	// delivery via the in-process publisher used at the edge).
	if perr := s.publisher.Publish(ctx, event.TopicMLObjectionResolved, map[string]any{
		"objection_id":    updated.ID,
		"tenant_id":       updated.TenantID,
		"user_id":         updated.UserID,
		"prediction_id":   updated.PredictionID,
		"resolution":      "upheld",
		"resolution_note": resolutionNote,
		"reviewer_id":     reviewer.ReviewerUserID,
		"reviewer_ip":     reviewer.IP,
		"reviewer_ua":     reviewer.UserAgent,
	}); perr != nil {
		s.log.Error().Err(perr).
			Str("objection_id", updated.ID.String()).
			Msg("publish ml_objection.resolved failed")
	}
	if perr := s.publisher.Publish(ctx, event.TopicMLPredictionRetracted, map[string]any{
		"prediction_id": updated.PredictionID,
		"tenant_id":     updated.TenantID,
		"user_id":       updated.UserID,
		"objection_id":  updated.ID,
		"retracted_at":  time.Now().UTC(),
		"retracted_by":  reviewer.ReviewerUserID,
		"reason":        "user objection upheld (KVKK m.22)",
	}); perr != nil {
		s.log.Error().Err(perr).
			Str("prediction_id", updated.PredictionID.String()).
			Msg("publish ml.prediction.retracted failed")
	}

	s.log.Info().
		Str("objection_id", updated.ID.String()).
		Str("tenant_id", updated.TenantID.String()).
		Str("prediction_id", updated.PredictionID.String()).
		Str("reviewer_id", reviewer.ReviewerUserID.String()).
		Msg("ml objection upheld; prediction retracted (KVKK m.22)")

	return updated, nil
}

// Dismiss finalises an objection with outcome=dismissed. A DPO signature is
// mandatory: the reviewer must carry a role in AllowedDPORoles OR pass a
// separate DPOUserID. The DB trigger validate_ml_objection_dpo enforces the
// same invariant at the storage layer as defense-in-depth.
//
// A reasoned notification event is published so the notification service can
// email the objector (Turkish template, includes rejection_reason).
func (s *MLObjectionService) Dismiss(
	ctx context.Context,
	tenantID, objectionID uuid.UUID,
	reviewer ReviewerContext,
	rejectionReason string,
) (*domain.MLObjection, error) {
	if tenantID == uuid.Nil || objectionID == uuid.Nil {
		return nil, fmt.Errorf("%w: tenant_id and objection_id required", domain.ErrInvalidInput)
	}
	if reviewer.ReviewerUserID == uuid.Nil {
		return nil, fmt.Errorf("%w: reviewer_user_id required", domain.ErrInvalidInput)
	}
	if len(rejectionReason) < 10 {
		return nil, fmt.Errorf("%w: rejection_reason must be at least 10 chars", domain.ErrInvalidInput)
	}

	// RBAC: the reviewer must carry a DPO-class role, OR an explicit DPO user
	// must be supplied (the UI carries both when the reviewer is also the DPO).
	dpoID := reviewer.DPOUserID
	if dpoID == uuid.Nil {
		if !hasDPORole(reviewer.Roles) {
			return nil, fmt.Errorf("%w: dismiss requires DPO or platform-admin role", domain.ErrForbidden)
		}
		dpoID = reviewer.ReviewerUserID
	}

	updated, err := s.repo.DismissWithDPO(ctx, repository.DismissInput{
		TenantID:          tenantID,
		ObjectionID:       objectionID,
		ReviewerUserID:    reviewer.ReviewerUserID,
		DPOUserID:         dpoID,
		RejectionReason:   rejectionReason,
		ReviewerIP:        reviewer.IP,
		ReviewerUserAgent: reviewer.UserAgent,
	})
	if err != nil {
		return nil, err
	}

	if perr := s.publisher.Publish(ctx, event.TopicMLObjectionResolved, map[string]any{
		"objection_id":  updated.ID,
		"tenant_id":     updated.TenantID,
		"user_id":       updated.UserID,
		"prediction_id": updated.PredictionID,
		"resolution":    "dismissed",
		"reason":        rejectionReason,
		"reviewer_id":   reviewer.ReviewerUserID,
		"dpo_user_id":   dpoID,
		"reviewer_ip":   reviewer.IP,
		"reviewer_ua":   reviewer.UserAgent,
		// UI uses notify=true to route a "bilgilendirme" email to the user.
		"notify_user": true,
	}); perr != nil {
		s.log.Error().Err(perr).
			Str("objection_id", updated.ID.String()).
			Msg("publish ml_objection.resolved (dismissed) failed")
	}

	s.log.Info().
		Str("objection_id", updated.ID.String()).
		Str("tenant_id", updated.TenantID.String()).
		Str("dpo_user_id", dpoID.String()).
		Msg("ml objection dismissed with DPO sign-off (KVKK m.22)")

	return updated, nil
}

