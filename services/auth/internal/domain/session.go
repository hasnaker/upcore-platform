package domain

import (
	"time"

	"github.com/google/uuid"
)

// Session represents a persisted refresh-token session.
type Session struct {
	ID               uuid.UUID  `db:"id" json:"id"`
	UserID           uuid.UUID  `db:"user_id" json:"user_id"`
	TenantID         uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	RefreshTokenHash string     `db:"refresh_token_hash" json:"-"`
	UserAgent        string     `db:"user_agent" json:"user_agent"`
	IPAddress        string     `db:"ip_address" json:"ip_address"`
	ExpiresAt        time.Time  `db:"expires_at" json:"expires_at"`
	RevokedAt        *time.Time `db:"revoked_at" json:"revoked_at,omitempty"`
	RevokeReason     *string    `db:"revoke_reason" json:"revoke_reason,omitempty"`
	CreatedAt        time.Time  `db:"created_at" json:"created_at"`
}

// IsValid reports whether the session is currently usable.
func (s *Session) IsValid() bool {
	if s.RevokedAt != nil {
		return false
	}
	return time.Now().Before(s.ExpiresAt)
}

// IsExpired reports whether the session has passed its expiry.
func (s *Session) IsExpired() bool {
	return time.Now().After(s.ExpiresAt)
}

// NewSession constructs a session with the given TTL.
func NewSession(userID, tenantID uuid.UUID, refreshHash, userAgent, ip string, ttl time.Duration) *Session {
	now := time.Now().UTC()
	return &Session{
		ID:               uuid.New(),
		UserID:           userID,
		TenantID:         tenantID,
		RefreshTokenHash: refreshHash,
		UserAgent:        userAgent,
		IPAddress:        ip,
		ExpiresAt:        now.Add(ttl),
		CreatedAt:        now,
	}
}
