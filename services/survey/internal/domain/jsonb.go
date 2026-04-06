package domain

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
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
