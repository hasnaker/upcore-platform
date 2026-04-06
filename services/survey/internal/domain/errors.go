// Package domain defines the survey service domain models, errors and rules.
package domain

import "errors"

// Sentinel domain errors. Services wrap these for HTTP mapping.
var (
	ErrNotFound                  = errors.New("not found")
	ErrConflict                  = errors.New("conflict")
	ErrValidation                = errors.New("validation failed")
	ErrSurveyNotFound            = errors.New("survey not found")
	ErrInvitationNotFound        = errors.New("invitation not found")
	ErrResponseNotFound          = errors.New("response not found")
	ErrInstrumentNotFound        = errors.New("instrument not found")
	ErrAlreadySubmitted          = errors.New("invitation already submitted")
	ErrInvitationExpired         = errors.New("invitation expired")
	ErrSurveyNotActive           = errors.New("survey is not active")
	ErrSurveyClosed              = errors.New("survey is closed")
	ErrInvalidStatus             = errors.New("invalid status transition")
	ErrInvalidSurveyType         = errors.New("invalid survey type")
	ErrInvalidCadence            = errors.New("invalid cadence")
	ErrInvalidDates              = errors.New("invalid survey date range")
	ErrInsufficientRespondents   = errors.New("insufficient respondents for anonymity threshold")
	ErrSkipWeek                  = errors.New("employee had a survey too recently (skip week)")
	ErrSurveyFatigue             = errors.New("employee has reached maximum surveys for period")
	ErrDuplicateInvitation       = errors.New("invitation already exists for employee")
	ErrForbidden                 = errors.New("forbidden")
	ErrUnauthorized              = errors.New("unauthorized")
	ErrInvalidToken              = errors.New("invalid invitation token")
	ErrInvalidResponsePayload    = errors.New("invalid response payload")
	ErrMissingRequiredAnswers    = errors.New("missing required answers")
	ErrEmployeeNotEligible       = errors.New("employee not eligible for survey")
	ErrBudgetExceeded            = errors.New("item count budget exceeded")
)

// ValidationError aggregates multiple field errors.
type ValidationError struct {
	Fields map[string]string
}

// Error satisfies error.
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
