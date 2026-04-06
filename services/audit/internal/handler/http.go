// Package handler exposes HTTP handlers for the audit service.
package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/audit/internal/domain"
)

// Dependencies bundles common handler deps.
type Dependencies struct {
	Log zerolog.Logger
}

// ErrorResponse is the uniform error payload.
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message,omitempty"`
}

// WriteJSON writes v as JSON.
func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v == nil {
		return
	}
	_ = json.NewEncoder(w).Encode(v)
}

// WriteError writes an error response with a mapped HTTP status.
func WriteError(w http.ResponseWriter, err error) {
	status, resp := mapError(err)
	WriteJSON(w, status, resp)
}

// DecodeJSON reads a JSON body with a 2MB limit.
func DecodeJSON(r *http.Request, v any) error {
	r.Body = http.MaxBytesReader(nil, r.Body, 2<<20)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(v)
}

// ParseUUID extracts a UUID URL param and writes a 400 on failure.
func ParseUUID(w http.ResponseWriter, s string) (uuid.UUID, bool) {
	id, err := uuid.Parse(s)
	if err != nil {
		WriteJSON(w, http.StatusBadRequest, ErrorResponse{Error: "bad_request", Message: "invalid uuid"})
		return uuid.Nil, false
	}
	return id, true
}

// ParseIntQuery returns the named query int or fallback.
func ParseIntQuery(r *http.Request, name string, fallback int) int {
	s := strings.TrimSpace(r.URL.Query().Get(name))
	if s == "" {
		return fallback
	}
	v, err := strconv.Atoi(s)
	if err != nil || v < 0 {
		return fallback
	}
	return v
}

func mapError(err error) (int, ErrorResponse) {
	if err == nil {
		return http.StatusOK, ErrorResponse{}
	}
	switch {
	case errors.Is(err, domain.ErrEventNotFound),
		errors.Is(err, domain.ErrDSRNotFound),
		errors.Is(err, domain.ErrExportNotFound),
		errors.Is(err, domain.ErrNotFound):
		return http.StatusNotFound, ErrorResponse{Error: "not_found", Message: err.Error()}
	case errors.Is(err, domain.ErrInvalidInput),
		errors.Is(err, domain.ErrInvalidLegalBasis),
		errors.Is(err, domain.ErrInvalidDSRType),
		errors.Is(err, domain.ErrInvalidDSRStatus),
		errors.Is(err, domain.ErrInvalidTransition):
		return http.StatusUnprocessableEntity, ErrorResponse{Error: "validation_error", Message: err.Error()}
	case errors.Is(err, domain.ErrImmutable):
		return http.StatusConflict, ErrorResponse{Error: "immutable", Message: err.Error()}
	case errors.Is(err, domain.ErrDSRAlreadyCompleted):
		return http.StatusConflict, ErrorResponse{Error: "already_completed", Message: err.Error()}
	case errors.Is(err, domain.ErrMissingTenantID):
		return http.StatusBadRequest, ErrorResponse{Error: "missing_tenant", Message: err.Error()}
	case errors.Is(err, domain.ErrUnauthorized):
		return http.StatusUnauthorized, ErrorResponse{Error: "unauthorized", Message: err.Error()}
	case errors.Is(err, domain.ErrForbidden):
		return http.StatusForbidden, ErrorResponse{Error: "forbidden", Message: err.Error()}
	case errors.Is(err, domain.ErrBackpressure):
		return http.StatusServiceUnavailable, ErrorResponse{Error: "backpressure", Message: err.Error()}
	}
	return http.StatusInternalServerError, ErrorResponse{Error: "internal_error", Message: "unexpected error"}
}
