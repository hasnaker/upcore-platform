// Package handler exposes HTTP handlers for the notification service.
package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"

	"github.com/upcore/notification/internal/domain"
)

// ErrorResponse is the uniform error payload.
type ErrorResponse struct {
	Error   string            `json:"error"`
	Message string            `json:"message,omitempty"`
	Fields  map[string]string `json:"fields,omitempty"`
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

	var ve *domain.ValidationError
	if errors.As(err, &ve) {
		return http.StatusUnprocessableEntity, ErrorResponse{
			Error:  "validation_error",
			Fields: ve.Fields,
		}
	}

	switch {
	case errors.Is(err, domain.ErrNotFound),
		errors.Is(err, domain.ErrTemplateNotFound),
		errors.Is(err, domain.ErrNotificationNotFound),
		errors.Is(err, domain.ErrPreferenceNotFound):
		return http.StatusNotFound, ErrorResponse{Error: "not_found", Message: err.Error()}
	case errors.Is(err, domain.ErrConflict):
		return http.StatusConflict, ErrorResponse{Error: "conflict", Message: err.Error()}
	case errors.Is(err, domain.ErrValidation),
		errors.Is(err, domain.ErrInvalidChannel),
		errors.Is(err, domain.ErrInvalidStatus),
		errors.Is(err, domain.ErrInvalidPriority),
		errors.Is(err, domain.ErrMissingRecipient),
		errors.Is(err, domain.ErrMissingTemplateVar):
		return http.StatusUnprocessableEntity, ErrorResponse{Error: "validation_error", Message: err.Error()}
	case errors.Is(err, domain.ErrEmailSuppressed):
		return http.StatusUnprocessableEntity, ErrorResponse{Error: "email_suppressed", Message: err.Error()}
	case errors.Is(err, domain.ErrOptedOut):
		return http.StatusUnprocessableEntity, ErrorResponse{Error: "opted_out", Message: err.Error()}
	case errors.Is(err, domain.ErrRateLimitExceeded):
		return http.StatusTooManyRequests, ErrorResponse{Error: "rate_limit_exceeded", Message: err.Error()}
	case errors.Is(err, domain.ErrTemplateRenderFailed):
		return http.StatusUnprocessableEntity, ErrorResponse{Error: "template_error", Message: err.Error()}
	case errors.Is(err, domain.ErrChannelUnavailable),
		errors.Is(err, domain.ErrProviderError):
		return http.StatusBadGateway, ErrorResponse{Error: "channel_error", Message: err.Error()}
	case errors.Is(err, domain.ErrWebhookSignature):
		return http.StatusUnauthorized, ErrorResponse{Error: "invalid_signature", Message: err.Error()}
	case errors.Is(err, domain.ErrUnauthorized):
		return http.StatusUnauthorized, ErrorResponse{Error: "unauthorized", Message: err.Error()}
	case errors.Is(err, domain.ErrForbidden):
		return http.StatusForbidden, ErrorResponse{Error: "forbidden", Message: err.Error()}
	}
	return http.StatusInternalServerError, ErrorResponse{Error: "internal_error", Message: "unexpected error"}
}
