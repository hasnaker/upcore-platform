package service

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/employee/internal/domain"
	"github.com/upcore/employee/internal/event"
	"github.com/upcore/employee/internal/repository"
)

// Offer-related event topics.
const (
	TopicOfferCreated  = "offer.created.v1"
	TopicOfferSent     = "offer.sent.v1"
	TopicOfferAccepted = "offer.accepted.v1"
	TopicOfferDeclined = "offer.declined.v1"
	TopicOfferRevoked  = "offer.revoked.v1"
)

// OfferService orchestrates offer-letter lifecycle.
type OfferService struct {
	offers    repository.OfferRepository
	employees repository.EmployeeRepository
	publisher event.Publisher
	log       zerolog.Logger
}

// NewOfferService constructs an OfferService.
func NewOfferService(
	offers repository.OfferRepository,
	employees repository.EmployeeRepository,
	pub event.Publisher,
	log zerolog.Logger,
) *OfferService {
	return &OfferService{offers: offers, employees: employees, publisher: pub, log: log}
}

// OfferCreateRequest captures the body accepted by POST /offers.
type OfferCreateRequest struct {
	CandidateID    *uuid.UUID `json:"candidate_id,omitempty"`
	RequisitionID  *uuid.UUID `json:"requisition_id,omitempty"`
	AdSoyad        string     `json:"ad_soyad"`
	Email          string     `json:"email"`
	PositionTitle  string     `json:"position_title"`
	DepartmentID   *uuid.UUID `json:"department_id,omitempty"`
	PositionID     *uuid.UUID `json:"position_id,omitempty"`
	SalaryBrut     *float64   `json:"salary_brut,omitempty"`
	SalaryCurrency string     `json:"salary_currency,omitempty"`
	BonusAnnual    *float64   `json:"bonus_annual,omitempty"`
	StockOptions   string     `json:"stock_options,omitempty"`
	Benefits       domain.JSONB `json:"benefits,omitempty"`
	StartDate      string     `json:"start_date"`
	ExpiresAt      string     `json:"expires_at,omitempty"`
	TemplateID     *uuid.UUID `json:"template_id,omitempty"`
	Payload        domain.JSONB `json:"payload,omitempty"`
}

// OfferDeclineRequest captures the decline body.
type OfferDeclineRequest struct {
	Reason string `json:"reason,omitempty"`
}

// OfferListParams narrows List responses.
type OfferListParams struct {
	Status        string
	RequisitionID *uuid.UUID
	CandidateID   *uuid.UUID
	Page          int
	Limit         int
}

// Create drafts a new offer and persists it.
func (s *OfferService) Create(ctx context.Context, tenantID, actorID uuid.UUID, req OfferCreateRequest) (*domain.OfferLetter, error) {
	if tenantID == uuid.Nil {
		return nil, domain.ErrUnauthorized
	}
	start, err := parseDateOnly(req.StartDate)
	if err != nil {
		return nil, domain.NewValidationError(map[string]string{"start_date": "invalid"})
	}
	expires, err := resolveExpiry(req.ExpiresAt, start)
	if err != nil {
		return nil, domain.NewValidationError(map[string]string{"expires_at": "invalid"})
	}

	o := &domain.OfferLetter{
		TenantID:       tenantID,
		CandidateID:    req.CandidateID,
		RequisitionID:  req.RequisitionID,
		AdSoyad:        strings.TrimSpace(req.AdSoyad),
		Email:          strings.ToLower(strings.TrimSpace(req.Email)),
		PositionTitle:  strings.TrimSpace(req.PositionTitle),
		DepartmentID:   req.DepartmentID,
		PositionID:     req.PositionID,
		SalaryBrut:     req.SalaryBrut,
		SalaryCurrency: strings.ToUpper(strings.TrimSpace(req.SalaryCurrency)),
		BonusAnnual:    req.BonusAnnual,
		Benefits:       req.Benefits,
		StartDate:      start,
		ExpiresAt:      expires,
		Status:         domain.OfferDraft,
		TemplateID:     req.TemplateID,
		Payload:        req.Payload,
	}
	if v := strings.TrimSpace(req.StockOptions); v != "" {
		o.StockOptions = &v
	}
	o.ApplyDefaults()
	if actorID != uuid.Nil {
		o.SentBy = &actorID
	}
	if err := o.Validate(); err != nil {
		return nil, err
	}
	if err := s.offers.Create(ctx, o); err != nil {
		return nil, err
	}
	s.publish(ctx, TopicOfferCreated, o)
	return o, nil
}

// Get returns a single offer by ID.
func (s *OfferService) Get(ctx context.Context, tenantID, id uuid.UUID) (*domain.OfferLetter, error) {
	if tenantID == uuid.Nil {
		return nil, domain.ErrUnauthorized
	}
	return s.offers.GetByID(ctx, tenantID, id)
}

// List returns a filtered page of offers.
func (s *OfferService) List(ctx context.Context, tenantID uuid.UUID, p OfferListParams) ([]*domain.OfferLetter, int, error) {
	if tenantID == uuid.Nil {
		return nil, 0, domain.ErrUnauthorized
	}
	if p.Limit <= 0 {
		p.Limit = 50
	}
	if p.Page < 0 {
		p.Page = 0
	}
	return s.offers.List(ctx, repository.OfferListFilter{
		TenantID:      tenantID,
		Status:        p.Status,
		RequisitionID: p.RequisitionID,
		CandidateID:   p.CandidateID,
		Limit:         p.Limit,
		Offset:        p.Page * p.Limit,
	})
}

// Send transitions an offer from draft → sent.
func (s *OfferService) Send(ctx context.Context, tenantID, actorID, id uuid.UUID) (*domain.OfferLetter, error) {
	o, err := s.offers.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if !o.CanTransitionTo(domain.OfferSent) {
		return nil, domain.ErrOfferInvalidStatus
	}
	now := time.Now().UTC()
	o.Status = domain.OfferSent
	o.SentAt = &now
	if actorID != uuid.Nil {
		o.SentBy = &actorID
	}
	if err := s.offers.Update(ctx, o); err != nil {
		return nil, err
	}
	s.publish(ctx, TopicOfferSent, o)
	return o, nil
}

// MarkViewed records that the candidate opened the offer.
func (s *OfferService) MarkViewed(ctx context.Context, tenantID, id uuid.UUID) (*domain.OfferLetter, error) {
	o, err := s.offers.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if o.Status != domain.OfferSent {
		return o, nil
	}
	now := time.Now().UTC()
	o.Status = domain.OfferViewed
	o.ViewedAt = &now
	if err := s.offers.Update(ctx, o); err != nil {
		return nil, err
	}
	return o, nil
}

// Accept finalises an offer (candidate accepted).
func (s *OfferService) Accept(ctx context.Context, tenantID, id uuid.UUID) (*domain.OfferLetter, error) {
	o, err := s.offers.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if !o.CanTransitionTo(domain.OfferAccepted) {
		if o.Status == domain.OfferDraft {
			return nil, domain.ErrOfferNotSent
		}
		if o.Status.IsTerminal() {
			return nil, domain.ErrOfferAlreadyDecided
		}
		return nil, domain.ErrOfferInvalidStatus
	}
	if o.ExpiresAt.Before(time.Now().UTC()) {
		return nil, domain.ErrOfferExpired
	}
	now := time.Now().UTC()
	o.Status = domain.OfferAccepted
	o.DecidedAt = &now
	if err := s.offers.Update(ctx, o); err != nil {
		return nil, err
	}
	s.publish(ctx, TopicOfferAccepted, o)
	return o, nil
}

// Decline records the candidate's refusal.
func (s *OfferService) Decline(ctx context.Context, tenantID, id uuid.UUID, reason string) (*domain.OfferLetter, error) {
	o, err := s.offers.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if !o.CanTransitionTo(domain.OfferDeclined) {
		if o.Status == domain.OfferDraft {
			return nil, domain.ErrOfferNotSent
		}
		if o.Status.IsTerminal() {
			return nil, domain.ErrOfferAlreadyDecided
		}
		return nil, domain.ErrOfferInvalidStatus
	}
	now := time.Now().UTC()
	o.Status = domain.OfferDeclined
	o.DecidedAt = &now
	if r := strings.TrimSpace(reason); r != "" {
		o.DeclineReason = &r
	}
	if err := s.offers.Update(ctx, o); err != nil {
		return nil, err
	}
	s.publish(ctx, TopicOfferDeclined, o)
	return o, nil
}

// Revoke withdraws an offer before decision.
func (s *OfferService) Revoke(ctx context.Context, tenantID, id uuid.UUID, reason string) (*domain.OfferLetter, error) {
	o, err := s.offers.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	if !o.CanTransitionTo(domain.OfferRevoked) {
		return nil, domain.ErrOfferInvalidStatus
	}
	now := time.Now().UTC()
	o.Status = domain.OfferRevoked
	o.DecidedAt = &now
	if r := strings.TrimSpace(reason); r != "" {
		o.DeclineReason = &r
	}
	if err := s.offers.Update(ctx, o); err != nil {
		return nil, err
	}
	s.publish(ctx, TopicOfferRevoked, o)
	return o, nil
}

// ExpireDue marks all sent/viewed offers past their expires_at timestamp as expired.
func (s *OfferService) ExpireDue(ctx context.Context, tenantID uuid.UUID) (int, error) {
	if tenantID == uuid.Nil {
		return 0, domain.ErrUnauthorized
	}
	return s.offers.ExpireDue(ctx, tenantID, time.Now().UTC())
}

func (s *OfferService) publish(ctx context.Context, topic string, o *domain.OfferLetter) {
	if s.publisher == nil {
		return
	}
	if err := s.publisher.Publish(ctx, topic, o); err != nil {
		s.log.Warn().Err(err).Str("topic", topic).Str("offer_id", o.ID.String()).Msg("publish offer event failed")
	}
}

func parseDateOnly(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}, errors.New("empty")
	}
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return time.Time{}, fmt.Errorf("parse date: %w", err)
	}
	return t.UTC(), nil
}

func resolveExpiry(raw string, start time.Time) (time.Time, error) {
	if strings.TrimSpace(raw) == "" {
		return time.Now().UTC().AddDate(0, 0, 7), nil
	}
	t, err := time.Parse(time.RFC3339, raw)
	if err == nil {
		return t.UTC(), nil
	}
	d, err := time.Parse("2006-01-02", raw)
	if err == nil {
		return d.UTC(), nil
	}
	return time.Time{}, errors.New("unparseable")
}
