package domain

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// JSONB is a thin wrapper around a JSON byte slice that satisfies both
// database/sql.Scanner and driver.Valuer so it round-trips through pg jsonb columns.
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
		*j = JSONB([]byte(v))
	default:
		return fmt.Errorf("jsonb: unsupported scan type %T", src)
	}
	return nil
}

// MarshalJSON emits the underlying bytes (or an empty object).
func (j JSONB) MarshalJSON() ([]byte, error) {
	if len(j) == 0 {
		return []byte("{}"), nil
	}
	return j, nil
}

// UnmarshalJSON captures the raw bytes.
func (j *JSONB) UnmarshalJSON(data []byte) error {
	if len(data) == 0 {
		*j = JSONB("{}")
		return nil
	}
	cp := make([]byte, len(data))
	copy(cp, data)
	*j = JSONB(cp)
	return nil
}

// AssessmentStatus represents the lifecycle state.
type AssessmentStatus string

const (
	StatusPending    AssessmentStatus = "pending"
	StatusInProgress AssessmentStatus = "in_progress"
	StatusCompleted  AssessmentStatus = "completed"
	StatusScored     AssessmentStatus = "scored"
	StatusExpired    AssessmentStatus = "expired"
	StatusCancelled  AssessmentStatus = "cancelled"
)

// IsValid checks that the status is a known value.
func (s AssessmentStatus) IsValid() bool {
	switch s {
	case StatusPending, StatusInProgress, StatusCompleted, StatusScored, StatusExpired, StatusCancelled:
		return true
	}
	return false
}

// SessionStatus represents a test session state.
type SessionStatus string

const (
	SessionActive    SessionStatus = "active"
	SessionPaused    SessionStatus = "paused"
	SessionCompleted SessionStatus = "completed"
	SessionTimedOut  SessionStatus = "timed_out"
)

// IsValid checks that the session status is a known value.
func (s SessionStatus) IsValid() bool {
	switch s {
	case SessionActive, SessionPaused, SessionCompleted, SessionTimedOut:
		return true
	}
	return false
}

// Assessment is the root assessment record.
type Assessment struct {
	ID             uuid.UUID        `db:"id" json:"id"`
	TenantID       uuid.UUID        `db:"tenant_id" json:"tenant_id"`
	EmployeeID     *uuid.UUID       `db:"employee_id" json:"employee_id,omitempty"`
	CandidateEmail *string          `db:"candidate_email" json:"candidate_email,omitempty"`
	CandidateName  *string          `db:"candidate_name" json:"candidate_name,omitempty"`
	InstrumentCode string           `db:"instrument_code" json:"instrument_code"`
	Status         AssessmentStatus `db:"status" json:"status"`
	CandidateToken string           `db:"candidate_token" json:"candidate_token"`
	AssignedBy     *uuid.UUID       `db:"assigned_by" json:"assigned_by,omitempty"`
	ExpiresAt      *time.Time       `db:"expires_at" json:"expires_at,omitempty"`
	Metadata       JSONB            `db:"metadata" json:"metadata,omitempty"`
	CreatedAt      time.Time        `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time        `db:"updated_at" json:"updated_at"`
	DeletedAt      *time.Time       `db:"deleted_at" json:"deleted_at,omitempty"`
}

// IsExpired returns true when the assessment has passed its expiration.
func (a *Assessment) IsExpired() bool {
	if a.ExpiresAt == nil {
		return false
	}
	return time.Now().UTC().After(a.ExpiresAt.UTC())
}

// CanStart returns true when the assessment is eligible to begin.
func (a *Assessment) CanStart() bool {
	return a.Status == StatusPending && !a.IsExpired()
}

// CanResume returns true when the assessment can be continued.
func (a *Assessment) CanResume() bool {
	return a.Status == StatusInProgress && !a.IsExpired()
}

// Session represents an active test-taking session.
type Session struct {
	ID                uuid.UUID     `db:"id" json:"id"`
	AssessmentID      uuid.UUID     `db:"assessment_id" json:"assessment_id"`
	TenantID          uuid.UUID     `db:"tenant_id" json:"tenant_id"`
	Status            SessionStatus `db:"status" json:"status"`
	StartedAt         time.Time     `db:"started_at" json:"started_at"`
	CompletedAt       *time.Time    `db:"completed_at" json:"completed_at,omitempty"`
	TimeLimitSeconds  int           `db:"time_limit_seconds" json:"time_limit_seconds"`
	ElapsedSeconds    int           `db:"elapsed_seconds" json:"elapsed_seconds"`
	CurrentItemIndex  int           `db:"current_item_index" json:"current_item_index"`
	TotalItems        int           `db:"total_items" json:"total_items"`
	CheatingMetrics   JSONB         `db:"cheating_metrics" json:"cheating_metrics"`
	BrowserFingerPrint *string      `db:"browser_fingerprint" json:"browser_fingerprint,omitempty"`
	IPAddress         *string       `db:"ip_address" json:"ip_address,omitempty"`
	UserAgent         *string       `db:"user_agent" json:"user_agent,omitempty"`
	CreatedAt         time.Time     `db:"created_at" json:"created_at"`
	UpdatedAt         time.Time     `db:"updated_at" json:"updated_at"`
}

// IsTimedOut checks whether the session has exceeded its time limit.
func (s *Session) IsTimedOut() bool {
	if s.TimeLimitSeconds <= 0 {
		return false
	}
	return s.ElapsedSeconds >= s.TimeLimitSeconds
}

// RemainingSeconds returns seconds left in the session.
func (s *Session) RemainingSeconds() int {
	if s.TimeLimitSeconds <= 0 {
		return -1
	}
	rem := s.TimeLimitSeconds - s.ElapsedSeconds
	if rem < 0 {
		return 0
	}
	return rem
}

// Response represents a single item response.
type Response struct {
	ID               uuid.UUID `db:"id" json:"id"`
	SessionID        uuid.UUID `db:"session_id" json:"session_id"`
	AssessmentID     uuid.UUID `db:"assessment_id" json:"assessment_id"`
	TenantID         uuid.UUID `db:"tenant_id" json:"tenant_id"`
	ItemCode         string    `db:"item_code" json:"item_code"`
	ItemIndex        int       `db:"item_index" json:"item_index"`
	ResponseValue    int       `db:"response_value" json:"response_value"`
	ResponseText     *string   `db:"response_text" json:"response_text,omitempty"`
	TimeSpentSeconds float64   `db:"time_spent_seconds" json:"time_spent_seconds"`
	CreatedAt        time.Time `db:"created_at" json:"created_at"`
}

// Score represents a computed scale score.
type Score struct {
	ID           uuid.UUID  `db:"id" json:"id"`
	AssessmentID uuid.UUID  `db:"assessment_id" json:"assessment_id"`
	TenantID     uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	ScaleCode    string     `db:"scale_code" json:"scale_code"`
	ScaleName    string     `db:"scale_name" json:"scale_name"`
	RawScore     float64    `db:"raw_score" json:"raw_score"`
	TScore       *float64   `db:"t_score" json:"t_score,omitempty"`
	Percentile   *float64   `db:"percentile" json:"percentile,omitempty"`
	RiskLevel    *string    `db:"risk_level" json:"risk_level,omitempty"`
	NormGroup    *string    `db:"norm_group" json:"norm_group,omitempty"`
	Metadata     JSONB      `db:"metadata" json:"metadata,omitempty"`
	ScoredAt     time.Time  `db:"scored_at" json:"scored_at"`
	CreatedAt    time.Time  `db:"created_at" json:"created_at"`
}
