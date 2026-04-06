package domain

import "errors"

// Sentinel domain errors. Services wrap these for HTTP mapping.
var (
	ErrNotFound              = errors.New("not found")
	ErrConflict              = errors.New("conflict")
	ErrValidation            = errors.New("validation failed")
	ErrInterventionNotFound  = errors.New("intervention not found")
	ErrAssignmentNotFound    = errors.New("assignment not found")
	ErrOutcomeNotFound       = errors.New("outcome not found")
	ErrPosteriorNotFound     = errors.New("posterior not found")
	ErrCodeTaken             = errors.New("intervention code already taken")
	ErrInvalidStatus         = errors.New("invalid status transition")
	ErrConsentRequired       = errors.New("employee consent required before starting")
	ErrAlreadyConsented      = errors.New("consent already recorded")
	ErrAssignmentTerminal    = errors.New("assignment is in a terminal state")
	ErrOutcomeExists         = errors.New("outcome already recorded for assignment")
	ErrMissingPreScore       = errors.New("pre-intervention BAT score is missing")
	ErrMissingPostScore      = errors.New("post-intervention BAT score is missing")
	ErrInvalidEvidenceTier   = errors.New("evidence_tier must be A, B, or C")
	ErrInvalidCategory       = errors.New("invalid intervention category")
	ErrInvalidDeliveryMode   = errors.New("invalid delivery mode")
	ErrInvalidBATScore       = errors.New("BAT score must be between 1.0 and 5.0")
	ErrUnauthorized          = errors.New("unauthorized")
	ErrForbidden             = errors.New("forbidden")
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
