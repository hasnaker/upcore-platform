package service

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/ats/internal/domain"
	"github.com/upcore/ats/internal/event"
	"github.com/upcore/ats/internal/repository"
)

// CreateOfferRequest is the payload for creating an offer.
type CreateOfferRequest struct {
	ApplicationID uuid.UUID      `json:"application_id"`
	SalaryTRY     float64        `json:"salary_try"`
	BonusTRY      *float64       `json:"bonus_try,omitempty"`
	StartDate     string         `json:"start_date"`
	ExpiryDate    string         `json:"expiry_date"`
	Benefits      map[string]any `json:"benefits,omitempty"`
}

// UpdateOfferRequest carries partial offer updates.
type UpdateOfferRequest struct {
	SalaryTRY  *float64       `json:"salary_try,omitempty"`
	BonusTRY   *float64       `json:"bonus_try,omitempty"`
	StartDate  *string        `json:"start_date,omitempty"`
	ExpiryDate *string        `json:"expiry_date,omitempty"`
	Benefits   map[string]any `json:"benefits,omitempty"`
}

// DeclineOfferRequest carries a decline reason.
type DeclineOfferRequest struct {
	Reason string `json:"reason,omitempty"`
}

// WithdrawOfferRequest carries a withdraw reason.
type WithdrawOfferRequest struct {
	Reason string `json:"reason,omitempty"`
}

// OfferService orchestrates offer operations.
type OfferService struct {
	offers       repository.OfferRepository
	applications repository.ApplicationRepository
	events       repository.EventRepository
	publisher    event.Publisher
	log          zerolog.Logger
}

// NewOfferService constructs the service.
func NewOfferService(
	offers repository.OfferRepository,
	applications repository.ApplicationRepository,
	events repository.EventRepository,
	publisher event.Publisher,
	log zerolog.Logger,
) *OfferService {
	return &OfferService{
		offers:       offers,
		applications: applications,
		events:       events,
		publisher:    publisher,
		log:          log,
	}
}

// Create creates a new offer with status=draft.
func (s *OfferService) Create(ctx context.Context, tenantID uuid.UUID, createdBy uuid.UUID, req CreateOfferRequest) (*domain.Offer, error) {
	// Validate application exists.
	if _, err := s.applications.GetByID(ctx, tenantID, req.ApplicationID); err != nil {
		return nil, err
	}

	startDate, err := time.Parse("2006-01-02", strings.TrimSpace(req.StartDate))
	if err != nil {
		return nil, domain.ErrInvalidDate
	}
	expiryDate, err := time.Parse("2006-01-02", strings.TrimSpace(req.ExpiryDate))
	if err != nil {
		return nil, domain.ErrInvalidDate
	}

	offer := &domain.Offer{
		TenantID:      tenantID,
		ApplicationID: req.ApplicationID,
		SalaryTRY:     req.SalaryTRY,
		BonusTRY:      req.BonusTRY,
		StartDate:     startDate,
		ExpiryDate:    expiryDate,
		Status:        domain.OfferDraft,
		CreatedBy:     &createdBy,
	}
	if req.Benefits != nil {
		b, _ := json.Marshal(req.Benefits)
		offer.Benefits = domain.JSONB(b)
	}

	if err := offer.Validate(); err != nil {
		return nil, err
	}
	if err := s.offers.Create(ctx, offer); err != nil {
		return nil, err
	}
	return offer, nil
}

// Get fetches an offer by id.
func (s *OfferService) Get(ctx context.Context, tenantID, id uuid.UUID) (*domain.Offer, error) {
	return s.offers.GetByID(ctx, tenantID, id)
}

// Update applies partial updates to an offer (only while in draft).
func (s *OfferService) Update(ctx context.Context, tenantID, id uuid.UUID, req UpdateOfferRequest) (*domain.Offer, error) {
	offer, err := s.offers.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if offer.Status != domain.OfferDraft {
		return nil, domain.ErrOfferAlreadySent
	}
	if req.SalaryTRY != nil {
		offer.SalaryTRY = *req.SalaryTRY
	}
	if req.BonusTRY != nil {
		offer.BonusTRY = req.BonusTRY
	}
	if req.StartDate != nil {
		d, err := time.Parse("2006-01-02", strings.TrimSpace(*req.StartDate))
		if err != nil {
			return nil, domain.ErrInvalidDate
		}
		offer.StartDate = d
	}
	if req.ExpiryDate != nil {
		d, err := time.Parse("2006-01-02", strings.TrimSpace(*req.ExpiryDate))
		if err != nil {
			return nil, domain.ErrInvalidDate
		}
		offer.ExpiryDate = d
	}
	if req.Benefits != nil {
		b, _ := json.Marshal(req.Benefits)
		offer.Benefits = domain.JSONB(b)
	}
	if err := offer.Validate(); err != nil {
		return nil, err
	}
	if err := s.offers.Update(ctx, offer); err != nil {
		return nil, err
	}
	return offer, nil
}

// Send transitions an offer from draft to sent. Emits ats.offer.sent.v1.
func (s *OfferService) Send(ctx context.Context, tenantID, id uuid.UUID) (*domain.Offer, error) {
	offer, err := s.offers.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if !offer.CanSend() {
		return nil, domain.ErrOfferAlreadySent
	}
	now := time.Now().UTC()
	offer.Status = domain.OfferSent
	offer.SentAt = &now
	if err := s.offers.Update(ctx, offer); err != nil {
		return nil, err
	}

	// Record event.
	payload, _ := json.Marshal(map[string]any{"offer_id": offer.ID, "sent_at": now})
	evt := &domain.ApplicationEvent{
		TenantID:      tenantID,
		ApplicationID: offer.ApplicationID,
		EventType:     domain.EventOfferSent,
		Payload:       domain.JSONB(payload),
		CreatedAt:     now,
	}
	if err := s.events.Append(ctx, evt); err != nil {
		s.log.Warn().Err(err).Msg("append offer sent event failed")
	}

	s.publish(ctx, event.TopicOfferSent, map[string]any{
		"offer_id":       offer.ID,
		"tenant_id":      tenantID,
		"application_id": offer.ApplicationID,
		"sent_at":        now,
	})
	return offer, nil
}

// Accept marks an offer as accepted. Emits ats.offer.accepted.v1.
// Triggers the pipeline to transition the application to "hired" stage.
func (s *OfferService) Accept(ctx context.Context, tenantID, id uuid.UUID) (*domain.Offer, error) {
	offer, err := s.offers.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if offer.Status != domain.OfferSent {
		return nil, domain.ErrOfferNotSent
	}
	if offer.IsExpired() {
		return nil, domain.ErrOfferExpired
	}
	now := time.Now().UTC()
	offer.Status = domain.OfferAccepted
	offer.RespondedAt = &now
	if err := s.offers.Update(ctx, offer); err != nil {
		return nil, err
	}

	// Record event.
	payload, _ := json.Marshal(map[string]any{"offer_id": offer.ID, "accepted_at": now})
	evt := &domain.ApplicationEvent{
		TenantID:      tenantID,
		ApplicationID: offer.ApplicationID,
		EventType:     domain.EventOfferAccepted,
		Payload:       domain.JSONB(payload),
		CreatedAt:     now,
	}
	if err := s.events.Append(ctx, evt); err != nil {
		s.log.Warn().Err(err).Msg("append offer accepted event failed")
	}

	s.publish(ctx, event.TopicOfferAccepted, map[string]any{
		"offer_id":       offer.ID,
		"tenant_id":      tenantID,
		"application_id": offer.ApplicationID,
		"accepted_at":    now,
	})
	return offer, nil
}

// Decline marks an offer as declined. Emits ats.offer.declined.v1.
func (s *OfferService) Decline(ctx context.Context, tenantID, id uuid.UUID, req DeclineOfferRequest) (*domain.Offer, error) {
	offer, err := s.offers.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if offer.Status != domain.OfferSent {
		return nil, domain.ErrOfferNotSent
	}
	now := time.Now().UTC()
	offer.Status = domain.OfferDeclined
	offer.RespondedAt = &now
	if err := s.offers.Update(ctx, offer); err != nil {
		return nil, err
	}

	// Record event.
	payload, _ := json.Marshal(map[string]any{"offer_id": offer.ID, "reason": req.Reason, "declined_at": now})
	evt := &domain.ApplicationEvent{
		TenantID:      tenantID,
		ApplicationID: offer.ApplicationID,
		EventType:     domain.EventOfferDeclined,
		Payload:       domain.JSONB(payload),
		CreatedAt:     now,
	}
	if err := s.events.Append(ctx, evt); err != nil {
		s.log.Warn().Err(err).Msg("append offer declined event failed")
	}

	s.publish(ctx, event.TopicOfferDeclined, map[string]any{
		"offer_id":       offer.ID,
		"tenant_id":      tenantID,
		"application_id": offer.ApplicationID,
		"reason":         req.Reason,
		"declined_at":    now,
	})
	return offer, nil
}

// Withdraw marks an offer as withdrawn.
func (s *OfferService) Withdraw(ctx context.Context, tenantID, id uuid.UUID, req WithdrawOfferRequest) (*domain.Offer, error) {
	offer, err := s.offers.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if offer.Status != domain.OfferDraft && offer.Status != domain.OfferSent {
		return nil, domain.ErrOfferAlreadySent
	}
	now := time.Now().UTC()
	offer.Status = domain.OfferWithdrawn
	offer.RespondedAt = &now
	if err := s.offers.Update(ctx, offer); err != nil {
		return nil, err
	}
	return offer, nil
}

// ExpireOverdue marks all overdue offers as expired (cron job).
func (s *OfferService) ExpireOverdue(ctx context.Context) (int, error) {
	return s.offers.ExpireOverdue(ctx)
}

// ListByApplication returns offers for an application.
func (s *OfferService) ListByApplication(ctx context.Context, applicationID uuid.UUID) ([]*domain.Offer, error) {
	return s.offers.ListByApplication(ctx, applicationID)
}

func (s *OfferService) publish(ctx context.Context, topic string, payload any) {
	if err := s.publisher.Publish(ctx, topic, payload); err != nil {
		s.log.Warn().Err(err).Str("topic", topic).Msg("publish event failed")
	}
}
