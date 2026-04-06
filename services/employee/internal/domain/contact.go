package domain

import (
	"net/mail"
	"strings"
	"time"

	"github.com/google/uuid"
)

// ContactType enumerates the relationship the contact plays to the employee.
type ContactType string

const (
	ContactEmergency  ContactType = "emergency"
	ContactNextOfKin  ContactType = "next_of_kin"
	ContactGuardian   ContactType = "guardian"
	ContactPartner    ContactType = "partner"
	ContactOther      ContactType = "other"
)

// IsValid reports whether the contact type is legal.
func (c ContactType) IsValid() bool {
	switch c {
	case ContactEmergency, ContactNextOfKin, ContactGuardian, ContactPartner, ContactOther:
		return true
	}
	return false
}

// Relationship enumerates the allowed relationship values (Turkish).
type Relationship string

const (
	RelSpouse    Relationship = "eş"
	RelMother    Relationship = "anne"
	RelFather    Relationship = "baba"
	RelSibling   Relationship = "kardeş"
	RelChild     Relationship = "çocuk"
	RelFriend    Relationship = "arkadaş"
	RelOther     Relationship = "diğer"
)

// IsValid reports whether the relationship is legal.
func (r Relationship) IsValid() bool {
	switch r {
	case RelSpouse, RelMother, RelFather, RelSibling, RelChild, RelFriend, RelOther:
		return true
	}
	return false
}

// EmergencyContact is an emergency / next-of-kin contact for an employee.
type EmergencyContact struct {
	ID             uuid.UUID   `db:"id" json:"id"`
	TenantID       uuid.UUID   `db:"tenant_id" json:"tenant_id"`
	EmployeeID     uuid.UUID   `db:"employee_id" json:"employee_id"`
	ContactType    ContactType `db:"contact_type" json:"contact_type"`
	FullName       string      `db:"full_name" json:"full_name"`
	Relationship   *string     `db:"relationship" json:"relationship,omitempty"`
	PhonePrimary   string      `db:"phone_primary" json:"phone_primary"`
	PhoneSecondary *string     `db:"phone_secondary" json:"phone_secondary,omitempty"`
	Email          *string     `db:"email" json:"email,omitempty"`
	Address        *string     `db:"address" json:"address,omitempty"`
	Notes          *string     `db:"notes" json:"notes,omitempty"`
	IsPrimary      bool        `db:"is_primary" json:"is_primary"`
	CreatedAt      time.Time   `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time   `db:"updated_at" json:"updated_at"`
	DeletedAt      *time.Time  `db:"deleted_at" json:"deleted_at,omitempty"`
}

// ApplyDefaults sets default values.
func (c *EmergencyContact) ApplyDefaults() {
	if c.ID == uuid.Nil {
		c.ID = uuid.New()
	}
	if c.ContactType == "" {
		c.ContactType = ContactEmergency
	}
}

// Validate enforces business rules on a contact.
func (c *EmergencyContact) Validate() error {
	fields := map[string]string{}
	if strings.TrimSpace(c.FullName) == "" {
		fields["full_name"] = "required"
	}
	if strings.TrimSpace(c.PhonePrimary) == "" {
		fields["phone_primary"] = "required"
	}
	if !c.ContactType.IsValid() {
		fields["contact_type"] = "invalid"
	}
	if c.Relationship != nil && *c.Relationship != "" && !Relationship(*c.Relationship).IsValid() {
		fields["relationship"] = "invalid"
	}
	if c.Email != nil && strings.TrimSpace(*c.Email) != "" {
		if _, err := mail.ParseAddress(*c.Email); err != nil {
			fields["email"] = "invalid"
		}
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}
