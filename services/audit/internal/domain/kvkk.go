package domain

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// LegalBasis enumerates the six lawful bases from KVKK 5. madde.
type LegalBasis string

const (
	LegalBasisConsent             LegalBasis = "consent"
	LegalBasisContract            LegalBasis = "contract"
	LegalBasisLegalObligation     LegalBasis = "legal_obligation"
	LegalBasisVitalInterest       LegalBasis = "vital_interest"
	LegalBasisPublicTask          LegalBasis = "public_task"
	LegalBasisLegitimateInterest  LegalBasis = "legitimate_interest"
)

// ValidLegalBases returns the full list of legal bases.
func ValidLegalBases() []LegalBasis {
	return []LegalBasis{
		LegalBasisConsent, LegalBasisContract, LegalBasisLegalObligation,
		LegalBasisVitalInterest, LegalBasisPublicTask, LegalBasisLegitimateInterest,
	}
}

// IsBasisConsentRequired reports whether consent tracking is mandatory.
func (b LegalBasis) IsBasisConsentRequired() bool {
	return b == LegalBasisConsent
}

// Valid returns nil if the basis is one of the six known values.
func (b LegalBasis) Valid() error {
	for _, v := range ValidLegalBases() {
		if v == b {
			return nil
		}
	}
	return ErrInvalidLegalBasis
}

// KVKKAccessLog records a single access to personal data by a user/role
// under a specified legal basis.
type KVKKAccessLog struct {
	ID               uuid.UUID      `db:"id" json:"id"`
	TenantID         uuid.UUID      `db:"tenant_id" json:"tenant_id"`
	DataSubjectID    uuid.UUID      `db:"data_subject_id" json:"data_subject_id"`
	DataSubjectEmail string         `db:"data_subject_email" json:"data_subject_email"`
	AccessorUserID   uuid.UUID      `db:"accessor_user_id" json:"accessor_user_id"`
	AccessorRole     string         `db:"accessor_role" json:"accessor_role"`
	Purpose          string         `db:"purpose" json:"purpose"`
	LegalBasis       LegalBasis     `db:"legal_basis" json:"legal_basis"`
	DataCategories   pq.StringArray `db:"data_categories" json:"data_categories"`
	AccessedAt       time.Time      `db:"accessed_at" json:"accessed_at"`
	IPAddress        string         `db:"ip_address" json:"ip_address,omitempty"`
	ConsentRef       *uuid.UUID     `db:"consent_ref" json:"consent_ref,omitempty"`
}

// Validate ensures the KVKK access log entry has all required fields.
func (l *KVKKAccessLog) Validate() error {
	if l.TenantID == uuid.Nil {
		return fmt.Errorf("%w: tenant_id required", ErrInvalidInput)
	}
	if l.DataSubjectID == uuid.Nil {
		return fmt.Errorf("%w: data_subject_id required", ErrInvalidInput)
	}
	if l.AccessorUserID == uuid.Nil {
		return fmt.Errorf("%w: accessor_user_id required", ErrInvalidInput)
	}
	if l.Purpose == "" {
		return fmt.Errorf("%w: purpose required", ErrInvalidInput)
	}
	if err := l.LegalBasis.Valid(); err != nil {
		return err
	}
	if len(l.DataCategories) == 0 {
		return fmt.Errorf("%w: data_categories required", ErrInvalidInput)
	}
	if l.LegalBasis.IsBasisConsentRequired() && l.ConsentRef == nil {
		return fmt.Errorf("%w: consent_ref required for consent basis", ErrInvalidInput)
	}
	if l.AccessedAt.IsZero() {
		l.AccessedAt = time.Now().UTC()
	}
	return nil
}

// ProcessingRegister is the VERBİS/KVKK processing register payload.
type ProcessingRegister struct {
	TenantID     uuid.UUID          `json:"tenant_id"`
	GeneratedAt  time.Time          `json:"generated_at"`
	Categories   []string           `json:"data_categories"`
	Purposes     []string           `json:"purposes"`
	LegalBases   []string           `json:"legal_bases"`
	Recipients   []string           `json:"recipients"`
	Retention    map[string]string  `json:"retention_policies"`
	Statistics   ProcessingStats    `json:"statistics"`
}

// ProcessingStats is a snapshot of access patterns for the register.
type ProcessingStats struct {
	TotalAccesses int            `json:"total_accesses"`
	ByLegalBasis  map[string]int `json:"by_legal_basis"`
	ByCategory    map[string]int `json:"by_category"`
}
