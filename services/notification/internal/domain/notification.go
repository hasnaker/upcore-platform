package domain

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// NotifStatus enumerates lifecycle states.
type NotifStatus string

// Notification statuses (must match DB CHECK constraint).
const (
	StatusPending   NotifStatus = "pending"
	StatusQueued    NotifStatus = "queued"
	StatusSending   NotifStatus = "sending"
	StatusSent      NotifStatus = "sent"
	StatusDelivered NotifStatus = "delivered"
	StatusFailed    NotifStatus = "failed"
	StatusBounced   NotifStatus = "bounced"
	StatusRead      NotifStatus = "read"
)

// ValidStatus returns true when the status is one of the supported values.
func ValidStatus(s NotifStatus) bool {
	switch s {
	case StatusPending, StatusQueued, StatusSending, StatusSent, StatusDelivered, StatusFailed, StatusBounced, StatusRead:
		return true
	}
	return false
}

// Priority enumerates delivery priority.
type Priority string

// Priority values.
const (
	PriorityLow    Priority = "low"
	PriorityNormal Priority = "normal"
	PriorityHigh   Priority = "high"
	PriorityUrgent Priority = "urgent"
)

// ValidPriority returns true when the priority is one of the supported values.
func ValidPriority(p Priority) bool {
	switch p {
	case PriorityLow, PriorityNormal, PriorityHigh, PriorityUrgent:
		return true
	}
	return false
}

// JSONMap is a JSONB-encoded map used for template variables and payload.
type JSONMap map[string]any

// Value implements driver.Valuer.
func (j JSONMap) Value() (driver.Value, error) {
	if j == nil {
		return []byte("{}"), nil
	}
	return json.Marshal(j)
}

// Scan implements sql.Scanner.
func (j *JSONMap) Scan(src any) error {
	if src == nil {
		*j = JSONMap{}
		return nil
	}
	var raw []byte
	switch v := src.(type) {
	case []byte:
		raw = v
	case string:
		raw = []byte(v)
	default:
		return fmt.Errorf("JSONMap: unsupported scan type %T", src)
	}
	if len(raw) == 0 {
		*j = JSONMap{}
		return nil
	}
	return json.Unmarshal(raw, j)
}

// Notification is an outbound (or stored in-app) notification record.
type Notification struct {
	ID            uuid.UUID    `db:"id" json:"id"`
	TenantID      uuid.UUID    `db:"tenant_id" json:"tenant_id"`
	UserID        *uuid.UUID   `db:"user_id" json:"user_id,omitempty"`
	EmployeeID    *uuid.UUID   `db:"employee_id" json:"employee_id,omitempty"`
	Channel       NotifChannel `db:"channel" json:"channel"`
	TemplateKey   *string      `db:"template_key" json:"template_key,omitempty"`
	Subject       *string      `db:"subject" json:"subject,omitempty"`
	Body          *string      `db:"body" json:"body,omitempty"`
	Payload       JSONMap      `db:"payload" json:"payload"`
	Priority      Priority     `db:"priority" json:"priority"`
	Status        NotifStatus  `db:"status" json:"status"`
	ScheduledAt   *time.Time   `db:"scheduled_at" json:"scheduled_at,omitempty"`
	SentAt        *time.Time   `db:"sent_at" json:"sent_at,omitempty"`
	DeliveredAt   *time.Time   `db:"delivered_at" json:"delivered_at,omitempty"`
	ReadAt        *time.Time   `db:"read_at" json:"read_at,omitempty"`
	FailedAt      *time.Time   `db:"failed_at" json:"failed_at,omitempty"`
	ErrorMessage  *string      `db:"error_message" json:"error_message,omitempty"`
	RetryCount    int          `db:"retry_count" json:"retry_count"`
	ProviderRef   *string      `db:"provider_ref" json:"provider_ref,omitempty"`
	CreatedAt     time.Time    `db:"created_at" json:"created_at"`
	UpdatedAt     time.Time    `db:"updated_at" json:"updated_at"`

	// Transient (not persisted) delivery metadata.
	RecipientEmail string `db:"-" json:"recipient_email,omitempty"`
	RecipientPhone string `db:"-" json:"recipient_phone,omitempty"`
}

// Validate checks required fields.
func (n *Notification) Validate() error {
	fields := map[string]string{}
	if n.TenantID == uuid.Nil {
		fields["tenant_id"] = "required"
	}
	if !ValidChannel(n.Channel) {
		fields["channel"] = "invalid"
	}
	if !ValidStatus(n.Status) {
		fields["status"] = "invalid"
	}
	if !ValidPriority(n.Priority) {
		fields["priority"] = "invalid"
	}
	if strings.TrimSpace(n.RecipientEmail) == "" && n.UserID == nil && n.EmployeeID == nil {
		fields["recipient"] = "required"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// CanRetry returns true when the notification is eligible for another retry.
func (n *Notification) CanRetry(maxRetries int) bool {
	if n.Status != StatusFailed {
		return false
	}
	return n.RetryCount < maxRetries
}

// BackoffDelay returns an exponential backoff interval for the given attempt.
// Attempt 1 = 1m, 2 = 5m, 3 = 30m, 4 = 2h, 5 = 8h, beyond = 24h.
func BackoffDelay(attempt int) time.Duration {
	switch attempt {
	case 1:
		return 1 * time.Minute
	case 2:
		return 5 * time.Minute
	case 3:
		return 30 * time.Minute
	case 4:
		return 2 * time.Hour
	case 5:
		return 8 * time.Hour
	default:
		return 24 * time.Hour
	}
}

// IsTerminal returns true when the notification will not be retried.
func (n *Notification) IsTerminal() bool {
	return n.Status == StatusDelivered || n.Status == StatusBounced || n.Status == StatusRead
}
