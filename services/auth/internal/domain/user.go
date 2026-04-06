package domain

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// UserStatus enumerates lifecycle states for a user.
type UserStatus string

const (
	UserStatusActive    UserStatus = "active"
	UserStatusSuspended UserStatus = "suspended"
	UserStatusDeleted   UserStatus = "deleted"
	UserStatusInvited   UserStatus = "invited"
)

// IsValid reports whether the status is a known value.
func (s UserStatus) IsValid() bool {
	switch s {
	case UserStatusActive, UserStatusSuspended, UserStatusDeleted, UserStatusInvited:
		return true
	}
	return false
}

// User represents an authenticated principal backed by a Clerk identity.
type User struct {
	ID        uuid.UUID       `db:"id" json:"id"`
	ClerkID   string          `db:"clerk_id" json:"clerk_id"`
	TenantID  uuid.UUID       `db:"tenant_id" json:"tenant_id"`
	Email     string          `db:"email" json:"email"`
	FirstName string          `db:"first_name" json:"first_name"`
	LastName  string          `db:"last_name" json:"last_name"`
	Locale    string          `db:"locale" json:"locale"`
	Status    UserStatus      `db:"status" json:"status"`
	Metadata  json.RawMessage `db:"metadata" json:"metadata,omitempty"`
	CreatedAt time.Time       `db:"created_at" json:"created_at"`
	UpdatedAt time.Time       `db:"updated_at" json:"updated_at"`
}

// Validate performs business-rule validation on the user entity.
func (u *User) Validate() error {
	if u.ClerkID == "" {
		return fmt.Errorf("%w: clerk_id is required", ErrInvalidInput)
	}
	if u.TenantID == uuid.Nil {
		return fmt.Errorf("%w: tenant_id is required", ErrInvalidInput)
	}
	if u.Email == "" {
		return fmt.Errorf("%w: email is required", ErrInvalidInput)
	}
	if !strings.Contains(u.Email, "@") {
		return fmt.Errorf("%w: email is malformed", ErrInvalidInput)
	}
	if !u.Status.IsValid() {
		return fmt.Errorf("%w: status %q is invalid", ErrInvalidInput, u.Status)
	}
	if u.Locale == "" {
		u.Locale = "tr-TR"
	}
	return nil
}

// IsActive reports whether the user may authenticate.
func (u *User) IsActive() bool {
	return u.Status == UserStatusActive
}

// FullName returns "First Last" trimmed.
func (u *User) FullName() string {
	return strings.TrimSpace(u.FirstName + " " + u.LastName)
}
