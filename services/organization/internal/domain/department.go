package domain

import (
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
)

// DeptStatus enumerates department lifecycle states.
type DeptStatus string

const (
	DeptStatusActive   DeptStatus = "active"
	DeptStatusArchived DeptStatus = "archived"
)

// Department is an organizational unit with an ltree path for fast subtree queries.
type Department struct {
	ID             uuid.UUID  `db:"id" json:"id"`
	TenantID       uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	ParentID       *uuid.UUID `db:"parent_id" json:"parent_id,omitempty"`
	Code           string     `db:"code" json:"code"`
	NameTR         string     `db:"name_tr" json:"name_tr"`
	NameEN         *string    `db:"name_en" json:"name_en,omitempty"`
	Description    *string    `db:"description" json:"description,omitempty"`
	Path           string     `db:"path" json:"path"`
	Depth          int        `db:"depth" json:"depth"`
	HeadUserID     *uuid.UUID `db:"head_user_id" json:"head_user_id,omitempty"`
	CostCenter     *string    `db:"cost_center" json:"cost_center,omitempty"`
	Location       *string    `db:"location" json:"location,omitempty"`
	HeadcountCap   *int       `db:"headcount_cap" json:"headcount_cap,omitempty"`
	Active         bool       `db:"active" json:"active"`
	CreatedAt      time.Time  `db:"created_at" json:"created_at"`
	UpdatedAt      time.Time  `db:"updated_at" json:"updated_at"`
	DeletedAt      *time.Time `db:"deleted_at" json:"deleted_at,omitempty"`
}

// Status returns a stable enum derived from the active flag.
func (d *Department) Status() DeptStatus {
	if d.Active && d.DeletedAt == nil {
		return DeptStatusActive
	}
	return DeptStatusArchived
}

// IsRoot reports whether the department has no parent.
func (d *Department) IsRoot() bool {
	return d.ParentID == nil
}

// ComputedDepth returns the depth inferred from the ltree path (0-based).
func (d *Department) ComputedDepth() int {
	return PathDepth(d.Path)
}

// Validate verifies required fields.
func (d *Department) Validate() error {
	fields := map[string]string{}
	if strings.TrimSpace(d.NameTR) == "" {
		fields["name_tr"] = "required"
	} else if len(d.NameTR) > 200 {
		fields["name_tr"] = "max 200 chars"
	}
	if strings.TrimSpace(d.Code) == "" {
		fields["code"] = "required"
	} else if err := ValidateCode(d.Code); err != nil {
		fields["code"] = err.Error()
	}
	if d.Path == "" {
		fields["path"] = "required"
	} else if !IsValidLtreePath(d.Path) {
		fields["path"] = "invalid ltree path"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// labelRe matches a single ltree label: alphanumeric + underscore, starting with a letter.
var labelRe = regexp.MustCompile(`^[a-z][a-z0-9_]{0,62}$`)

// codeRe matches a department/position code: lowercase alphanum + underscore/hyphen.
var codeRe = regexp.MustCompile(`^[a-z0-9][a-z0-9_-]{0,38}[a-z0-9]$`)

// ValidateCode validates a department/position code (2-40 chars, slug-style).
func ValidateCode(code string) error {
	code = strings.TrimSpace(code)
	if len(code) < 2 || len(code) > 40 {
		return ErrValidation
	}
	if !codeRe.MatchString(code) {
		return ErrValidation
	}
	return nil
}

// IsValidLtreePath reports whether s is a valid dotted ltree path.
func IsValidLtreePath(s string) bool {
	if s == "" {
		return false
	}
	parts := strings.Split(s, ".")
	for _, p := range parts {
		if !labelRe.MatchString(p) {
			return false
		}
	}
	return true
}

// PathDepth returns the 0-based depth of an ltree path (root = 0).
func PathDepth(path string) int {
	if path == "" {
		return 0
	}
	return strings.Count(path, ".")
}

// BuildPath appends a code label to a parent path. If parentPath is empty,
// the returned path is just the sanitized label.
func BuildPath(parentPath, code string) string {
	label := CodeToLabel(code)
	if parentPath == "" {
		return label
	}
	return parentPath + "." + label
}

// CodeToLabel converts a user-supplied code into a valid ltree label.
// ltree labels allow only [A-Za-z0-9_]; we lowercase and replace hyphens
// with underscores.
func CodeToLabel(code string) string {
	s := strings.ToLower(strings.TrimSpace(code))
	s = strings.ReplaceAll(s, "-", "_")
	// Strip any invalid characters defensively.
	var b strings.Builder
	for i, r := range s {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') || r == '_' {
			// first char must be a letter
			if i == 0 && r >= '0' && r <= '9' {
				b.WriteRune('_')
			}
			b.WriteRune(r)
		}
	}
	out := b.String()
	if out == "" {
		return "x"
	}
	if out[0] >= '0' && out[0] <= '9' {
		out = "_" + out
	}
	return out
}

// MoveSubpath recomputes a descendant path when its subtree is moved.
// Given the old subtree root path, new subtree root path, and a descendant
// path, return the new descendant path.
//
//	MoveSubpath("a.b", "x.y", "a.b.c.d") => "x.y.c.d"
func MoveSubpath(oldRoot, newRoot, descendant string) string {
	if descendant == oldRoot {
		return newRoot
	}
	prefix := oldRoot + "."
	if !strings.HasPrefix(descendant, prefix) {
		return descendant
	}
	rest := descendant[len(prefix):]
	return newRoot + "." + rest
}

// IsAncestorPath reports whether ancestor path is a proper prefix of descendant.
func IsAncestorPath(ancestor, descendant string) bool {
	if ancestor == descendant || ancestor == "" {
		return false
	}
	return strings.HasPrefix(descendant, ancestor+".")
}
