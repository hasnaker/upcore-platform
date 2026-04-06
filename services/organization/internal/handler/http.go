package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/rs/zerolog"

	"github.com/upcore/organization/internal/domain"
)

// Dependencies aggregates deps injected into handlers.
type Dependencies struct {
	Log       zerolog.Logger
	Validator *validator.Validate
}

// NewValidator creates a validator with tag-name registration.
func NewValidator() *validator.Validate {
	return validator.New(validator.WithRequiredStructEnabled())
}

// ErrorResponse is the uniform error payload.
type ErrorResponse struct {
	Error   string            `json:"error"`
	Message string            `json:"message,omitempty"`
	Fields  map[string]string `json:"fields,omitempty"`
}

// WriteJSON writes a JSON response with the given status.
func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v == nil {
		return
	}
	_ = json.NewEncoder(w).Encode(v)
}

// WriteError writes an error response and maps domain errors to HTTP statuses.
func WriteError(w http.ResponseWriter, err error) {
	status, resp := mapError(err)
	WriteJSON(w, status, resp)
}

// DecodeJSON reads a JSON body, enforcing a size limit of 1MB.
func DecodeJSON(r *http.Request, v any) error {
	r.Body = http.MaxBytesReader(nil, r.Body, 1<<20)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	return dec.Decode(v)
}

func mapError(err error) (int, ErrorResponse) {
	if err == nil {
		return http.StatusOK, ErrorResponse{}
	}
	var ve *domain.ValidationError
	if errors.As(err, &ve) {
		return http.StatusUnprocessableEntity, ErrorResponse{Error: "validation_error", Fields: ve.Fields}
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
	case errors.Is(err, domain.ErrDuplicateCode):
		return http.StatusConflict, ErrorResponse{Error: "duplicate_code", Message: err.Error()}
	case errors.Is(err, domain.ErrDepartmentNotFound),
		errors.Is(err, domain.ErrPositionNotFound),
		errors.Is(err, domain.ErrTeamNotFound),
		errors.Is(err, domain.ErrReportingNotFound),
		errors.Is(err, domain.ErrNotFound):
		return http.StatusNotFound, ErrorResponse{Error: "not_found", Message: err.Error()}
	case errors.Is(err, domain.ErrCycleDetected),
		errors.Is(err, domain.ErrManagerCycle),
		errors.Is(err, domain.ErrDepartmentHasChildren),
		errors.Is(err, domain.ErrPositionInUse),
		errors.Is(err, domain.ErrConflict),
		errors.Is(err, domain.ErrAlreadyArchived):
		return http.StatusConflict, ErrorResponse{Error: "conflict", Message: err.Error()}
	case errors.Is(err, domain.ErrMaxDepthExceeded),
		errors.Is(err, domain.ErrInvalidPath),
		errors.Is(err, domain.ErrInvalidJDRScore),
		errors.Is(err, domain.ErrSelfManager),
		errors.Is(err, domain.ErrValidation):
		return http.StatusUnprocessableEntity, ErrorResponse{Error: "validation_error", Message: err.Error()}
	case errors.Is(err, domain.ErrUnauthorized):
		return http.StatusUnauthorized, ErrorResponse{Error: "unauthorized", Message: err.Error()}
	case errors.Is(err, domain.ErrForbidden):
		return http.StatusForbidden, ErrorResponse{Error: "forbidden", Message: err.Error()}
	}
	return http.StatusInternalServerError, ErrorResponse{Error: "internal_error", Message: "unexpected error"}
}
