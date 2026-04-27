package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/audit/internal/domain"
	"github.com/upcore/audit/internal/repository"
)

// ConsentService implements KVKK çalışan rıza yönetimi.
type ConsentService struct {
	repo repository.ConsentRepository
	log  zerolog.Logger
}

// NewConsentService constructs a ConsentService.
func NewConsentService(repo repository.ConsentRepository, log zerolog.Logger) *ConsentService {
	return &ConsentService{repo: repo, log: log}
}

// UpsertConsentRequest is the service-layer input for POST /kvkk/consents.
type UpsertConsentRequest struct {
	ConsentType domain.ConsentType   `json:"consent_type"`
	Status      domain.ConsentStatus `json:"status"`
	// Optional: allow callers to pin a version; defaults to ConsentVersion.
	Version int `json:"version,omitempty"`
	// Optional client-provided metadata (e.g. locale, source).
	Metadata domain.JSONMap `json:"metadata,omitempty"`
}

// ConsentsOverview bundles the catalog + per-user decisions for the GET list endpoint.
type ConsentsOverview struct {
	Catalog []domain.ConsentCatalogEntry `json:"catalog"`
	// Consents contains the user's latest decision per consent type. When the
	// user has never interacted with a type, no entry is returned for it.
	Consents []*domain.DataConsent `json:"consents"`
	Version  int                   `json:"current_version"`
}

// ListUserConsents returns the full catalog + the user's current decisions.
func (s *ConsentService) ListUserConsents(ctx context.Context, tenantID, userID uuid.UUID) (*ConsentsOverview, error) {
	if tenantID == uuid.Nil {
		return nil, domain.ErrMissingTenantID
	}
	if userID == uuid.Nil {
		return nil, fmt.Errorf("%w: user_id required", domain.ErrInvalidInput)
	}
	rows, err := s.repo.ListByUser(ctx, tenantID, userID)
	if err != nil {
		return nil, err
	}
	return &ConsentsOverview{
		Catalog:  domain.ConsentCatalog(),
		Consents: rows,
		Version:  domain.ConsentVersion,
	}, nil
}

// Upsert applies a new decision for (tenant, user, consent_type). IP / UA are
// injected by the handler layer from the HTTP request; the service computes
// accepted_at / derives declined-vs-revoked automatically.
func (s *ConsentService) Upsert(
	ctx context.Context,
	tenantID, userID uuid.UUID,
	ipAddr, userAgent string,
	req *UpsertConsentRequest,
) (*domain.DataConsent, error) {
	if tenantID == uuid.Nil {
		return nil, domain.ErrMissingTenantID
	}
	if userID == uuid.Nil {
		return nil, fmt.Errorf("%w: user_id required", domain.ErrInvalidInput)
	}
	if req == nil {
		return nil, fmt.Errorf("%w: body required", domain.ErrInvalidInput)
	}
	if err := req.ConsentType.Valid(); err != nil {
		return nil, err
	}
	if err := req.Status.Valid(); err != nil {
		return nil, err
	}
	version := req.Version
	if version <= 0 {
		version = domain.ConsentVersion
	}

	// data_processing is legally required — reject declined/revoked for it.
	if cat, ok := domain.LookupCatalog(req.ConsentType); ok && cat.Required && req.Status != domain.ConsentStatusGranted {
		return nil, fmt.Errorf(
			"%w: %s consent is legally required and cannot be declined",
			domain.ErrInvalidInput, req.ConsentType,
		)
	}

	// Derive declined vs revoked from prior state:
	// - if no prior row and caller said "declined" → declined
	// - if prior row was granted and caller said "declined" → revoked
	prior, err := s.repo.GetLatest(ctx, tenantID, userID, req.ConsentType)
	if err != nil && !errors.Is(err, domain.ErrNotFound) {
		return nil, err
	}

	status := req.Status
	if status == domain.ConsentStatusDeclined && prior != nil && prior.Status == domain.ConsentStatusGranted {
		status = domain.ConsentStatusRevoked
	}

	// accepted_at: set to "now" on granted; else carry forward prior value.
	var acceptedAt *time.Time
	if status == domain.ConsentStatusGranted {
		now := time.Now().UTC()
		acceptedAt = &now
	} else if prior != nil && prior.AcceptedAt != nil {
		acceptedAt = prior.AcceptedAt
	}

	meta := req.Metadata
	if meta == nil {
		meta = domain.JSONMap{}
	}
	// When transitioning granted → declined we tag the reason so the history
	// trigger records it as a revocation rather than an initial decline.
	if status == domain.ConsentStatusRevoked {
		meta["change_reason"] = "user_action"
	}

	entry := &domain.DataConsent{
		TenantID:    tenantID,
		UserID:      userID,
		ConsentType: req.ConsentType,
		Version:     version,
		Status:      status,
		AcceptedAt:  acceptedAt,
		IPAddr:      nilIfEmpty(ipAddr),
		UserAgent:   nilIfEmpty(userAgent),
		Metadata:    meta,
	}
	if err := s.repo.Upsert(ctx, entry); err != nil {
		return nil, err
	}

	s.log.Info().
		Str("tenant_id", tenantID.String()).
		Str("user_id", userID.String()).
		Str("consent_type", string(entry.ConsentType)).
		Int("version", entry.Version).
		Str("status", string(entry.Status)).
		Msg("kvkk consent recorded")

	return entry, nil
}

// GetHistory returns the append-only history for a user + consent type.
func (s *ConsentService) GetHistory(ctx context.Context, tenantID, userID uuid.UUID, consentType domain.ConsentType) ([]*domain.ConsentHistoryEntry, error) {
	if tenantID == uuid.Nil {
		return nil, domain.ErrMissingTenantID
	}
	if userID == uuid.Nil {
		return nil, fmt.Errorf("%w: user_id required", domain.ErrInvalidInput)
	}
	if err := consentType.Valid(); err != nil {
		return nil, err
	}
	return s.repo.ListHistory(ctx, tenantID, userID, consentType)
}

// IsAIAllowed reports whether the user has granted `ai_recommendations`.
// Used by prediction / recommendation services to opt users out of ML pipelines
// when the consent is declined or revoked.
func (s *ConsentService) IsAIAllowed(ctx context.Context, tenantID, userID uuid.UUID) (bool, error) {
	if tenantID == uuid.Nil {
		return false, domain.ErrMissingTenantID
	}
	if userID == uuid.Nil {
		return false, fmt.Errorf("%w: user_id required", domain.ErrInvalidInput)
	}
	row, err := s.repo.GetLatest(ctx, tenantID, userID, domain.ConsentAIRecommendations)
	if errors.Is(err, domain.ErrNotFound) {
		// Default-deny: no explicit grant → not allowed.
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return row.Status == domain.ConsentStatusGranted, nil
}

func nilIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
