package service

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/audit/internal/domain"
	"github.com/upcore/audit/internal/repository"
)

// LogAccessRequest is the input for logging a KVKK data access.
type LogAccessRequest struct {
	DataSubjectID    uuid.UUID `json:"data_subject_id"`
	DataSubjectEmail string    `json:"data_subject_email"`
	Purpose          string    `json:"purpose"`
	LegalBasis       string    `json:"legal_basis"`
	DataCategories   []string  `json:"data_categories"`
	ConsentRef       *string   `json:"consent_ref,omitempty"`
}

// KVKKService contains the business logic for KVKK compliance operations.
type KVKKService struct {
	repo repository.KVKKRepository
	log  zerolog.Logger
}

// NewKVKKService constructs a KVKKService.
func NewKVKKService(repo repository.KVKKRepository, log zerolog.Logger) *KVKKService {
	return &KVKKService{repo: repo, log: log}
}

// LogAccess records an access to personal data under a legal basis.
func (s *KVKKService) LogAccess(ctx context.Context, tenantID, accessorID uuid.UUID, accessorRole, ipAddress string, req *LogAccessRequest) error {
	var consentRef *uuid.UUID
	if req.ConsentRef != nil && *req.ConsentRef != "" {
		id, err := uuid.Parse(*req.ConsentRef)
		if err != nil {
			return domain.ErrInvalidInput
		}
		consentRef = &id
	}

	entry := &domain.KVKKAccessLog{
		TenantID:         tenantID,
		DataSubjectID:    req.DataSubjectID,
		DataSubjectEmail: req.DataSubjectEmail,
		AccessorUserID:   accessorID,
		AccessorRole:     accessorRole,
		Purpose:          req.Purpose,
		LegalBasis:       domain.LegalBasis(req.LegalBasis),
		DataCategories:   req.DataCategories,
		AccessedAt:       time.Now().UTC(),
		IPAddress:        ipAddress,
		ConsentRef:       consentRef,
	}
	if err := entry.Validate(); err != nil {
		return err
	}
	return s.repo.Log(ctx, entry)
}

// GetSubjectAccessHistory returns all access logs for a data subject.
func (s *KVKKService) GetSubjectAccessHistory(ctx context.Context, tenantID, subjectID uuid.UUID) ([]*domain.KVKKAccessLog, error) {
	return s.repo.ListBySubject(ctx, tenantID, subjectID)
}

// GetProcessingRegister generates the VERBIS-style processing register.
func (s *KVKKService) GetProcessingRegister(ctx context.Context, tenantID uuid.UUID) (*domain.ProcessingRegister, error) {
	categories, err := s.repo.GetDistinctCategories(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	purposes, err := s.repo.GetDistinctPurposes(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	legalBases, err := s.repo.GetDistinctLegalBases(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	byBasis, err := s.repo.CountByLegalBasis(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	byCat, err := s.repo.CountByCategory(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	totalAccesses, err := s.repo.CountTotal(ctx, tenantID)
	if err != nil {
		return nil, err
	}

	return &domain.ProcessingRegister{
		TenantID:    tenantID,
		GeneratedAt: time.Now().UTC(),
		Categories:  categories,
		Purposes:    purposes,
		LegalBases:  legalBases,
		Recipients:  []string{}, // populated from tenant config in future
		Retention: map[string]string{
			"audit_events":    "7 years",
			"kvkk_access_log": "7 years",
		},
		Statistics: domain.ProcessingStats{
			TotalAccesses: totalAccesses,
			ByLegalBasis:  byBasis,
			ByCategory:    byCat,
		},
	}, nil
}
