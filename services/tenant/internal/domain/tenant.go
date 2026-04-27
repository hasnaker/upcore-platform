package domain

import (
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

// TenantStatus enumerates tenant lifecycle states.
type TenantStatus string

const (
	TenantStatusTrial     TenantStatus = "trial"
	TenantStatusActive    TenantStatus = "active"
	TenantStatusSuspended TenantStatus = "suspended"
	TenantStatusDeleted   TenantStatus = "deleted"
)

// Tenant is the root organization record.
type Tenant struct {
	ID           uuid.UUID    `db:"id" json:"id"`
	Name         string       `db:"name" json:"name"`
	Slug         string       `db:"slug" json:"slug"`
	VKN          *string      `db:"vkn" json:"vkn,omitempty"`
	TCKN         *string      `db:"tckn" json:"tckn,omitempty"`
	Country      string       `db:"country" json:"country"`
	Locale       string       `db:"locale" json:"locale"`
	Status       TenantStatus `db:"status" json:"status"`
	TrialEndsAt  *time.Time   `db:"trial_ends_at" json:"trial_ends_at,omitempty"`
	DeletedAt    *time.Time   `db:"deleted_at" json:"deleted_at,omitempty"`
	CreatedAt    time.Time    `db:"created_at" json:"created_at"`
	UpdatedAt    time.Time    `db:"updated_at" json:"updated_at"`
}

// IsActive returns true when tenant can be used.
func (t *Tenant) IsActive() bool {
	return t.Status == TenantStatusActive || t.Status == TenantStatusTrial
}

// TenantAdminRow is the admin-facing listing projection: tenant core fields
// joined with current subscription + latest employee-count usage counter.
type TenantAdminRow struct {
	ID            uuid.UUID    `db:"id" json:"id"`
	Name          string       `db:"name" json:"name"`
	Slug          string       `db:"slug" json:"slug"`
	Country       string       `db:"country" json:"country"`
	Locale        string       `db:"locale" json:"locale"`
	Status        TenantStatus `db:"status" json:"status"`
	TrialEndsAt   *time.Time   `db:"trial_ends_at" json:"trial_ends_at,omitempty"`
	CreatedAt     time.Time    `db:"created_at" json:"created_at"`
	UpdatedAt     time.Time    `db:"updated_at" json:"updated_at"`
	PlanID        *string      `db:"plan_id" json:"plan_id,omitempty"`
	SubStatus     *string      `db:"sub_status" json:"subscription_status,omitempty"`
	Seats         *int         `db:"seats" json:"seats,omitempty"`
	EmployeeCount int64        `db:"employee_count" json:"employee_count"`
}

// IsTrialing returns true while within the trial window.
func (t *Tenant) IsTrialing() bool {
	return t.Status == TenantStatusTrial && t.TrialEndsAt != nil && t.TrialEndsAt.After(time.Now())
}

var slugRe = regexp.MustCompile(`^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$`)

// ValidateSlug validates URL-safe slug: 3-60 chars, lowercase alphanum + hyphens,
// must start/end with alphanumeric.
func ValidateSlug(slug string) error {
	if len(slug) < 3 || len(slug) > 60 {
		return ErrInvalidSlug
	}
	if !slugRe.MatchString(slug) {
		return ErrInvalidSlug
	}
	if strings.Contains(slug, "--") {
		return ErrInvalidSlug
	}
	return nil
}

// ValidateVKN validates Turkish tax number (10 digits) with official checksum.
// Algorithm: each of first 9 digits is transformed, summed modulo 10; 10th digit
// is verified against the derived check digit.
func ValidateVKN(vkn string) error {
	vkn = strings.TrimSpace(vkn)
	if len(vkn) != 10 {
		return ErrInvalidVKN
	}
	digits := make([]int, 10)
	for i := 0; i < 10; i++ {
		d, err := strconv.Atoi(string(vkn[i]))
		if err != nil {
			return ErrInvalidVKN
		}
		digits[i] = d
	}
	sum := 0
	for i := 0; i < 9; i++ {
		tmp := (digits[i] + (9 - i)) % 10
		if tmp == 0 {
			sum += tmp
			continue
		}
		// Multiply by 2^(9-i) mod 9; if result zero use 9.
		pow := 1 << uint(9-i)
		v := (tmp * pow) % 9
		if v == 0 {
			v = 9
		}
		sum += v
	}
	check := (10 - (sum % 10)) % 10
	if check != digits[9] {
		return ErrInvalidVKN
	}
	return nil
}

// ValidateTCKN validates Turkish national identity number (11 digits) via the
// standard checksum rules.
func ValidateTCKN(tckn string) error {
	tckn = strings.TrimSpace(tckn)
	if len(tckn) != 11 {
		return ErrInvalidTCKN
	}
	digits := make([]int, 11)
	for i := 0; i < 11; i++ {
		d, err := strconv.Atoi(string(tckn[i]))
		if err != nil {
			return ErrInvalidTCKN
		}
		digits[i] = d
	}
	if digits[0] == 0 {
		return ErrInvalidTCKN
	}
	// d10 = ((sum of odd-indexed d1..d9) * 7 - sum of even-indexed d2..d8) mod 10
	oddSum := digits[0] + digits[2] + digits[4] + digits[6] + digits[8]
	evenSum := digits[1] + digits[3] + digits[5] + digits[7]
	d10 := ((oddSum * 7) - evenSum) % 10
	if d10 < 0 {
		d10 += 10
	}
	if d10 != digits[9] {
		return ErrInvalidTCKN
	}
	// d11 = (sum of d1..d10) mod 10
	total := 0
	for i := 0; i < 10; i++ {
		total += digits[i]
	}
	if total%10 != digits[10] {
		return ErrInvalidTCKN
	}
	return nil
}

// NormalizeSlug lowercases and trims surrounding whitespace.
func NormalizeSlug(s string) string {
	return strings.ToLower(strings.TrimSpace(s))
}
