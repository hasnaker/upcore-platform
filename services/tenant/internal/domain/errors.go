package domain

import "errors"

// Sentinel domain errors. Services wrap these for HTTP mapping.
var (
	ErrNotFound          = errors.New("not found")
	ErrConflict          = errors.New("conflict")
	ErrValidation        = errors.New("validation failed")
	ErrSlugTaken         = errors.New("slug already taken")
	ErrPlanNotFound      = errors.New("plan not found")
	ErrTenantNotFound    = errors.New("tenant not found")
	ErrSubscriptionNotFound = errors.New("subscription not found")
	ErrInvalidSlug       = errors.New("invalid slug: must be 3-60 chars, lowercase alphanumeric or hyphens")
	ErrInvalidEmail      = errors.New("invalid email")
	ErrInvalidVKN        = errors.New("invalid VKN (Turkish tax number)")
	ErrInvalidTCKN       = errors.New("invalid TCKN (Turkish national ID)")
	ErrSeatCapReached    = errors.New("seat cap reached for current plan")
	ErrTenantSuspended   = errors.New("tenant is suspended")
	ErrTenantDeleted     = errors.New("tenant is deleted")
	ErrAlreadyCanceled   = errors.New("subscription already canceled")
	ErrUnauthorized      = errors.New("unauthorized")
	ErrForbidden         = errors.New("forbidden")
)

// ValidationError aggregates multiple field errors.
type ValidationError struct {
	Fields map[string]string
}

func (e *ValidationError) Error() string {
	if e == nil || len(e.Fields) == 0 {
		return "validation failed"
	}
	return "validation failed"
}

// NewValidationError constructs a validation error from a field/message map.
func NewValidationError(fields map[string]string) *ValidationError {
	return &ValidationError{Fields: fields}
}
