package domain

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// JSONB wraps a raw JSON document for pg `jsonb` columns.
type JSONB []byte

// Value implements driver.Valuer.
func (j JSONB) Value() (driver.Value, error) {
	if len(j) == 0 {
		return []byte("{}"), nil
	}
	if !json.Valid(j) {
		return nil, fmt.Errorf("jsonb: invalid JSON")
	}
	return []byte(j), nil
}

// Scan implements sql.Scanner.
func (j *JSONB) Scan(src any) error {
	if src == nil {
		*j = JSONB("{}")
		return nil
	}
	switch v := src.(type) {
	case []byte:
		cp := make([]byte, len(v))
		copy(cp, v)
		*j = JSONB(cp)
	case string:
		*j = JSONB(v)
	default:
		return fmt.Errorf("jsonb: unsupported type %T", src)
	}
	return nil
}

// MarshalJSON returns the raw bytes, or {} when empty.
func (j JSONB) MarshalJSON() ([]byte, error) {
	if len(j) == 0 {
		return []byte("{}"), nil
	}
	return []byte(j), nil
}

// LeaveStatus enumerates request lifecycle states.
type LeaveStatus string

// Leave request statuses — mirror the DB CHECK constraint on app.leave_requests.status.
const (
	StatusDraft            LeaveStatus = "draft"
	StatusPending          LeaveStatus = "pending"          // submitted, awaiting manager
	StatusManagerApproved  LeaveStatus = "manager_approved" // awaiting HR (when required)
	StatusApproved         LeaveStatus = "approved"         // fully approved
	StatusRejected         LeaveStatus = "rejected"
	StatusCancelled        LeaveStatus = "cancelled"
	StatusTaken            LeaveStatus = "taken"
)

// IsTerminal reports whether the status cannot change further.
func (s LeaveStatus) IsTerminal() bool {
	switch s {
	case StatusRejected, StatusCancelled, StatusTaken:
		return true
	}
	return false
}

// IsPending reports whether the status still awaits an approval action.
func (s LeaveStatus) IsPending() bool {
	return s == StatusPending || s == StatusManagerApproved
}

// CountsAgainstBalance returns true when the request should reserve/consume balance.
func (s LeaveStatus) CountsAgainstBalance() bool {
	switch s {
	case StatusPending, StatusManagerApproved, StatusApproved, StatusTaken:
		return true
	}
	return false
}

// LeaveRequest represents a single employee leave submission.
type LeaveRequest struct {
	ID             uuid.UUID      `db:"id" json:"id"`
	TenantID       uuid.UUID      `db:"tenant_id" json:"tenant_id"`
	EmployeeID     uuid.UUID      `db:"employee_id" json:"employee_id"`
	LeaveTypeID    uuid.UUID      `db:"leave_type_id" json:"leave_type_id"`
	StartDate      time.Time      `db:"start_date" json:"start_date"`
	EndDate        time.Time      `db:"end_date" json:"end_date"`
	StartHalfDay   bool           `db:"start_half_day" json:"start_half_day"`
	EndHalfDay     bool           `db:"end_half_day" json:"end_half_day"`
	TotalDays      float64        `db:"total_days" json:"total_days"`
	Reason         *string        `db:"reason" json:"reason,omitempty"`
	Status         LeaveStatus    `db:"status" json:"status"`
	RequestedAt    time.Time      `db:"requested_at" json:"requested_at"`
	ApprovedBy     *uuid.UUID     `db:"approved_by" json:"approved_by,omitempty"`
	ApprovedAt     *time.Time     `db:"approved_at" json:"approved_at,omitempty"`
	RejectedReason *string        `db:"rejected_reason" json:"rejected_reason,omitempty"`
	CancelledAt    *time.Time     `db:"cancelled_at" json:"cancelled_at,omitempty"`
	DocumentURLs   pq.StringArray `db:"document_urls" json:"document_urls,omitempty"`
	Metadata       JSONB          `db:"metadata" json:"metadata,omitempty"`
	CreatedAt      time.Time      `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time      `db:"updated_at" json:"updated_at"`
}

// CanCancel returns true when the request can still be cancelled by its owner.
func (r *LeaveRequest) CanCancel() bool {
	switch r.Status {
	case StatusDraft, StatusPending, StatusManagerApproved, StatusApproved:
		// approved can be cancelled until start_date passes
		if r.Status == StatusApproved && time.Now().UTC().After(r.StartDate) {
			return false
		}
		return true
	}
	return false
}

// CanUpdate returns true when the request is editable.
func (r *LeaveRequest) CanUpdate() bool {
	return r.Status == StatusDraft || r.Status == StatusPending
}

// OverlapsWith reports whether two date ranges intersect (inclusive).
func (r *LeaveRequest) OverlapsWith(start, end time.Time) bool {
	return !r.EndDate.Before(start) && !r.StartDate.After(end)
}

// ValidateDates checks simple date-range invariants.
func (r *LeaveRequest) ValidateDates() error {
	if r.EndDate.Before(r.StartDate) {
		return ErrInvalidDateRange
	}
	return nil
}
