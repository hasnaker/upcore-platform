package service

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
)

// UUIDArray is a tiny custom scanner/valuer for pg uuid[] columns. We avoid
// pulling pq.Array into every call site and keep the JSON marshalling clean
// (JSON serialises as a plain string array).
type UUIDArray []uuid.UUID

// Value implements driver.Valuer — encodes as Postgres array literal.
func (a UUIDArray) Value() (driver.Value, error) {
	if a == nil {
		return "{}", nil
	}
	parts := make([]string, len(a))
	for i, id := range a {
		parts[i] = id.String()
	}
	return "{" + strings.Join(parts, ",") + "}", nil
}

// Scan implements sql.Scanner for text/uuid[] representations.
func (a *UUIDArray) Scan(src any) error {
	if src == nil {
		*a = UUIDArray{}
		return nil
	}
	var s string
	switch v := src.(type) {
	case string:
		s = v
	case []byte:
		s = string(v)
	default:
		return fmt.Errorf("UUIDArray: unsupported type %T", src)
	}
	s = strings.TrimSpace(s)
	if s == "" || s == "{}" {
		*a = UUIDArray{}
		return nil
	}
	if !strings.HasPrefix(s, "{") || !strings.HasSuffix(s, "}") {
		return errors.New("UUIDArray: malformed array literal")
	}
	body := s[1 : len(s)-1]
	if body == "" {
		*a = UUIDArray{}
		return nil
	}
	items := strings.Split(body, ",")
	out := make(UUIDArray, 0, len(items))
	for _, raw := range items {
		raw = strings.Trim(raw, `" `)
		if raw == "" || raw == "NULL" {
			continue
		}
		id, err := uuid.Parse(raw)
		if err != nil {
			return fmt.Errorf("UUIDArray: parse %q: %w", raw, err)
		}
		out = append(out, id)
	}
	*a = out
	return nil
}

// MarshalJSON always returns a plain string array; never null so the API
// shape is stable for clients.
func (a UUIDArray) MarshalJSON() ([]byte, error) {
	if a == nil {
		return []byte("[]"), nil
	}
	out := make([]string, len(a))
	for i, id := range a {
		out[i] = id.String()
	}
	return json.Marshal(out)
}

// UnmarshalJSON accepts the standard JSON array form or null.
func (a *UUIDArray) UnmarshalJSON(data []byte) error {
	if string(data) == "null" {
		*a = UUIDArray{}
		return nil
	}
	var raw []string
	if err := json.Unmarshal(data, &raw); err != nil {
		return err
	}
	out := make(UUIDArray, 0, len(raw))
	for _, s := range raw {
		id, err := uuid.Parse(s)
		if err != nil {
			return err
		}
		out = append(out, id)
	}
	*a = out
	return nil
}
