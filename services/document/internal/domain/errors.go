package domain

import "errors"

// Sentinel domain errors. Services wrap these for HTTP mapping.
var (
	ErrNotFound             = errors.New("not found")
	ErrConflict             = errors.New("conflict")
	ErrValidation           = errors.New("validation failed")
	ErrDocumentNotFound     = errors.New("document not found")
	ErrVersionNotFound      = errors.New("document version not found")
	ErrSignatureNotFound    = errors.New("signature not found")
	ErrUnsupportedMimeType  = errors.New("unsupported mime type")
	ErrFileTooLarge         = errors.New("file exceeds maximum upload size")
	ErrEmptyFile            = errors.New("file is empty")
	ErrChecksumMismatch     = errors.New("checksum mismatch")
	ErrInvalidDocumentType  = errors.New("invalid document type")
	ErrInvalidSignStatus    = errors.New("invalid signature status")
	ErrInvalidSignProvider  = errors.New("invalid signature provider")
	ErrSignatureExpired     = errors.New("signature session expired")
	ErrSignatureNotPending  = errors.New("signature is not pending")
	ErrUnauthorized         = errors.New("unauthorized")
	ErrForbidden            = errors.New("forbidden")
	ErrTenantMismatch       = errors.New("tenant mismatch")
	ErrRetentionNotExpired  = errors.New("retention period not elapsed")
	ErrStorageFailure       = errors.New("storage failure")
	ErrBlobNotFound         = errors.New("blob not found")
	ErrAlreadyDeleted       = errors.New("document already deleted")
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
