package service

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/ats/internal/domain"
	"github.com/upcore/ats/internal/event"
	"github.com/upcore/ats/internal/repository"
)

// CreateCandidateRequest is the payload accepted by CandidateService.Create.
type CreateCandidateRequest struct {
	Email              string     `json:"email"`
	FirstName          string     `json:"first_name"`
	LastName           string     `json:"last_name"`
	Phone              string     `json:"phone,omitempty"`
	LinkedInURL        string     `json:"linkedin_url,omitempty"`
	Source             string     `json:"source,omitempty"`
	ReferrerEmployeeID *uuid.UUID `json:"referrer_employee_id,omitempty"`
	GDPRConsent        bool       `json:"gdpr_consent"`
}

// UpdateCandidateRequest carries partial updates.
type UpdateCandidateRequest struct {
	Email       *string `json:"email,omitempty"`
	FirstName   *string `json:"first_name,omitempty"`
	LastName    *string `json:"last_name,omitempty"`
	Phone       *string `json:"phone,omitempty"`
	LinkedInURL *string `json:"linkedin_url,omitempty"`
	Source      *string `json:"source,omitempty"`
}

// TagsRequest carries tag modifications.
type TagsRequest struct {
	Tags []string `json:"tags"`
}

// CandidateService orchestrates candidate operations.
type CandidateService struct {
	candidates repository.CandidateRepository
	publisher  event.Publisher
	log        zerolog.Logger
}

// NewCandidateService constructs the service.
func NewCandidateService(
	candidates repository.CandidateRepository,
	publisher event.Publisher,
	log zerolog.Logger,
) *CandidateService {
	return &CandidateService{
		candidates: candidates,
		publisher:  publisher,
		log:        log,
	}
}

// Create validates and persists a new candidate, deduping by email.
// Emits ats.candidate.created.v1.
func (s *CandidateService) Create(ctx context.Context, tenantID uuid.UUID, req CreateCandidateRequest) (*domain.Candidate, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))
	c := &domain.Candidate{
		TenantID:    tenantID,
		Email:       email,
		FirstName:   strings.TrimSpace(req.FirstName),
		LastName:    strings.TrimSpace(req.LastName),
		GDPRConsent: req.GDPRConsent,
	}
	if v := strings.TrimSpace(req.Phone); v != "" {
		c.Phone = &v
	}
	if v := strings.TrimSpace(req.LinkedInURL); v != "" {
		c.LinkedInURL = &v
	}
	if v := strings.TrimSpace(req.Source); v != "" {
		c.Source = domain.CandidateSource(v)
	}
	if req.ReferrerEmployeeID != nil {
		c.ReferrerEmployeeID = req.ReferrerEmployeeID
	}
	if c.GDPRConsent {
		now := time.Now().UTC()
		c.GDPRConsentAt = &now
	}

	if err := c.Validate(); err != nil {
		return nil, err
	}

	if err := s.candidates.Create(ctx, c); err != nil {
		return nil, err
	}

	s.publish(ctx, event.TopicCandidateCreated, map[string]any{
		"candidate_id": c.ID,
		"tenant_id":    c.TenantID,
		"email":        c.Email,
		"source":       c.Source,
		"created_at":   c.CreatedAt,
	})
	return c, nil
}

// Get fetches a candidate by id.
func (s *CandidateService) Get(ctx context.Context, tenantID, id uuid.UUID) (*domain.Candidate, error) {
	return s.candidates.GetByID(ctx, tenantID, id)
}

// Update applies a partial update to a candidate.
func (s *CandidateService) Update(ctx context.Context, tenantID, id uuid.UUID, req UpdateCandidateRequest) (*domain.Candidate, error) {
	c, err := s.candidates.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}

	if req.Email != nil {
		c.Email = strings.ToLower(strings.TrimSpace(*req.Email))
	}
	if req.FirstName != nil {
		c.FirstName = strings.TrimSpace(*req.FirstName)
	}
	if req.LastName != nil {
		c.LastName = strings.TrimSpace(*req.LastName)
	}
	if req.Phone != nil {
		v := strings.TrimSpace(*req.Phone)
		if v == "" {
			c.Phone = nil
		} else {
			c.Phone = &v
		}
	}
	if req.LinkedInURL != nil {
		v := strings.TrimSpace(*req.LinkedInURL)
		if v == "" {
			c.LinkedInURL = nil
		} else {
			c.LinkedInURL = &v
		}
	}
	if req.Source != nil {
		src := domain.CandidateSource(*req.Source)
		if !src.IsValid() {
			return nil, domain.NewValidationError(map[string]string{"source": "invalid"})
		}
		c.Source = src
	}

	if err := c.Validate(); err != nil {
		return nil, err
	}
	if err := s.candidates.Update(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

// Delete performs a GDPR hard delete of a candidate and all PII.
func (s *CandidateService) Delete(ctx context.Context, tenantID, id uuid.UUID) error {
	return s.candidates.HardDelete(ctx, tenantID, id)
}

// GrantConsent records GDPR/KVKK consent with timestamp.
func (s *CandidateService) GrantConsent(ctx context.Context, tenantID, id uuid.UUID) error {
	c, err := s.candidates.GetByID(ctx, tenantID, id)
	if err != nil {
		return err
	}
	now := time.Now().UTC()
	c.GDPRConsent = true
	c.GDPRConsentAt = &now
	return s.candidates.Update(ctx, c)
}

// AddTags adds tags to a candidate.
func (s *CandidateService) AddTags(ctx context.Context, tenantID, id uuid.UUID, tags []string) (*domain.Candidate, error) {
	c, err := s.candidates.GetByID(ctx, tenantID, id)
	if err != nil {
		return nil, err
	}
	existing := make(map[string]bool, len(c.Tags))
	for _, t := range c.Tags {
		existing[t] = true
	}
	for _, t := range tags {
		t = strings.TrimSpace(t)
		if t != "" && !existing[t] {
			c.Tags = append(c.Tags, t)
			existing[t] = true
		}
	}
	if err := s.candidates.Update(ctx, c); err != nil {
		return nil, err
	}
	return c, nil
}

// List returns a page of candidates.
func (s *CandidateService) List(ctx context.Context, f repository.CandidateFilter) ([]*domain.Candidate, int, error) {
	return s.candidates.List(ctx, f)
}

// Search runs a full-text search on candidates.
func (s *CandidateService) Search(ctx context.Context, tenantID uuid.UUID, q string, limit int) ([]*domain.Candidate, error) {
	return s.candidates.Search(ctx, tenantID, q, limit)
}

// UpdateCVText updates the extracted CV text for a candidate.
func (s *CandidateService) UpdateCVText(ctx context.Context, tenantID, id uuid.UUID, blobPath, text string) error {
	c, err := s.candidates.GetByID(ctx, tenantID, id)
	if err != nil {
		return err
	}
	c.CVBlobPath = &blobPath
	c.CVTextExtracted = &text
	return s.candidates.Update(ctx, c)
}

func (s *CandidateService) publish(ctx context.Context, topic string, payload any) {
	if err := s.publisher.Publish(ctx, topic, payload); err != nil {
		s.log.Warn().Err(err).Str("topic", topic).Msg("publish event failed")
	}
}
