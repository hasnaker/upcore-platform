package domain

import "errors"

// Sentinel domain errors. Services wrap these for HTTP mapping.
var (
	ErrNotFound         = errors.New("not found")
	ErrConflict         = errors.New("conflict")
	ErrValidation       = errors.New("validation failed")
	ErrUnauthorized     = errors.New("unauthorized")
	ErrForbidden        = errors.New("forbidden")
	ErrDepartmentNotFound = errors.New("department not found")
	ErrPositionNotFound   = errors.New("position not found")
	ErrTeamNotFound       = errors.New("team not found")
	ErrReportingNotFound  = errors.New("reporting line not found")
	ErrDuplicateCode      = errors.New("duplicate code")
	ErrCycleDetected      = errors.New("cycle detected: cannot move department into its own subtree")
	ErrManagerCycle       = errors.New("reporting cycle detected")
	ErrMaxDepthExceeded   = errors.New("maximum hierarchy depth exceeded")
	ErrInvalidPath        = errors.New("invalid ltree path")
	ErrInvalidJDRScore    = errors.New("JD-R score must be between 1 and 10")
	ErrDepartmentHasChildren = errors.New("department has active children")
	ErrPositionInUse         = errors.New("position has active employees")
	ErrAlreadyArchived       = errors.New("already archived")
	ErrSelfManager           = errors.New("employee cannot manage themselves")
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
