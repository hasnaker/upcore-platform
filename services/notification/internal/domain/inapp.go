package domain

import (
	"time"

	"github.com/google/uuid"
)

// InAppNotification is a stored notification displayed in the app.
type InAppNotification struct {
	ID        uuid.UUID  `db:"id" json:"id"`
	TenantID  uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	UserID    uuid.UUID  `db:"user_id" json:"user_id"`
	Title     string     `db:"title" json:"title"`
	Body      string     `db:"body" json:"body"`
	LinkURL   string     `db:"link_url" json:"link_url,omitempty"`
	Category  Category   `db:"category" json:"category"`
	IsRead    bool       `db:"is_read" json:"is_read"`
	ReadAt    *time.Time `db:"read_at" json:"read_at,omitempty"`
	CreatedAt time.Time  `db:"created_at" json:"created_at"`
}

// Validate checks required fields.
func (n *InAppNotification) Validate() error {
	fields := map[string]string{}
	if n.TenantID == uuid.Nil {
		fields["tenant_id"] = "required"
	}
	if n.UserID == uuid.Nil {
		fields["user_id"] = "required"
	}
	if n.Title == "" {
		fields["title"] = "required"
	}
	if n.Body == "" {
		fields["body"] = "required"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}
