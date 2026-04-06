package clerk

import "encoding/json"

// Event types emitted by Clerk webhooks.
const (
	EventUserCreated    = "user.created"
	EventUserUpdated    = "user.updated"
	EventUserDeleted    = "user.deleted"
	EventSessionCreated = "session.created"
	EventSessionRevoked = "session.revoked"
	EventSessionEnded   = "session.ended"
)

// Event is the wrapper Clerk sends for all webhook events.
type Event struct {
	Type      string          `json:"type"`
	Object    string          `json:"object"`
	Data      json.RawMessage `json:"data"`
	Timestamp int64           `json:"timestamp"`
}

// UserData is the payload of user.* events.
type UserData struct {
	ID                    string                 `json:"id"`
	FirstName             string                 `json:"first_name"`
	LastName              string                 `json:"last_name"`
	EmailAddresses        []EmailAddress         `json:"email_addresses"`
	PrimaryEmailAddressID string                 `json:"primary_email_address_id"`
	PublicMetadata        map[string]any         `json:"public_metadata"`
	PrivateMetadata       map[string]any         `json:"private_metadata"`
	UnsafeMetadata        map[string]any         `json:"unsafe_metadata"`
	CreatedAt             int64                  `json:"created_at"`
	UpdatedAt             int64                  `json:"updated_at"`
	Username              string                 `json:"username"`
	ImageURL              string                 `json:"image_url"`
}

// EmailAddress is one email tied to a Clerk user.
type EmailAddress struct {
	ID           string `json:"id"`
	EmailAddress string `json:"email_address"`
	Verification struct {
		Status string `json:"status"`
	} `json:"verification"`
}

// PrimaryEmail returns the user's primary verified email, or empty string.
func (u *UserData) PrimaryEmail() string {
	for _, e := range u.EmailAddresses {
		if e.ID == u.PrimaryEmailAddressID {
			return e.EmailAddress
		}
	}
	if len(u.EmailAddresses) > 0 {
		return u.EmailAddresses[0].EmailAddress
	}
	return ""
}

// SessionData is the payload of session.* events.
type SessionData struct {
	ID        string `json:"id"`
	UserID    string `json:"user_id"`
	ClientID  string `json:"client_id"`
	Status    string `json:"status"`
	CreatedAt int64  `json:"created_at"`
	UpdatedAt int64  `json:"updated_at"`
	ExpireAt  int64  `json:"expire_at"`
}
