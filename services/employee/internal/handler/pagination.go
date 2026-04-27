package handler

import (
	"encoding/base64"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Cursor carries (created_at, id) tuple for keyset pagination.
//
// Wire format: base64url("<RFC3339Nano>|<uuid>"). Opaque to clients.
type Cursor struct {
	CreatedAt time.Time
	ID        uuid.UUID
}

// EncodeCursor returns the base64 cursor string for (ts, id).
func EncodeCursor(ts time.Time, id uuid.UUID) string {
	raw := ts.UTC().Format(time.RFC3339Nano) + "|" + id.String()
	return base64.RawURLEncoding.EncodeToString([]byte(raw))
}

// DecodeCursor parses a base64 cursor. Returns (nil, nil) when s is empty so
// handlers can pass query params straight through.
func DecodeCursor(s string) (*Cursor, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil, nil
	}
	b, err := base64.RawURLEncoding.DecodeString(s)
	if err != nil {
		// Accept padded base64 for older clients.
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

// ParseCursorQuery extracts ?cursor= and returns the decoded cursor (may be nil).
// On malformed input, writes 400 and returns ok=false.
func ParseCursorQuery(w http.ResponseWriter, r *http.Request) (*Cursor, bool) {
	c, err := DecodeCursor(r.URL.Query().Get("cursor"))
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{
			Error:   "bad_request",
			Message: err.Error(),
		})
		return nil, false
	}
	return c, true
}
