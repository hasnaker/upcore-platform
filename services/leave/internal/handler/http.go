package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/rs/zerolog"

	"github.com/upcore/leave/internal/domain"
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

// WriteJSON writes a JSON response.
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

// DecodeJSON reads a JSON body (1MB max).
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
	case errors.Is(err, domain.ErrLeaveTypeNotFound),
		errors.Is(err, domain.ErrLeaveRequestNotFound),
		errors.Is(err, domain.ErrLeaveBalanceNotFound),
		errors.Is(err, domain.ErrNotFound):
		return http.StatusNotFound, ErrorResponse{Error: "not_found", Message: err.Error()}
	case errors.Is(err, domain.ErrInsufficientBalance):
		return http.StatusConflict, ErrorResponse{Error: "insufficient_balance", Message: err.Error()}
	case errors.Is(err, domain.ErrOverlappingRequest):
		return http.StatusConflict, ErrorResponse{Error: "overlap_detected", Message: err.Error()}
	case errors.Is(err, domain.ErrCannotCancel), errors.Is(err, domain.ErrCannotUpdate),
		errors.Is(err, domain.ErrRequestAlreadyHandled), errors.Is(err, domain.ErrInvalidStatus):
		return http.StatusConflict, ErrorResponse{Error: "invalid_state", Message: err.Error()}
	case errors.Is(err, domain.ErrDocumentRequired), errors.Is(err, domain.ErrInvalidDateRange),
		errors.Is(err, domain.ErrTenureTooLow), errors.Is(err, domain.ErrCarryOverCapExceeded),
		errors.Is(err, domain.ErrAccrualNotConfigured), errors.Is(err, domain.ErrValidation):
		return http.StatusUnprocessableEntity, ErrorResponse{Error: "validation_error", Message: err.Error()}
	case errors.Is(err, domain.ErrSelfApproval), errors.Is(err, domain.ErrWrongApprover),
		errors.Is(err, domain.ErrForbidden), errors.Is(err, domain.ErrInvalidTenantScope):
		return http.StatusForbidden, ErrorResponse{Error: "forbidden", Message: err.Error()}
	case errors.Is(err, domain.ErrUnauthorized):
		return http.StatusUnauthorized, ErrorResponse{Error: "unauthorized", Message: err.Error()}
	case errors.Is(err, domain.ErrConflict):
		return http.StatusConflict, ErrorResponse{Error: "conflict", Message: err.Error()}
	}
	return http.StatusInternalServerError, ErrorResponse{Error: "internal_error", Message: "unexpected error"}
}
