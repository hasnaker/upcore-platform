package office365

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

// ClerkO365Claim is the subset of claims Clerk exposes for a Microsoft 365
// identity. Clerk performs full signature verification before UpCore sees the
// claim; this struct only parses the payload for downstream cross-checks
// (e.g. asserting the AAD tenant is on the tenant's allow-list).
type ClerkO365Claim struct {
	Subject   string    `json:"sub"`
	Issuer    string    `json:"iss"`
	AADTenant string    `json:"tid"`
	ObjectID  string    `json:"oid"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	IssuedAt  time.Time `json:"-"`
}

// ValidationError signals the claim does not meet UpCore's trust rules.
var (
	ErrClaimInvalid    = errors.New("office365: claim invalid")
	ErrTenantNotAllowed = errors.New("office365: aad tenant not allow-listed")
)

// ParseIDToken decodes the payload of an AAD id_token without verifying the
// signature. This is safe only when the caller has already verified the
// signature elsewhere (Clerk webhook → JWKS check).
func ParseIDToken(idToken string) (*ClerkO365Claim, error) {
	parts := strings.Split(idToken, ".")
	if len(parts) < 2 {
		return nil, ErrClaimInvalid
	}
	raw, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, ErrClaimInvalid
	}
	var claim ClerkO365Claim
	if err := json.Unmarshal(raw, &claim); err != nil {
		return nil, ErrClaimInvalid
	}
	claim.IssuedAt = time.Now().UTC()
	if claim.AADTenant == "" || claim.ObjectID == "" {
		return nil, ErrClaimInvalid
	}
	return &claim, nil
}

// AllowList is a tenant-scoped list of AAD tenant ids that may SSO.
type AllowList interface {
	IsAllowed(tenantID, aadTenantID string) bool
}

// ValidateClaim runs the allow-list check.
func ValidateClaim(list AllowList, upcoreTenant, aadTenant string) error {
	if list == nil {
		return nil
	}
	if list.IsAllowed(upcoreTenant, aadTenant) {
		return nil
	}
	return ErrTenantNotAllowed
}
