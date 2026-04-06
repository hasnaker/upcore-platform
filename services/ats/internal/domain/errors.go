package domain

import "errors"

// Sentinel domain errors. Services wrap these for HTTP mapping.
var (
	ErrNotFound               = errors.New("not found")
	ErrConflict               = errors.New("conflict")
	ErrValidation             = errors.New("validation failed")
	ErrRequisitionNotFound    = errors.New("requisition not found")
	ErrCandidateNotFound      = errors.New("candidate not found")
	ErrApplicationNotFound    = errors.New("application not found")
	ErrInterviewNotFound      = errors.New("interview not found")
	ErrOfferNotFound          = errors.New("offer not found")
	ErrStageNotFound          = errors.New("pipeline stage not found")
	ErrDuplicateEmail         = errors.New("candidate email already exists for this tenant")
	ErrDuplicateApplication   = errors.New("candidate already applied to this requisition")
	ErrInvalidTransition      = errors.New("invalid pipeline stage transition")
	ErrInvalidReqTransition   = errors.New("invalid requisition status transition")
	ErrTerminalStage          = errors.New("application is in a terminal stage")
	ErrRequisitionNotOpen     = errors.New("requisition is not open for applications")
	ErrRequisitionClosed      = errors.New("requisition is already closed")
	ErrOfferAlreadySent       = errors.New("offer has already been sent")
	ErrOfferExpired           = errors.New("offer has expired")
	ErrOfferNotSent           = errors.New("offer has not been sent yet")
	ErrGDPRConsentRequired    = errors.New("GDPR/KVKK consent is required")
	ErrCVTooLarge             = errors.New("CV file too large")
	ErrUnsupportedCVFormat    = errors.New("unsupported CV format")
	ErrInterviewAlreadyDone   = errors.New("interview is already completed")
	ErrInvalidDate            = errors.New("invalid date")
	ErrInvalidScore           = errors.New("invalid score value")
	ErrUnauthorized           = errors.New("unauthorized")
	ErrForbidden              = errors.New("forbidden")
	ErrCSVTooLarge            = errors.New("csv file too large")
	ErrCSVTooManyRows         = errors.New("csv exceeds maximum row count")
	ErrCSVInvalidSchema       = errors.New("csv schema is invalid")
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
