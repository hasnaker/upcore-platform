package handler

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Cursor is the decoded keyset pagination cursor: (timestamp, id).
// Wire format: base64url("<RFC3339Nano>|<uuid>").
type Cursor struct {
	CreatedAt time.Time
	ID        uuid.UUID
}

// EncodeCursor returns the opaque cursor for a row's (ts, id).
func EncodeCursor(ts time.Time, id uuid.UUID) string {
	raw := ts.UTC().Format(time.RFC3339Nano) + "|" + id.String()
	return base64.RawURLEncoding.EncodeToString([]byte(raw))
}

// DecodeCursor decodes a cursor; empty string returns (nil, nil).
func DecodeCursor(s string) (*Cursor, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil, nil
	}
	b, err := base64.RawURLEncoding.DecodeString(s)
	if err != nil {
		b, err = base64.StdEncoding.DecodeString(s)
		if err != nil {
			return nil, fmt.Errorf("invalid cursor: %w", err)
		}
	}
	parts := strings.SplitN(string(b), "|", 2)
	if len(parts) != 2 {
		return nil, fmt.Errorf("invalid cursor shape")
	}
	ts, err := time.Parse(time.RFC3339Nano, parts[0])
	if err != nil {
		return nil, fmt.Errorf("invalid cursor timestamp: %w", err)
	}
	id, err := uuid.Parse(parts[1])
	if err != nil {
		return nil, fmt.Errorf("invalid cursor id: %w", err)
	}
	return &Cursor{CreatedAt: ts, ID: id}, nil
}

// ParseCursorQuery extracts ?cursor=; writes 400 on malformed input.
func ParseCursorQuery(w http.ResponseWriter, r *http.Request) (*Cursor, bool) {
	c, err := DecodeCursor(r.URL.Query().Get("cursor"))
	if err != nil {
		WriteErr(w, http.StatusBadRequest, "bad_cursor", err.Error())
		return nil, false
	}
	return c, true
}

// ParseLimit pulls ?limit with a fallback + hard ceiling.
func ParseLimit(r *http.Request, fallback, ceiling int) int {
	s := strings.TrimSpace(r.URL.Query().Get("limit"))
	if s == "" {
		return fallback
	}
	v, err := strconv.Atoi(s)
	if err != nil || v <= 0 {
		return fallback
	}
	if v > ceiling {
		return ceiling
	}
	return v
}
