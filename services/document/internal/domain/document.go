package domain

import (
	"time"

	"github.com/google/uuid"
)

// Document is the root entity representing a stored file (with versions).
// Mapped to `app.documents`.
type Document struct {
	ID              uuid.UUID  `db:"id" json:"id"`
	TenantID        uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	OwnerEmployeeID *uuid.UUID `db:"owner_employee_id" json:"owner_employee_id,omitempty"`
	OwnerUserID     *uuid.UUID `db:"owner_user_id" json:"owner_user_id,omitempty"`
	Category        DocType    `db:"category" json:"category"`
	Title           string     `db:"title" json:"title"`
	Description     *string    `db:"description" json:"description,omitempty"`
	CurrentVersion  int        `db:"current_version" json:"current_version"`
	Tags            StringArr  `db:"tags" json:"tags"`
	IsConfidential  bool       `db:"is_confidential" json:"is_confidential"`
	RetentionUntil  *time.Time `db:"retention_until" json:"retention_until,omitempty"`
	SignedAt        *time.Time `db:"signed_at" json:"signed_at,omitempty"`
	SignedBy        *uuid.UUID `db:"signed_by" json:"signed_by,omitempty"`
	Metadata        JSONMap    `db:"metadata" json:"metadata"`
	CreatedAt       time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt       time.Time  `db:"updated_at" json:"updated_at"`
	DeletedAt       *time.Time `db:"deleted_at" json:"deleted_at,omitempty"`
}

// Validate runs basic invariants on the document entity.
func (d *Document) Validate() error {
	fields := map[string]string{}
	if d.TenantID == uuid.Nil {
		fields["tenant_id"] = "required"
	}
	if len(d.Title) == 0 || len(d.Title) > 300 {
		fields["title"] = "length 1-300"
	}
	if !d.Category.IsValid() {
		fields["category"] = "invalid"
	}
	if d.CurrentVersion < 1 {
		fields["current_version"] = "must be >= 1"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// IsDeleted returns true when the document is soft-deleted.
func (d *Document) IsDeleted() bool { return d.DeletedAt != nil }

// IsSigned returns true when the document has an applied signature.
func (d *Document) IsSigned() bool { return d.SignedAt != nil }

// IsExpired returns true when the retention_until date has passed.
func (d *Document) IsExpired() bool {
	if d.RetentionUntil == nil {
		return false
	}
	return d.RetentionUntil.Before(time.Now().UTC())
}

// IsExpiringSoon reports whether retention_until falls within the next N days.
func (d *Document) IsExpiringSoon(days int) bool {
	if d.RetentionUntil == nil {
		return false
	}
	cutoff := time.Now().UTC().Add(time.Duration(days) * 24 * time.Hour)
	return !d.RetentionUntil.After(cutoff) && !d.IsExpired()
}

// DaysUntilExpiry reports the integer number of days (floor) until retention
// expires; returns a negative value when already expired and 0 when no
// retention policy is set.
func (d *Document) DaysUntilExpiry() int {
	if d.RetentionUntil == nil {
		return 0
	}
	delta := time.Until(*d.RetentionUntil)
	return int(delta / (24 * time.Hour))
}

// CanDelete returns true when the document is not already soft-deleted.
func (d *Document) CanDelete() bool { return !d.IsDeleted() }

// CanHardDelete returns true when the retention window has elapsed.
func (d *Document) CanHardDelete() bool {
	return d.IsDeleted() && d.IsExpired()
}

// BlobPath computes the canonical tenant-scoped blob path for a given version.
// Format: {tenant_id}/{document_id}/v{n}-{suffix}
func BlobPath(tenantID, documentID uuid.UUID, version int, suffix string) string {
	if suffix == "" {
		suffix = "file"
	}
	return tenantID.String() + "/" + documentID.String() + "/v" + itoa(version) + "-" + suffix
}

// itoa avoids pulling strconv into a tight hot-path; tiny helper.
func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	neg := n < 0
	if neg {
		n = -n
	}
	var buf [20]byte
	i := len(buf)
	for n > 0 {
		i--
		buf[i] = byte('0' + n%10)
		n /= 10
	}
	if neg {
		i--
		buf[i] = '-'
	}
	return string(buf[i:])
}
