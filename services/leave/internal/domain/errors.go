package domain

import "errors"

// Sentinel errors. Services wrap these for HTTP mapping.
var (
	ErrNotFound               = errors.New("not found")
	ErrConflict               = errors.New("conflict")
	ErrValidation             = errors.New("validation failed")
	ErrForbidden              = errors.New("forbidden")
	ErrUnauthorized           = errors.New("unauthorized")
	ErrLeaveTypeNotFound      = errors.New("leave type not found")
	ErrLeaveRequestNotFound   = errors.New("leave request not found")
	ErrLeaveBalanceNotFound   = errors.New("leave balance not found")
	ErrInsufficientBalance    = errors.New("insufficient leave balance")
	ErrOverlappingRequest     = errors.New("overlapping leave request exists")
	ErrInvalidDateRange       = errors.New("end_date must be greater than or equal to start_date")
	ErrInvalidStatus          = errors.New("invalid status transition")
	ErrCannotCancel           = errors.New("request cannot be cancelled in current status")
	ErrCannotUpdate           = errors.New("request cannot be updated in current status")
	ErrRequestAlreadyHandled  = errors.New("request already approved or rejected")
	ErrDocumentRequired       = errors.New("supporting document is required for this leave type")
	ErrTenureTooLow           = errors.New("employee does not meet minimum tenure for this leave type")
	ErrSelfApproval           = errors.New("employees cannot approve their own requests")
	ErrWrongApprover          = errors.New("current user is not the required approver")
	ErrInvalidTenantScope     = errors.New("resource belongs to a different tenant")
	ErrAccrualNotConfigured   = errors.New("leave type has no accrual method configured")
	ErrCarryOverCapExceeded   = errors.New("carry-over amount exceeds configured cap")
)

// ValidationError aggregates multiple field errors.
type ValidationError struct {
	Fields map[string]string
}

// Error implements error.
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
