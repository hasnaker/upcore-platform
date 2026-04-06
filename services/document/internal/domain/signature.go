package domain

import (
	"strings"
	"time"

	"github.com/google/uuid"
)

// SignProvider enumerates Turkish e-signature providers.
type SignProvider string

const (
	SignProviderEImzala SignProvider = "eimzala"
	SignProviderKamuSM  SignProvider = "kamu_sm"
	SignProviderEDevlet SignProvider = "edevlet"
	SignProviderMobile  SignProvider = "mobile"
)

// SignStatus enumerates signature lifecycle states.
type SignStatus string

const (
	SignStatusPending   SignStatus = "pending"
	SignStatusSigned    SignStatus = "signed"
	SignStatusRejected  SignStatus = "rejected"
	SignStatusExpired   SignStatus = "expired"
	SignStatusCancelled SignStatus = "cancelled"
)

// IsValid returns true for known providers.
func (p SignProvider) IsValid() bool {
	switch p {
	case SignProviderEImzala, SignProviderKamuSM, SignProviderEDevlet, SignProviderMobile:
		return true
	}
	return false
}

// IsValid returns true for known statuses.
func (s SignStatus) IsValid() bool {
	switch s {
	case SignStatusPending, SignStatusSigned, SignStatusRejected, SignStatusExpired, SignStatusCancelled:
		return true
	}
	return false
}

// ParseSignProvider normalizes user input.
func ParseSignProvider(s string) (SignProvider, error) {
	p := SignProvider(strings.ToLower(strings.TrimSpace(s)))
	if !p.IsValid() {
		return "", ErrInvalidSignProvider
	}
	return p, nil
}

// ESignature captures signature metadata.
type ESignature struct {
	ID                uuid.UUID    `db:"id" json:"id"`
	TenantID          uuid.UUID    `db:"tenant_id" json:"tenant_id"`
	DocumentID        uuid.UUID    `db:"document_id" json:"document_id"`
	VersionID         uuid.UUID    `db:"version_id" json:"version_id"`
	SignerEmployeeID  uuid.UUID    `db:"signer_employee_id" json:"signer_employee_id"`
	Provider          SignProvider `db:"provider" json:"provider"`
	Status            SignStatus   `db:"status" json:"status"`
	SignedAt          *time.Time   `db:"signed_at" json:"signed_at,omitempty"`
	CertificateSerial *string      `db:"certificate_serial" json:"certificate_serial,omitempty"`
	SignatureBlobPath *string      `db:"signature_blob_path" json:"signature_blob_path,omitempty"`
	ExternalRef       *string      `db:"external_ref" json:"external_ref,omitempty"`
	SignURL           *string      `db:"sign_url" json:"sign_url,omitempty"`
	CreatedAt         time.Time    `db:"created_at" json:"created_at"`
	ExpiresAt         time.Time    `db:"expires_at" json:"expires_at"`
}

// IsExpired returns true when the signature session has passed its deadline
// without completion.
func (s *ESignature) IsExpired() bool {
	if s.Status != SignStatusPending {
		return false
	}
	return time.Now().UTC().After(s.ExpiresAt)
}

// CanSign returns true when the signature is still pending and unexpired.
func (s *ESignature) CanSign() bool {
	return s.Status == SignStatusPending && !s.IsExpired()
}

// CanCancel returns true when in a state where cancellation is meaningful.
func (s *ESignature) CanCancel() bool {
	return s.Status == SignStatusPending
}

// Validate runs invariants.
func (s *ESignature) Validate() error {
	fields := map[string]string{}
	if s.DocumentID == uuid.Nil {
		fields["document_id"] = "required"
	}
	if s.VersionID == uuid.Nil {
		fields["version_id"] = "required"
	}
	if s.SignerEmployeeID == uuid.Nil {
		fields["signer_employee_id"] = "required"
	}
	if !s.Provider.IsValid() {
		fields["provider"] = "invalid"
	}
	if !s.Status.IsValid() {
		fields["status"] = "invalid"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}
