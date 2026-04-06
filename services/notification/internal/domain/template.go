package domain

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// NotifChannel enumerates delivery channels.
type NotifChannel string

// Supported channels.
const (
	ChannelEmail   NotifChannel = "email"
	ChannelSMS     NotifChannel = "sms"
	ChannelPush    NotifChannel = "push"
	ChannelInApp   NotifChannel = "in_app"
	ChannelSlack   NotifChannel = "slack"
	ChannelTeams   NotifChannel = "teams"
	ChannelWebhook NotifChannel = "webhook"
)

// ValidChannel returns true when the channel is one of the supported values.
func ValidChannel(c NotifChannel) bool {
	switch c {
	case ChannelEmail, ChannelSMS, ChannelPush, ChannelInApp, ChannelSlack, ChannelTeams, ChannelWebhook:
		return true
	}
	return false
}

// Lang is an ISO 639-1 language tag.
type Lang string

// Supported languages.
const (
	LangTR Lang = "tr"
	LangEN Lang = "en"
)

// LocaleOf maps a Lang into a locale string used in templates.
func LocaleOf(l Lang) string {
	switch l {
	case LangEN:
		return "en-US"
	default:
		return "tr-TR"
	}
}

// StringArray is a JSONB-encoded string slice used for variables metadata.
type StringArray []string

// Value implements driver.Valuer for JSON storage.
func (s StringArray) Value() (driver.Value, error) {
	if s == nil {
		return []byte("[]"), nil
	}
	return json.Marshal(s)
}

// Scan implements sql.Scanner for JSON retrieval.
func (s *StringArray) Scan(src any) error {
	if src == nil {
		*s = []string{}
		return nil
	}
	var raw []byte
	switch v := src.(type) {
	case []byte:
		raw = v
	case string:
		raw = []byte(v)
	default:
		return fmt.Errorf("StringArray: unsupported scan type %T", src)
	}
	if len(raw) == 0 {
		*s = []string{}
		return nil
	}
	return json.Unmarshal(raw, s)
}

// Template is a renderable notification template.
type Template struct {
	ID         uuid.UUID    `db:"id" json:"id"`
	TenantID   *uuid.UUID   `db:"tenant_id" json:"tenant_id,omitempty"`
	Key        string       `db:"template_key" json:"template_key"`
	Channel    NotifChannel `db:"channel" json:"channel"`
	Locale     string       `db:"locale" json:"locale"`
	Subject    *string      `db:"subject" json:"subject,omitempty"`
	Body       string       `db:"body" json:"body"`
	Variables  StringArray  `db:"variables" json:"variables"`
	Active     bool         `db:"active" json:"active"`
	CreatedAt  time.Time    `db:"created_at" json:"created_at"`
	UpdatedAt  time.Time    `db:"updated_at" json:"updated_at"`
}

// Validate checks required fields.
func (t *Template) Validate() error {
	fields := map[string]string{}
	if strings.TrimSpace(t.Key) == "" {
		fields["template_key"] = "required"
	}
	if !ValidChannel(t.Channel) {
		fields["channel"] = "invalid"
	}
	if strings.TrimSpace(t.Body) == "" {
		fields["body"] = "required"
	}
	if strings.TrimSpace(t.Locale) == "" {
		fields["locale"] = "required"
	}
	if t.Channel == ChannelEmail && (t.Subject == nil || strings.TrimSpace(*t.Subject) == "") {
		fields["subject"] = "required_for_email"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// HasVariable returns true when the template declares the named variable.
func (t *Template) HasVariable(name string) bool {
	for _, v := range t.Variables {
		if v == name {
			return true
		}
	}
	return false
}

// IsGlobal returns true when the template is tenant-agnostic (seeded system template).
func (t *Template) IsGlobal() bool {
	return t.TenantID == nil
}
