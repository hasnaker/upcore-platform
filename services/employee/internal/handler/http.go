// Package handler exposes HTTP handlers for the employee service.
package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
	"github.com/rs/zerolog"

	"github.com/upcore/employee/internal/domain"
)

// Dependencies bundles common handler deps.
type Dependencies struct {
	Log       zerolog.Logger
	Validator *validator.Validate
}

// NewValidator returns a configured validator.
func NewValidator() *validator.Validate {
	return validator.New(validator.WithRequiredStructEnabled())
}

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
	var vErr validator.ValidationErrors
	if errors.As(err, &vErr) {
		fields := map[string]string{}
		for _, fe := range vErr {
			fields[strings.ToLower(fe.Field())] = fe.Tag()
		}
		return http.StatusUnprocessableEntity, ErrorResponse{Error: "validation_error", Fields: fields}
	}
	switch {
	case errors.Is(err, domain.ErrEmployeeNotFound),
		errors.Is(err, domain.ErrContactNotFound),
		errors.Is(err, domain.ErrHistoryNotFound),
		errors.Is(err, domain.ErrManagerNotFound),
		errors.Is(err, domain.ErrOfferNotFound),
		errors.Is(err, domain.ErrOnboardingNotFound),
		errors.Is(err, domain.ErrOnboardingTaskNotFound),
		errors.Is(err, domain.ErrCareerEventNotFound),
		errors.Is(err, domain.ErrCompensationNotFound),
		errors.Is(err, domain.ErrRelatedContactNotFound),
		errors.Is(err, domain.ErrOffboardingNotFound),
		errors.Is(err, domain.ErrExitInterviewNotFound),
		errors.Is(err, domain.ErrNotFound):
		return http.StatusNotFound, ErrorResponse{Error: "not_found", Message: err.Error()}
	case errors.Is(err, domain.ErrDuplicateEmployeeNo),
		errors.Is(err, domain.ErrDuplicateTCKN),
		errors.Is(err, domain.ErrDuplicateExternalID),
		errors.Is(err, domain.ErrConflict),
		errors.Is(err, domain.ErrAlreadyTerminated),
		errors.Is(err, domain.ErrOfferAlreadyDecided),
		errors.Is(err, domain.ErrOfferExpired),
		errors.Is(err, domain.ErrOnboardingExists),
		errors.Is(err, domain.ErrOnboardingClosed),
		errors.Is(err, domain.ErrOffboardingExists),
		errors.Is(err, domain.ErrExitInterviewExists):
		return http.StatusConflict, ErrorResponse{Error: "conflict", Message: err.Error()}
	case errors.Is(err, domain.ErrInvalidTCKN),
		errors.Is(err, domain.ErrInvalidIBAN),
		errors.Is(err, domain.ErrInvalidEmail),
		errors.Is(err, domain.ErrInvalidDate),
		errors.Is(err, domain.ErrInvalidStatus),
		errors.Is(err, domain.ErrInvalidType),
		errors.Is(err, domain.ErrInvalidTransition),
		errors.Is(err, domain.ErrTerminationDate),
		errors.Is(err, domain.ErrManagerCycle),
		errors.Is(err, domain.ErrOfferInvalidStatus),
		errors.Is(err, domain.ErrOfferNotSent),
		errors.Is(err, domain.ErrUnknownTemplate),
		errors.Is(err, domain.ErrEmployeePositionInvalid),
		errors.Is(err, domain.ErrValidation):
		return http.StatusUnprocessableEntity, ErrorResponse{Error: "validation_error", Message: err.Error()}
	case errors.Is(err, domain.ErrCSVTooLarge):
		return http.StatusRequestEntityTooLarge, ErrorResponse{Error: "file_too_large", Message: err.Error()}
	case errors.Is(err, domain.ErrCSVTooManyRows),
		errors.Is(err, domain.ErrCSVInvalidSchema):
		return http.StatusUnprocessableEntity, ErrorResponse{Error: "csv_error", Message: err.Error()}
	case errors.Is(err, domain.ErrForbidden):
		return http.StatusForbidden, ErrorResponse{Error: "forbidden", Message: err.Error()}
	case errors.Is(err, domain.ErrUnauthorized):
		return http.StatusUnauthorized, ErrorResponse{Error: "unauthorized", Message: err.Error()}
	}
	return http.StatusInternalServerError, ErrorResponse{Error: "internal_error", Message: "unexpected error"}
}
