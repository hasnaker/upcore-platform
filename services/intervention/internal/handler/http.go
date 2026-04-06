package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"

	"github.com/upcore/intervention/internal/domain"
)

// ErrorResponse is the uniform error payload.
type ErrorResponse struct {
	Error   string            `json:"error"`
	Message string            `json:"message,omitempty"`
	Fields  map[string]string `json:"fields,omitempty"`
}

// WriteJSON writes v as JSON with the given status code.
func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v == nil {
		return
	}
	_ = json.NewEncoder(w).Encode(v)
}

// WriteError writes a structured error response.
func WriteError(w http.ResponseWriter, status int, code, message string) {
	WriteJSON(w, status, ErrorResponse{Error: code, Message: message})
}

// WriteServerError writes a 500 response.
func WriteServerError(w http.ResponseWriter, err error) {
	WriteJSON(w, http.StatusInternalServerError, ErrorResponse{
		Error:   "internal_error",
		Message: "unexpected error",
	})
}

// WriteDomainError maps domain errors to HTTP status codes.
func WriteDomainError(w http.ResponseWriter, err error) {
	if err == nil {
		return
	}
	var ve *domain.ValidationError
	if errors.As(err, &ve) {
		WriteJSON(w, http.StatusUnprocessableEntity, ErrorResponse{
			Error:  "validation_error",
			Fields: ve.Fields,
		})
		return
	}
	switch {
	case errors.Is(err, domain.ErrInterventionNotFound),
		errors.Is(err, domain.ErrAssignmentNotFound),
		errors.Is(err, domain.ErrOutcomeNotFound),
		errors.Is(err, domain.ErrPosteriorNotFound),
		errors.Is(err, domain.ErrNotFound):
		WriteError(w, http.StatusNotFound, "not_found", err.Error())
	case errors.Is(err, domain.ErrCodeTaken),
		errors.Is(err, domain.ErrConflict),
		errors.Is(err, domain.ErrAlreadyConsented),
		errors.Is(err, domain.ErrOutcomeExists):
		WriteError(w, http.StatusConflict, "conflict", err.Error())
	case errors.Is(err, domain.ErrInvalidStatus),
		errors.Is(err, domain.ErrConsentRequired),
		errors.Is(err, domain.ErrAssignmentTerminal),
		errors.Is(err, domain.ErrInvalidEvidenceTier),
		errors.Is(err, domain.ErrInvalidCategory),
		errors.Is(err, domain.ErrInvalidDeliveryMode),
		errors.Is(err, domain.ErrInvalidBATScore),
		errors.Is(err, domain.ErrMissingPreScore),
		errors.Is(err, domain.ErrMissingPostScore),
		errors.Is(err, domain.ErrValidation):
		WriteError(w, http.StatusUnprocessableEntity, "validation_error", err.Error())
	case errors.Is(err, domain.ErrForbidden):
		WriteError(w, http.StatusForbidden, "forbidden", err.Error())
	case errors.Is(err, domain.ErrUnauthorized):
		WriteError(w, http.StatusUnauthorized, "unauthorized", err.Error())
	default:
		WriteServerError(w, err)
	}
}

// DecodeJSON reads a JSON body with a 2MB limit.
func DecodeJSON(r *http.Request, v any) error {
	r.Body = http.MaxBytesReader(nil, r.Body, 2<<20)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(v)
}

// ParseUUID extracts a UUID string and writes a 400 on failure.
func ParseUUID(w http.ResponseWriter, s string) (uuid.UUID, bool) {
	id, err := uuid.Parse(s)
	if err != nil {
		WriteError(w, http.StatusBadRequest, "bad_request", "invalid uuid")
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

// ParseUUIDQuery returns a *uuid.UUID from a query param or nil.
func ParseUUIDQuery(r *http.Request, name string) *uuid.UUID {
	s := strings.TrimSpace(r.URL.Query().Get(name))
	if s == "" {
		return nil
	}
	id, err := uuid.Parse(s)
	if err != nil {
		return nil
	}
	return &id
}
