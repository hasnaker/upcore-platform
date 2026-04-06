package domain

import (
	"database/sql/driver"
	"strings"
	"time"

	"github.com/google/uuid"
)

// CandidateSource enumerates how a candidate was sourced.
type CandidateSource string

const (
	SourceKariyerNet CandidateSource = "kariyer_net"
	SourceLinkedIn   CandidateSource = "linkedin"
	SourceReferral   CandidateSource = "referral"
	SourceDirect     CandidateSource = "direct"
	SourceOther      CandidateSource = "other"
)

// IsValid reports whether the source is a known value.
func (s CandidateSource) IsValid() bool {
	switch s {
	case SourceKariyerNet, SourceLinkedIn, SourceReferral, SourceDirect, SourceOther:
		return true
	}
	return false
}

// Candidate represents a job applicant.
type Candidate struct {
	ID                 uuid.UUID       `db:"id" json:"id"`
	TenantID           uuid.UUID       `db:"tenant_id" json:"tenant_id"`
	Email              string          `db:"email" json:"email"`
	FirstName          string          `db:"first_name" json:"first_name"`
	LastName           string          `db:"last_name" json:"last_name"`
	Phone              *string         `db:"phone" json:"phone,omitempty"`
	LinkedInURL        *string         `db:"linkedin_url" json:"linkedin_url,omitempty"`
	CVBlobPath         *string         `db:"cv_blob_path" json:"cv_blob_path,omitempty"`
	CVTextExtracted    *string         `db:"cv_text_extracted" json:"cv_text_extracted,omitempty"`
	Source             CandidateSource `db:"source" json:"source"`
	ReferrerEmployeeID *uuid.UUID     `db:"referrer_employee_id" json:"referrer_employee_id,omitempty"`
	Tags               StringArray     `db:"tags" json:"tags"`
	GDPRConsent        bool            `db:"gdpr_consent" json:"gdpr_consent"`
	GDPRConsentAt      *time.Time      `db:"gdpr_consent_at" json:"gdpr_consent_at,omitempty"`
	CreatedAt          time.Time       `db:"created_at" json:"created_at"`
	UpdatedAt          time.Time       `db:"updated_at" json:"updated_at"`
	DeletedAt          *time.Time      `db:"deleted_at" json:"deleted_at,omitempty"`
}

// Validate checks required fields.
func (c *Candidate) Validate() error {
	fields := map[string]string{}
	if strings.TrimSpace(c.Email) == "" {
		fields["email"] = "required"
	}
	if strings.TrimSpace(c.FirstName) == "" {
		fields["first_name"] = "required"
	}
	if strings.TrimSpace(c.LastName) == "" {
		fields["last_name"] = "required"
	}
	if c.Source != "" && !c.Source.IsValid() {
		fields["source"] = "invalid"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// FullName returns the candidate's full name.
func (c *Candidate) FullName() string {
	return strings.TrimSpace(c.FirstName + " " + c.LastName)
}

// HasConsent returns true if the candidate has granted GDPR/KVKK consent.
func (c *Candidate) HasConsent() bool {
	return c.GDPRConsent && c.GDPRConsentAt != nil
}

// ApplyDefaults fills in defaults.
func (c *Candidate) ApplyDefaults() {
	if c.Source == "" {
		c.Source = SourceDirect
	}
	if c.Tags == nil {
		c.Tags = StringArray{}
	}
}

// StringArray wraps []string for Postgres TEXT[] scanning.
type StringArray []string

// Scan implements sql.Scanner.
func (a *StringArray) Scan(src any) error {
	if src == nil {
		*a = StringArray{}
		return nil
	}
	switch v := src.(type) {
	case []byte:
		*a = parsePostgresArray(string(v))
	case string:
		*a = parsePostgresArray(v)
	default:
		*a = StringArray{}
	}
	return nil
}

// Value implements driver.Valuer.
func (a StringArray) Value() (driver.Value, error) {
	if len(a) == 0 {
		return "{}", nil
	}
	elems := make([]string, len(a))
	for i, s := range a {
		elems[i] = `"` + strings.ReplaceAll(s, `"`, `\"`) + `"`
	}
	return "{" + strings.Join(elems, ",") + "}", nil
}

func parsePostgresArray(s string) []string {
	s = strings.TrimSpace(s)
	if s == "" || s == "{}" || s == "NULL" {
		return []string{}
	}
	s = strings.TrimPrefix(s, "{")
	s = strings.TrimSuffix(s, "}")
	if s == "" {
		return []string{}
	}
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		p = strings.Trim(p, `"`)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}
