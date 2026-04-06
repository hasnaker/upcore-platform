package domain

import (
	"crypto/sha256"
	"database/sql"
	"database/sql/driver"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// DocumentVersion represents a single stored revision. Mapped to
// `app.document_versions`.
type DocumentVersion struct {
	ID               uuid.UUID  `db:"id" json:"id"`
	TenantID         uuid.UUID  `db:"tenant_id" json:"tenant_id"`
	DocumentID       uuid.UUID  `db:"document_id" json:"document_id"`
	Version          int        `db:"version" json:"version"`
	StorageProvider  string     `db:"storage_provider" json:"storage_provider"`
	StorageContainer string     `db:"storage_container" json:"storage_container"`
	StorageKey       string     `db:"storage_key" json:"storage_key"`
	MimeType         string     `db:"mime_type" json:"mime_type"`
	SizeBytes        int64      `db:"size_bytes" json:"size_bytes"`
	ChecksumSHA256   *string    `db:"checksum_sha256" json:"checksum_sha256,omitempty"`
	UploadedBy       *uuid.UUID `db:"uploaded_by" json:"uploaded_by,omitempty"`
	UploadedAt       time.Time  `db:"uploaded_at" json:"uploaded_at"`
	Notes            *string    `db:"notes" json:"notes,omitempty"`
}

// Validate checks version invariants.
func (v *DocumentVersion) Validate() error {
	fields := map[string]string{}
	if v.DocumentID == uuid.Nil {
		fields["document_id"] = "required"
	}
	if v.TenantID == uuid.Nil {
		fields["tenant_id"] = "required"
	}
	if v.Version < 1 {
		fields["version"] = "must be >= 1"
	}
	if v.StorageKey == "" {
		fields["storage_key"] = "required"
	}
	if v.MimeType == "" {
		fields["mime_type"] = "required"
	}
	if v.SizeBytes < 0 {
		fields["size_bytes"] = "must be >= 0"
	}
	if v.ChecksumSHA256 != nil && len(*v.ChecksumSHA256) != 64 {
		fields["checksum_sha256"] = "must be 64 hex chars"
	}
	if len(fields) > 0 {
		return NewValidationError(fields)
	}
	return nil
}

// ComputeChecksum reads r fully, writing to w while computing its SHA-256 hash.
// Returns the hex digest and the total bytes streamed.
func ComputeChecksum(r io.Reader, w io.Writer) (string, int64, error) {
	h := sha256.New()
	var total int64
	buf := make([]byte, 64*1024)
	for {
		n, err := r.Read(buf)
		if n > 0 {
			h.Write(buf[:n])
			if w != nil {
				if _, werr := w.Write(buf[:n]); werr != nil {
					return "", total, werr
				}
			}
			total += int64(n)
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			return "", total, err
		}
	}
	return hex.EncodeToString(h.Sum(nil)), total, nil
}

// ComputeChecksumBytes returns the hex SHA-256 over an in-memory buffer.
func ComputeChecksumBytes(b []byte) string {
	sum := sha256.Sum256(b)
	return hex.EncodeToString(sum[:])
}

// VerifyChecksum compares expected and computed checksums in constant-ish time.
func VerifyChecksum(expected, actual string) error {
	if strings.EqualFold(expected, actual) {
		return nil
	}
	return ErrChecksumMismatch
}

// -----------------------------------------------------------------------------
// Custom DB types
// -----------------------------------------------------------------------------

// StringArr is a []string that maps to PostgreSQL text[].
type StringArr []string

// Scan implements sql.Scanner for pq.StringArray.
func (s *StringArr) Scan(v any) error {
	var arr pq.StringArray
	if err := arr.Scan(v); err != nil {
		return err
	}
	*s = StringArr(arr)
	return nil
}

// Value implements driver.Valuer.
func (s StringArr) Value() (driver.Value, error) {
	return pq.StringArray(s).Value()
}

// JSONMap maps to JSONB/JSON columns.
type JSONMap map[string]any

// Scan implements sql.Scanner for jsonb.
func (m *JSONMap) Scan(v any) error {
	if v == nil {
		*m = JSONMap{}
		return nil
	}
	var raw []byte
	switch val := v.(type) {
	case []byte:
		raw = val
	case string:
		raw = []byte(val)
	default:
		return fmt.Errorf("JSONMap: unsupported scan type %T", v)
	}
	if len(raw) == 0 {
		*m = JSONMap{}
		return nil
	}
	out := JSONMap{}
	if err := json.Unmarshal(raw, &out); err != nil {
		return fmt.Errorf("JSONMap decode: %w", err)
	}
	*m = out
	return nil
}

// Value implements driver.Valuer producing a JSON byte slice.
func (m JSONMap) Value() (driver.Value, error) {
	if m == nil {
		return []byte("{}"), nil
	}
	return json.Marshal(m)
}

// Ensure types satisfy interfaces at compile time.
var (
	_ sql.Scanner   = (*StringArr)(nil)
	_ driver.Valuer = StringArr{}
	_ sql.Scanner   = (*JSONMap)(nil)
	_ driver.Valuer = JSONMap{}
)
