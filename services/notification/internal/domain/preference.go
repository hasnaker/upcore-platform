package domain

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Category enumerates notification categories used for opt-in/opt-out.
type Category string

// Categories.
const (
	CategorySystem          Category = "system"
	CategorySecurity        Category = "security"
	CategoryHRAdmin         Category = "hr_admin"
	CategoryLeave           Category = "leave"
	CategoryAssessment      Category = "assessment"
	CategorySurvey          Category = "survey"
	CategoryIntervention    Category = "intervention"
	CategoryBurnoutAlert    Category = "burnout_alert"
	CategoryDocument        Category = "document"
	CategoryOneOnOne        Category = "one_on_one"
	CategoryWelcome         Category = "welcome"
	CategoryDigest          Category = "digest"
	CategoryATS             Category = "ats"
	CategoryPayroll         Category = "payroll"
	CategoryPerformance     Category = "performance"
)

// CriticalCategories are categories that cannot be opted out of (security/legal).
var CriticalCategories = map[Category]bool{
	CategorySecurity: true,
	CategorySystem:   true,
}

// IsCritical returns true when the category is mandatory and cannot be opted out.
func (c Category) IsCritical() bool { return CriticalCategories[c] }

// QuietHours describes a no-send window for a user.
type QuietHours struct {
	Start    string `json:"start,omitempty"` // HH:MM
	End      string `json:"end,omitempty"`   // HH:MM
	Timezone string `json:"tz,omitempty"`    // IANA zone, e.g. "Europe/Istanbul"
}

// IsZero reports whether the quiet hours are unset.
func (q QuietHours) IsZero() bool {
	return strings.TrimSpace(q.Start) == "" || strings.TrimSpace(q.End) == ""
}

// Value implements driver.Valuer for JSONB storage.
func (q QuietHours) Value() (driver.Value, error) {
	return json.Marshal(q)
}

// Scan implements sql.Scanner.
func (q *QuietHours) Scan(src any) error {
	if src == nil {
		*q = QuietHours{}
		return nil
	}
	var raw []byte
	switch v := src.(type) {
	case []byte:
		raw = v
	case string:
		raw = []byte(v)
	default:
		return fmt.Errorf("QuietHours: unsupported scan type %T", src)
	}
	if len(raw) == 0 {
		*q = QuietHours{}
		return nil
	}
	return json.Unmarshal(raw, q)
}

// Within returns true when t (expressed in the quiet-hours timezone) falls inside the window.
func (q QuietHours) Within(t time.Time) bool {
	if q.IsZero() {
		return false
	}
	loc := time.UTC
	if q.Timezone != "" {
		if l, err := time.LoadLocation(q.Timezone); err == nil {
			loc = l
		}
	}
	local := t.In(loc)
	start, err1 := parseHM(q.Start)
	end, err2 := parseHM(q.End)
	if err1 != nil || err2 != nil {
		return false
	}
	nowMin := local.Hour()*60 + local.Minute()
	startMin := start.h*60 + start.m
	endMin := end.h*60 + end.m
	if startMin == endMin {
		return false
	}
	if startMin < endMin {
		return nowMin >= startMin && nowMin < endMin
	}
	// overnight window (e.g. 22:00 → 08:00)
	return nowMin >= startMin || nowMin < endMin
}

type hm struct{ h, m int }

func parseHM(s string) (hm, error) {
	parts := strings.Split(strings.TrimSpace(s), ":")
	if len(parts) != 2 {
		return hm{}, fmt.Errorf("invalid HH:MM: %q", s)
	}
	var h, m int
	if _, err := fmt.Sscanf(parts[0], "%d", &h); err != nil {
		return hm{}, err
	}
	if _, err := fmt.Sscanf(parts[1], "%d", &m); err != nil {
		return hm{}, err
	}
	if h < 0 || h > 23 || m < 0 || m > 59 {
		return hm{}, fmt.Errorf("out of range HH:MM: %q", s)
	}
	return hm{h: h, m: m}, nil
}

// Preference stores per-user per-channel per-category delivery preferences.
type Preference struct {
	ID         uuid.UUID    `db:"id" json:"id"`
	TenantID   uuid.UUID    `db:"tenant_id" json:"tenant_id"`
	UserID     uuid.UUID    `db:"user_id" json:"user_id"`
	Category   Category     `db:"category" json:"category"`
	Channel    NotifChannel `db:"channel" json:"channel"`
	OptIn      bool         `db:"opt_in" json:"opt_in"`
	QuietHours QuietHours   `db:"quiet_hours" json:"quiet_hours"`
	CreatedAt  time.Time    `db:"created_at" json:"created_at"`
	UpdatedAt  time.Time    `db:"updated_at" json:"updated_at"`
}

// CanSendNow checks opt-in + quiet hours, but critical categories bypass both.
func (p *Preference) CanSendNow(now time.Time) bool {
	if p.Category.IsCritical() {
		return true
	}
	if !p.OptIn {
		return false
	}
	if p.QuietHours.Within(now) {
		return false
	}
	return true
}
