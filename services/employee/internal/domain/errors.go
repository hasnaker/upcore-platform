package domain

import "errors"

// Sentinel domain errors. Services wrap these for HTTP mapping.
var (
	ErrNotFound            = errors.New("not found")
	ErrConflict            = errors.New("conflict")
	ErrValidation          = errors.New("validation failed")
	ErrEmployeeNotFound    = errors.New("employee not found")
	ErrContactNotFound     = errors.New("contact not found")
	ErrHistoryNotFound     = errors.New("history entry not found")
	ErrDuplicateEmployeeNo = errors.New("employee_no already exists")
	ErrDuplicateTCKN       = errors.New("tckn already exists for another employee")
	ErrDuplicateExternalID = errors.New("external_id already exists")
	ErrInvalidTCKN         = errors.New("invalid TCKN (Turkish national ID)")
	ErrInvalidIBAN         = errors.New("invalid IBAN")
	ErrInvalidEmail        = errors.New("invalid email")
	ErrInvalidDate         = errors.New("invalid date")
	ErrInvalidStatus       = errors.New("invalid employment status")
	ErrInvalidType         = errors.New("invalid employment type")
	ErrInvalidTransition   = errors.New("invalid status transition")
	ErrManagerNotFound     = errors.New("manager not found")
	ErrManagerCycle        = errors.New("manager assignment would create a cycle")
	ErrTerminationDate     = errors.New("termination date must be >= hire date")
	ErrAlreadyTerminated   = errors.New("employee is already terminated")
	ErrUnauthorized        = errors.New("unauthorized")
	ErrForbidden           = errors.New("forbidden")
	ErrCSVTooLarge         = errors.New("csv file too large")
	ErrCSVTooManyRows      = errors.New("csv exceeds maximum row count")
	ErrCSVInvalidSchema    = errors.New("csv schema is invalid")
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
