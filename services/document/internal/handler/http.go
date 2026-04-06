package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/go-playground/validator/v10"
	"github.com/rs/zerolog"

	"github.com/upcore/document/internal/domain"
	"github.com/upcore/document/internal/esignature"
	"github.com/upcore/document/internal/storage"
)

// Dependencies aggregates deps injected into HTTP handlers.
type Dependencies struct {
	Log       zerolog.Logger
	Validator *validator.Validate
}

// NewValidator builds a go-playground validator.
func NewValidator() *validator.Validate {
	return validator.New(validator.WithRequiredStructEnabled())
}

// ErrorResponse is the uniform JSON error payload.
type ErrorResponse struct {
	Error   string            `json:"error"`
	Message string            `json:"message,omitempty"`
	Fields  map[string]string `json:"fields,omitempty"`
}

// WriteJSON writes v as JSON with the given status.
func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v == nil {
		return
	}
	_ = json.NewEncoder(w).Encode(v)
}

// WriteError maps err → HTTP status and writes it.
func WriteError(w http.ResponseWriter, err error) {
	status, resp := mapError(err)
	WriteJSON(w, status, resp)
}

// DecodeJSON reads a JSON request body, enforcing a small size cap.
func DecodeJSON(r *http.Request, v any) error {
	r.Body = http.MaxBytesReader(nil, r.Body, 1<<20)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(v); err != nil {
		return err
	}
	return nil
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
	case errors.Is(err, domain.ErrDocumentNotFound),
		errors.Is(err, domain.ErrVersionNotFound),
		errors.Is(err, domain.ErrSignatureNotFound),
		errors.Is(err, domain.ErrNotFound),
		errors.Is(err, storage.ErrBlobNotFound),
		errors.Is(err, esignature.ErrSessionNotFound):
		return http.StatusNotFound, ErrorResponse{Error: "not_found", Message: err.Error()}
	case errors.Is(err, domain.ErrFileTooLarge):
		return http.StatusRequestEntityTooLarge, ErrorResponse{Error: "too_large", Message: err.Error()}
	case errors.Is(err, domain.ErrUnsupportedMimeType):
		return http.StatusUnsupportedMediaType, ErrorResponse{Error: "unsupported_type", Message: err.Error()}
	case errors.Is(err, domain.ErrEmptyFile),
		errors.Is(err, domain.ErrInvalidDocumentType),
		errors.Is(err, domain.ErrInvalidSignProvider),
		errors.Is(err, domain.ErrValidation),
		errors.Is(err, domain.ErrChecksumMismatch):
		return http.StatusUnprocessableEntity, ErrorResponse{Error: "validation_error", Message: err.Error()}
	case errors.Is(err, domain.ErrSignatureNotPending),
		errors.Is(err, domain.ErrInvalidSignStatus),
		errors.Is(err, domain.ErrAlreadyDeleted):
		return http.StatusConflict, ErrorResponse{Error: "conflict", Message: err.Error()}
	case errors.Is(err, domain.ErrForbidden),
		errors.Is(err, domain.ErrTenantMismatch):
		return http.StatusForbidden, ErrorResponse{Error: "forbidden", Message: err.Error()}
	case errors.Is(err, domain.ErrUnauthorized):
		return http.StatusUnauthorized, ErrorResponse{Error: "unauthorized", Message: err.Error()}
	}
	return http.StatusInternalServerError, ErrorResponse{Error: "internal_error", Message: "unexpected error"}
}
