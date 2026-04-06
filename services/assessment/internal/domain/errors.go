package domain

import "errors"

// Sentinel domain errors. Services wrap these for HTTP mapping.
var (
	ErrNotFound             = errors.New("not found")
	ErrConflict             = errors.New("conflict")
	ErrValidation           = errors.New("validation failed")
	ErrAssessmentNotFound   = errors.New("assessment not found")
	ErrSessionNotFound      = errors.New("session not found")
	ErrResponseNotFound     = errors.New("response not found")
	ErrScoreNotFound        = errors.New("score not found")
	ErrInvalidToken         = errors.New("invalid candidate token")
	ErrTokenExpired         = errors.New("candidate token expired")
	ErrAssessmentExpired    = errors.New("assessment has expired")
	ErrAssessmentCompleted  = errors.New("assessment already completed")
	ErrAssessmentNotStarted = errors.New("assessment not started")
	ErrSessionActive        = errors.New("an active session already exists")
	ErrSessionCompleted     = errors.New("session already completed")
	ErrSessionTimedOut      = errors.New("session timed out")
	ErrInvalidStatus        = errors.New("invalid assessment status")
	ErrInvalidTransition    = errors.New("invalid status transition")
	ErrInvalidInstrument    = errors.New("unknown instrument code")
	ErrScoringFailed        = errors.New("scoring service returned an error")
	ErrReportFailed         = errors.New("report generation failed")
	ErrUnauthorized         = errors.New("unauthorized")
	ErrForbidden            = errors.New("forbidden")
	ErrCheatingDetected     = errors.New("suspicious activity detected")
)

// ValidationError aggregates multiple field errors.
type ValidationError struct {
	Fields map[string]string
}

// Error satisfies error.
func (e *ValidationError) Error() string {
	return "validation failed"
}

// NewValidationError constructs a validation error from a field/message map.
func NewValidationError(fields map[string]string) *ValidationError {
	return &ValidationError{Fields: fields}
}
